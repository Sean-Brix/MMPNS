const {admin} = require("../firebaseAdmin");
const {forbidden, unauthorized} = require("../httpError");

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

    const decoded = await admin.auth().verifyIdToken(token);
    const role = String(decoded.role || "").toLowerCase();

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      throw forbidden("This account cannot perform that action.");
    }

    req.auth = {...decoded, role};
    next();
  } catch (error) {
    if (error && typeof error.code === "string" && error.code.startsWith("auth/")) {
      if (error.code === "auth/id-token-expired") {
        next(unauthorized("Your session has expired. Please sign in again."));
      } else {
        next(unauthorized("A valid session token is required."));
      }
    } else {
      next(error);
    }
  }
};

module.exports = {requireAuth};
