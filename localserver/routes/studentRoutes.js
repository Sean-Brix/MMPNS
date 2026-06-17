const express = require('express');
const { findStudentBySystemId } = require('../services/csvService');

const router = express.Router();

const SYSTEM_ID_PATTERN = /^\d{2}0\d{2}0\d{2}0\d{2}0\d{2}0\d{2}$/;

// GET /local/students/scan/:systemId
router.get('/scan/:systemId', (req, res) => {
  const { systemId } = req.params;

  if (!SYSTEM_ID_PATTERN.test(systemId)) {
    return res.status(400).json({ error: 'Invalid QR code format. Expected 17-digit pattern.' });
  }

  const student = findStudentBySystemId(systemId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found.' });
  }

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
  });
});

module.exports = router;
