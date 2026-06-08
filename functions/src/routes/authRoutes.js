const express = require("express");
const {
  authenticateAccount,
} = require("../services/authService");

// eslint-disable-next-line new-cap
const router = express.Router();

router.post("/teacher", async (req, res, next) => {
  try {
    res.json(await authenticateAccount("teacher", req.body));
  } catch (error) {
    next(error);
  }
});

router.post("/student", async (req, res, next) => {
  try {
    res.json(await authenticateAccount("student", req.body));
  } catch (error) {
    next(error);
  }
});

router.post("/admin", async (req, res, next) => {
  try {
    res.json(await authenticateAccount("admin", req.body));
  } catch (error) {
    next(error);
  }
});

module.exports = {
  authRoutes: router,
};
