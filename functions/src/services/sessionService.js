const crypto = require("crypto");
const {defineSecret} = require("firebase-functions/params");
const {forbidden, unauthorized} = require("../httpError");

const MMPNS_AUTH_SECRET = defineSecret("MMPNS_AUTH_SECRET");
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

const base64UrlEncode = (value) => Buffer
    .from(JSON.stringify(value))
    .toString("base64url");

const base64UrlDecode = (value) => {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
};

const getAuthSecret = () => {
  const secretFromEnv = process.env.MMPNS_AUTH_SECRET;

  if (secretFromEnv) {
    return secretFromEnv;
  }

  try {
    return MMPNS_AUTH_SECRET.value();
  } catch (error) {
    if (process.env.FUNCTIONS_EMULATOR || process.env.NODE_ENV === "test") {
      return "mmpns-local-development-secret";
    }

    throw error;
  }
};

const sign = (value) => crypto
    .createHmac("sha256", getAuthSecret())
    .update(value)
    .digest("base64url");

const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createSessionToken = (payload) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode({alg: "HS256", typ: "JWT"});
  const body = base64UrlEncode({
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  });
  const unsignedToken = `${header}.${body}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
};

const verifySessionToken = (token) => {
  if (!token || typeof token !== "string") {
    throw unauthorized("A valid session token is required.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw unauthorized("A valid session token is required.");
  }

  const [header, body, signature] = parts;
  const unsignedToken = `${header}.${body}`;
  const expectedSignature = sign(unsignedToken);

  if (!timingSafeEqual(signature, expectedSignature)) {
    throw unauthorized("A valid session token is required.");
  }

  const payload = base64UrlDecode(body);
  const now = Math.floor(Date.now() / 1000);

  if (!payload.exp || payload.exp < now) {
    throw unauthorized("Your session has expired. Please sign in again.");
  }

  return payload;
};

const getBearerToken = (req) => {
  const header = req.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
};

const normalizeRoleValue = (value) => String(value || "").toLowerCase();

const hasAllowedAccess = (payload, allowedRoles) => {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const allowed = new Set(allowedRoles.map(normalizeRoleValue));
  const candidates = [
    payload.accountType,
    payload.role,
    payload.position,
  ].map(normalizeRoleValue);

  return candidates.some((candidate) => allowed.has(candidate));
};

const requireAuth = (allowedRoles = []) => (req, _res, next) => {
  try {
    const payload = verifySessionToken(getBearerToken(req));

    if (!hasAllowedAccess(payload, allowedRoles)) {
      throw forbidden("This account cannot perform that action.");
    }

    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  MMPNS_AUTH_SECRET,
  createSessionToken,
  requireAuth,
  verifySessionToken,
};
