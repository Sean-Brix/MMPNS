const express = require('express');
const {
  findStudentBySystemId,
  readTodayAttendance,
  upsertAttendanceRecord,
  getManilaDateKey,
} = require('../services/csvService');

const router = express.Router();

const SYSTEM_ID_PATTERN = /^\d{2}0\d{2}0\d{2}0\d{2}0\d{2}0\d{2}$/;
const VALID_MODES = new Set(['time_in', 'time_out']);

// POST /local/attendance/scan
router.post('/scan', (req, res) => {
  const { systemId, scanMode } = req.body || {};

  if (!systemId) return res.status(400).json({ error: 'systemId is required.' });
  if (!SYSTEM_ID_PATTERN.test(systemId)) {
    return res.status(400).json({ error: 'Invalid QR code format.' });
  }

  const mode = String(scanMode || 'time_in').trim().toLowerCase();
  if (!VALID_MODES.has(mode)) {
    return res.status(400).json({ error: 'scanMode must be time_in or time_out.' });
  }

  const student = findStudentBySystemId(systemId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const now = new Date().toISOString();
  const today = getManilaDateKey();
  const recordId = `${today}_${student.uid}`;

  const existing = readTodayAttendance().find((r) => r.id === recordId) || null;

  const scanCount = parseInt(existing?.scanCount || '0', 10) + 1;
  const timeInCount = mode === 'time_in'
    ? parseInt(existing?.timeInScanCount || '0', 10) + 1
    : parseInt(existing?.timeInScanCount || '0', 10);
  const timeOutCount = mode === 'time_out'
    ? parseInt(existing?.timeOutScanCount || '0', 10) + 1
    : parseInt(existing?.timeOutScanCount || '0', 10);

  const record = {
    id: recordId,
    date: today,
    systemId: student.systemId,
    uid: student.uid,
    displayName: student.displayName,
    gradeLevel: student.gradeLevel,
    section: student.section,
    scanMode: mode,
    scanCount: String(scanCount),
    timeInScanCount: String(timeInCount),
    timeOutScanCount: String(timeOutCount),
    firstScanAt: existing?.firstScanAt || now,
    lastScanAt: now,
    timeOutAt: mode === 'time_out' ? now : (existing?.timeOutAt || ''),
    synced: '0',
  };

  upsertAttendanceRecord(record);

  res.json({
    student: {
      uid: student.uid,
      displayName: student.displayName,
      firstName: student.firstName,
      lastName: student.lastName,
      lrn: student.lrn,
      gradeLevel: student.gradeLevel,
      section: student.section,
      photoUrl: student.photoFile ? `/photos/${student.photoFile}` : null,
      systemId: student.systemId,
    },
    attendance: {
      id: record.id,
      date: record.date,
      studentUid: student.uid,
      systemId: student.systemId,
      displayName: student.displayName,
      gradeLevel: student.gradeLevel,
      section: student.section,
      status: 'present',
      firstScanAt: record.firstScanAt,
      lastScanAt: record.lastScanAt,
      timeOutAt: record.timeOutAt || null,
      scanCount,
      timeInScanCount: timeInCount,
      timeOutScanCount: timeOutCount,
      lastScanMode: mode,
    },
    isFirstScan: scanCount === 1,
    scanMode: mode,
  });
});

module.exports = router;
