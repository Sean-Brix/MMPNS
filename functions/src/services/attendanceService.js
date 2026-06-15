const {firestore} = require("../firebaseAdmin");
const {
  getStudentBySystemId,
  stripSensitiveFields,
} = require("./userService");
const {badRequest, notFound} = require("../httpError");

const ATTENDANCE_COLLECTION = "attendance";
const USERS_COLLECTION = "users";

const getManilaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const recordAttendanceScan = async ({systemId, recordedBy}) => {
  const student = await getStudentBySystemId(systemId);
  if (!student) {
    throw notFound("Student not found.");
  }
  if (student.status !== "active") {
    throw badRequest("Student account is inactive.");
  }

  const now = new Date().toISOString();
  const date = getManilaDateKey();
  const attendanceRef = firestore
      .collection(ATTENDANCE_COLLECTION)
      .doc(`${date}_${student.uid}`);

  const attendance = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(attendanceRef);

    if (!snapshot.exists) {
      const created = {
        id: attendanceRef.id,
        date,
        studentUid: student.uid,
        systemId: student.systemId,
        displayName: student.displayName,
        gradeLevel: student.gradeLevel || "",
        section: student.section || "",
        status: "present",
        firstScanAt: now,
        lastScanAt: now,
        scanCount: 1,
        recordedBy,
      };
      transaction.set(attendanceRef, created);
      return created;
    }

    const current = snapshot.data();
    const updated = {
      ...current,
      lastScanAt: now,
      scanCount: Number(current.scanCount || 1) + 1,
      recordedBy,
    };
    transaction.update(attendanceRef, {
      lastScanAt: updated.lastScanAt,
      scanCount: updated.scanCount,
      recordedBy,
    });
    return updated;
  });

  return {
    student: stripSensitiveFields(student),
    attendance,
    isFirstScan: attendance.scanCount === 1,
  };
};

const getAttendanceSummary = async (date = getManilaDateKey()) => {
  const [attendanceSnapshot, studentsSnapshot] = await Promise.all([
    firestore.collection(ATTENDANCE_COLLECTION).where("date", "==", date).get(),
    firestore.collection(USERS_COLLECTION).where("role", "==", "student").get(),
  ]);

  const records = attendanceSnapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => String(b.lastScanAt).localeCompare(String(a.lastScanAt)));

  const activeStudents = studentsSnapshot.docs
      .map((doc) => doc.data())
      .filter((student) => student.status === "active");

  const byGrade = {};
  for (const record of records) {
    const grade = record.gradeLevel || "Unassigned";
    byGrade[grade] = (byGrade[grade] || 0) + 1;
  }

  return {
    date,
    totalStudents: activeStudents.length,
    present: records.length,
    absent: Math.max(activeStudents.length - records.length, 0),
    attendanceRate: activeStudents.length ?
      Math.round((records.length / activeStudents.length) * 1000) / 10 :
      0,
    byGrade,
    records,
  };
};

module.exports = {
  getManilaDateKey,
  recordAttendanceScan,
  getAttendanceSummary,
};
