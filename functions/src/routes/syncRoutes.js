const express = require("express");
const {requireAuth} = require("../services/sessionService");
const {firestore} = require("../firebaseAdmin");
const {listUsers, getUserByUid} = require("../services/userService");
const {getSyncQueue, clearSyncQueue} = require("../services/syncQueueService");

// eslint-disable-next-line new-cap
const router = express.Router();

const SYNC_ROLES = ["admin", "superadmin"];

const STUDENT_KIOSK_FIELDS = [
  "uid", "systemId", "displayName", "firstName", "lastName",
  "lrn", "gradeLevel", "section", "photoUrl", "status",
];

const pickKioskFields = (user) => {
  const picked = {};
  for (const key of STUDENT_KIOSK_FIELDS) {
    picked[key] = user[key] ?? null;
  }
  return picked;
};

// GET /sync/pending — returns the list of student UIDs changed since last sync
router.get("/pending", requireAuth(SYNC_ROLES), async (req, res, next) => {
  try {
    res.json(await getSyncQueue());
  } catch (error) {
    next(error);
  }
});

// POST /sync/clear — clears the pending queue after a successful sync
router.post("/clear", requireAuth(SYNC_ROLES), async (req, res, next) => {
  try {
    await clearSyncQueue();
    res.json({success: true});
  } catch (error) {
    next(error);
  }
});

// POST /sync/students — returns kiosk-relevant data for the given UIDs
router.post("/students", requireAuth(SYNC_ROLES), async (req, res, next) => {
  try {
    const {uids} = req.body || {};
    if (!Array.isArray(uids) || uids.length === 0) {
      return res.json({students: []});
    }

    const results = await Promise.allSettled(uids.map((uid) => getUserByUid(uid)));
    const students = results
        .filter((r) => r.status === "fulfilled" && r.value?.role === "student")
        .map((r) => pickKioskFields(r.value));

    res.json({students});
  } catch (error) {
    next(error);
  }
});

// GET /sync/export — returns ALL active students for initial local server setup
router.get("/export", requireAuth(SYNC_ROLES), async (req, res, next) => {
  try {
    const users = await listUsers();
    const students = users
        .filter((u) => u.role === "student" && u.status === "active")
        .map(pickKioskFields);

    res.json({students, total: students.length});
  } catch (error) {
    next(error);
  }
});

module.exports = {syncRoutes: router};
