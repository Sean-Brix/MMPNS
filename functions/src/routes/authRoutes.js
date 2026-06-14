const express = require("express");
const {authenticateAccount} = require("../services/authService");

// eslint-disable-next-line new-cap
const router = express.Router();

// POST /api/auth/login — unified login endpoint for all roles
router.post("/login", async (req, res, next) => {
  try {
    res.json(await authenticateAccount(req.body));
  } catch (error) {
    next(error);
  }
});

module.exports = {authRoutes: router};
