import { ApiError, scanStudentBySystemId } from '../../../utils/apiClient';
import { getAllStudents } from '../../../utils/studentData';
import type { CirculationStudent } from './CirculationPage';

/**
 * Shared student-scan resolver used by the librarian Circulation flow and the
 * Student Lookup page. Resolves a scanned/typed code to a student either from
 * the local roster (by student ID / record ID / LRN) or, for a 17-digit QR
 * system ID, from the accounts API.
 */

export const STUDENT_SYSTEM_ID_PATTERN = /^\d{2}0\d{2}0\d{2}0\d{2}0\d{2}0\d{2}$/;

const initialsFor = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'ST';

export const toCirculationStudent = (student: any, fallbackCode: string): CirculationStudent => {
  const displayName =
    student.displayName ||
    [student.firstName, student.middleName ? `${student.middleName[0]}.` : null, student.lastName]
      .filter(Boolean)
      .join(' ') ||
    student.name ||
    'Student';

  return {
    uid: String(student.uid || student.id || student.studentId || fallbackCode),
    systemId: String(student.systemId || fallbackCode),
    studentId: student.studentId,
    displayName,
    initials: student.initials || initialsFor(displayName),
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    lrn: student.lrn,
    gradeLevel: student.gradeLevel,
    section: student.section,
    status: student.status,
    photoUrl: student.photoUrl,
    guardianName: student.guardianName,
    emergencyContactName: student.emergencyContactName,
    emergencyContactNumber: student.emergencyContactNumber,
  };
};

export const findLocalStudentByCode = (code: string): CirculationStudent | null => {
  const q = code.trim().toLowerCase();
  if (!q) return null;

  const match = getAllStudents().find((student) =>
    student.studentId.toLowerCase() === q ||
    student.id.toLowerCase() === q ||
    student.lrn.toLowerCase() === q,
  );

  return match ? toCirculationStudent(match, code) : null;
};

export const resolveStudentByCode = async (code: string): Promise<CirculationStudent | null> => {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const localFirst = findLocalStudentByCode(trimmed);

  // Only a 17-digit QR system ID is resolvable via the accounts API.
  if (!STUDENT_SYSTEM_ID_PATTERN.test(trimmed)) {
    return localFirst;
  }

  try {
    const result = await scanStudentBySystemId(trimmed);
    return toCirculationStudent(result.student, trimmed);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 403 || error.status === 404)) {
      return localFirst;
    }
    throw error;
  }
};

/** Lowercased identity keys for matching circulation records to a student. */
export const studentIdentitySet = (student: {
  uid?: string;
  systemId?: string;
  studentId?: string;
  lrn?: string;
}): Set<string> => {
  return new Set(
    [student.uid, student.systemId, student.studentId, student.lrn]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase()),
  );
};
