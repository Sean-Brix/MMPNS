const express = require("express");
const {requireAuth} = require("../services/sessionService");
const {
  createUser,
  listUsers,
  updateUserStatus,
  resetUserPassword,
  NON_SUPERADMIN_ROLES,
} = require("../services/userService");
const {badRequest, forbidden} = require("../httpError");

// eslint-disable-next-line new-cap
const router = express.Router();

const ACCOUNT_MANAGER_ROLES = ["superadmin", "admin", "registrar"];
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

module.exports = {accountRoutes: router};
