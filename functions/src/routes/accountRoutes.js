const express = require("express");
const {requireAuth} = require("../services/sessionService");
const {
  createUser,
  listUsers,
  deleteUser,
  updateUserStatus,
  updateUserProfile,
  resetUserPassword,
  getStudentBySystemId,
  stripSensitiveFields,
} = require("../services/userService");
const {
  ACCOUNT_MANAGER_ROLES,
  ATTENDANCE_MANAGER_ROLES,
  NON_SUPERADMIN_ROLES,
} = require("../services/rolePolicy");
const {badRequest, forbidden} = require("../httpError");

// eslint-disable-next-line new-cap
const router = express.Router();

const ALL_ROLES = [...NON_SUPERADMIN_ROLES, "superadmin"];

// GET /api/accounts — list all users
router.get("/", requireAuth(ACCOUNT_MANAGER_ROLES), async (req, res, next) => {
  try {
    const users = await listUsers();
    res.json({users});
  } catch (error) {
    next(error);
  }
});

// POST /api/accounts — create a new account
router.post("/", requireAuth(ACCOUNT_MANAGER_ROLES), async (req, res, next) => {
  try {
    const callerRole = req.auth.role;
    const {role: targetRole} = req.body;

    if (!targetRole) {
      throw badRequest("Role is required.");
    }

    // Only superadmins can create other superadmins
    if (targetRole === "superadmin" && callerRole !== "superadmin") {
      throw forbidden("Only superadmins can create superadmin accounts.");
    }

    const allowedCreatable = callerRole === "superadmin" ? ALL_ROLES : NON_SUPERADMIN_ROLES;
    if (!allowedCreatable.includes(targetRole)) {
      throw badRequest(`Cannot create accounts with role: ${targetRole}`);
    }

    const user = await createUser({...req.body, createdBy: req.auth.uid});
    res.status(201).json({success: true, user});
  } catch (error) {
    next(error);
  }
});

// PATCH /api/accounts/:uid/status — activate or deactivate
router.patch("/:uid/status", requireAuth(ACCOUNT_MANAGER_ROLES), async (req, res, next) => {
  try {
    const {uid} = req.params;
    const {status} = req.body;

    if (!["active", "inactive"].includes(status)) {
      throw badRequest('Status must be "active" or "inactive".');
    }

    await updateUserStatus(uid, status);
    res.json({success: true});
  } catch (error) {
    next(error);
  }
});

// POST /api/accounts/:uid/reset-password — reset password
router.post("/:uid/reset-password", requireAuth(ACCOUNT_MANAGER_ROLES), async (req, res, next) => {
  try {
    const {uid} = req.params;
    const {password} = req.body;

    if (!password || String(password).length < 6) {
      throw badRequest("Password must be at least 6 characters.");
    }

    await resetUserPassword(uid, password);
    res.json({success: true});
  } catch (error) {
    next(error);
  }
});

// DELETE /api/accounts/:uid — delete account
router.delete("/:uid", requireAuth(ACCOUNT_MANAGER_ROLES), async (req, res, next) => {
  try {
    await deleteUser(req.params.uid);
    res.json({success: true});
  } catch (error) {
    next(error);
  }
});

// PATCH /api/accounts/:uid/profile — update editable profile fields
router.patch("/:uid/profile", requireAuth(ACCOUNT_MANAGER_ROLES), async (req, res, next) => {
  try {
    const user = await updateUserProfile(req.params.uid, req.body, {
      callerRole: req.auth.role,
      callerUid: req.auth.uid,
    });
    res.json({success: true, user});
  } catch (error) {
    next(error);
  }
});

// GET /api/accounts/scan/:systemId — kiosk lookup by student system ID
const SYSTEM_ID_PATTERN = /^\d{2}0\d{2}0\d{2}0\d{2}0\d{2}0\d{2}$/;

router.get("/scan/:systemId", requireAuth(ATTENDANCE_MANAGER_ROLES), async (req, res, next) => {
  try {
    const {systemId} = req.params;

    if (!SYSTEM_ID_PATTERN.test(systemId)) {
      return res.status(400).json({error: "Invalid QR code format. Expected 17-digit pattern."});
    }

    const student = await getStudentBySystemId(systemId);
    if (!student) {
      return res.status(404).json({error: "Student not found."});
    }

    res.json({student: stripSensitiveFields(student)});
  } catch (error) {
    next(error);
  }
});

module.exports = {accountRoutes: router};
