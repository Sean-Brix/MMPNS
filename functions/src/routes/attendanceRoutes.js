const express = require("express");
const {requireAuth} = require("../services/sessionService");
const {
  ATTENDANCE_MANAGER_ROLES,
} = require("../services/rolePolicy");
const {
  getAttendanceSummary,
  recordAttendanceScan,
} = require("../services/attendanceService");
const {badRequest} = require("../httpError");

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
    requireAuth(ATTENDANCE_MANAGER_ROLES),
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

module.exports = {attendanceRoutes: router};
