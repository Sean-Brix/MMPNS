const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PHOTOS_DIR = path.join(__dirname, '..', 'photos');

const STUDENT_COLUMNS = [
  'uid', 'systemId', 'displayName', 'firstName', 'lastName',
  'lrn', 'gradeLevel', 'section', 'photoFile', 'photoUpdatedAt', 'status',
];

const ATTENDANCE_COLUMNS = [
  'id', 'date', 'systemId', 'uid', 'displayName', 'gradeLevel', 'section',
  'scanMode', 'scanCount', 'timeInScanCount', 'timeOutScanCount',
  'firstScanAt', 'lastScanAt', 'timeOutAt', 'synced',
];

const ensureDirs = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
};

const readCSV = (filename) => {
  ensureDirs();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.trim()) return [];
  return parse(content, { columns: true, skip_empty_lines: true });
};

const writeCSV = (filename, rows, columns) => {
  ensureDirs();
  const filePath = path.join(DATA_DIR, filename);
  const content = stringify(rows, { header: true, columns });
  fs.writeFileSync(filePath, content, 'utf-8');
};

const readStudents = () => readCSV('students.csv');

const writeStudents = (rows) => writeCSV('students.csv', rows, STUDENT_COLUMNS);

const upsertStudent = (student) => {
  const rows = readStudents();
  const idx = rows.findIndex((r) => r.uid === student.uid);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...student };
  } else {
    rows.push(student);
  }
  writeStudents(rows);
};

const deleteStudent = (uid) => {
  const rows = readStudents().filter((r) => r.uid !== uid);
  writeStudents(rows);
};

const findStudentBySystemId = (systemId) => {
  return readStudents().find((r) => r.systemId === systemId && r.status === 'active') || null;
};

const getManilaDateKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day}`;
};

const getAttendanceFilename = (date) => `attendance_${date}.csv`;

const readTodayAttendance = () => readCSV(getAttendanceFilename(getManilaDateKey()));

const writeTodayAttendance = (rows) =>
  writeCSV(getAttendanceFilename(getManilaDateKey()), rows, ATTENDANCE_COLUMNS);

const upsertAttendanceRecord = (record) => {
  const rows = readTodayAttendance();
  const idx = rows.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    rows[idx] = record;
  } else {
    rows.push(record);
  }
  writeTodayAttendance(rows);
};

// Returns all rows with synced='0' across all daily attendance files
const getUnsyncedLogs = () => {
  ensureDirs();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith('attendance_') && f.endsWith('.csv'));
  const unsynced = [];
  for (const file of files) {
    const rows = readCSV(file);
    for (const row of rows) {
      if (row.synced === '0') unsynced.push({ ...row, _file: file });
    }
  }
  return unsynced;
};

// Mark records as synced=1 in their respective files
const markLogsAsSynced = (records) => {
  const byFile = {};
  for (const record of records) {
    const file = record._file;
    if (!byFile[file]) byFile[file] = readCSV(file);
    const idx = byFile[file].findIndex((r) => r.id === record.id);
    if (idx >= 0) byFile[file][idx].synced = '1';
  }
  for (const [file, rows] of Object.entries(byFile)) {
    writeCSV(file, rows, ATTENDANCE_COLUMNS);
  }
};

const countUnsyncedLogs = () => {
  ensureDirs();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.startsWith('attendance_') && f.endsWith('.csv'));
  let count = 0;
  for (const file of files) {
    const rows = readCSV(file);
    count += rows.filter((r) => r.synced === '0').length;
  }
  return count;
};

module.exports = {
  DATA_DIR,
  PHOTOS_DIR,
  STUDENT_COLUMNS,
  ATTENDANCE_COLUMNS,
  readStudents,
  writeStudents,
  upsertStudent,
  deleteStudent,
  findStudentBySystemId,
  getManilaDateKey,
  readTodayAttendance,
  writeTodayAttendance,
  upsertAttendanceRecord,
  getUnsyncedLogs,
  markLogsAsSynced,
  countUnsyncedLogs,
};
