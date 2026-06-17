const express = require("express");
const {requireAuth} = require("../services/sessionService");
const {
  ATTENDANCE_MANAGER_ROLES,
  ATTENDANCE_VIEWER_ROLES,
} = require("../services/rolePolicy");
const {
  getAttendanceSummary,
  recordAttendanceScan,
} = require("../services/attendanceService");
const {firestore} = require("../firebaseAdmin");
const {badRequest} = require("../httpError");

const BULK_ALLOWED_ROLES = ["admin", "superadmin"];

// eslint-disable-next-line new-cap
const router = express.Router();

router.post(
    "/scan",
    requireAuth(ATTENDANCE_MANAGER_ROLES),
    async (req, res, next) => {
      try {
        const systemId = String((req.body && req.body.systemId) || "").trim();
        const scanMode = String((req.body && req.body.scanMode) || "time_in")
            .trim()
            .toLowerCase();
        if (!systemId) {
          throw badRequest("System ID is required.");
        }

        res.json(await recordAttendanceScan({
          systemId,
          scanMode,
          recordedBy: req.auth.uid,
        }));
      } catch (error) {
        next(error);
      }
    },
);

router.get(
    "/summary",
    requireAuth(ATTENDANCE_VIEWER_ROLES),
    async (req, res, next) => {
      try {
        const date = req.query.date ? String(req.query.date) : undefined;
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          throw badRequest("Date must use YYYY-MM-DD format.");
        }

        res.json(await getAttendanceSummary(date));
      } catch (error) {
        next(error);
      }
    },
);

// POST /attendance/bulk — accept bulk attendance logs from the local server
router.post(
    "/bulk",
    requireAuth(BULK_ALLOWED_ROLES),
    async (req, res, next) => {
      try {
        const {records} = req.body || {};
        if (!Array.isArray(records)) throw badRequest("records must be an array.");

        const ATTENDANCE_COLLECTION = "attendance";
        let imported = 0;
        let errors = 0;

        // Firestore batch limit is 500; chunk to stay safe
        const chunkSize = 400;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const batch = firestore.batch();
          for (const record of chunk) {
            if (!record.id || !record.date || !record.uid) {
              errors++;
              continue;
            }
            // Strip local-only fields before writing to Firestore
            const {synced, _file, ...firestoreRecord} = record;
            const ref = firestore.collection(ATTENDANCE_COLLECTION).doc(record.id);
            batch.set(ref, {
              ...firestoreRecord,
              uploadedBy: req.auth.uid,
              uploadedAt: new Date().toISOString(),
            }, {merge: true});
            imported++;
          }
          await batch.commit();
        }

        res.json({imported, errors});
      } catch (error) {
        next(error);
      }
    },
);

module.exports = {attendanceRoutes: router};
