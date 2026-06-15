const jwt = require("jsonwebtoken");
const {forbidden, unauthorized} = require("../httpError");

const JWT_SECRET = process.env.JWT_SECRET || "mmpns-jwt-secret-dev";

const getBearerToken = (req) => {
  const header = req.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
};

const requireAuth = (allowedRoles = []) => async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      throw unauthorized("A valid session token is required.");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const role = String(decoded.role || "").toLowerCase();

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      throw forbidden("This account cannot perform that action.");
    }

    req.auth = {...decoded, role};
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      next(unauthorized("Your session has expired. Please sign in again."));
    } else if (error.name === "JsonWebTokenError") {
      next(unauthorized("A valid session token is required."));
    } else {
      next(error);
    }
  }
};

module.exports = {requireAuth};
