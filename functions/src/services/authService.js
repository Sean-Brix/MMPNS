const jwt = require("jsonwebtoken");
const {
  getUserByUsername,
  checkPassword,
  updateLastLogin,
  stripSensitiveFields,
  ensureBootstrapSuperAdmin,
} = require("./userService");
const {ROLE_PORTAL_ROUTES} = require("./rolePolicy");

const JWT_SECRET = process.env.JWT_SECRET || "mmpns-jwt-secret-dev";
const JWT_EXPIRES = "7d";

const authenticateAccount = async (body) => {
  const {username, password} = body || {};

  if (!username || !password) {
    return {success: false, error: "Username and password are required."};
  }

  await ensureBootstrapSuperAdmin();

  const normalizedUsername = String(username).trim().toLowerCase();

  const user = await getUserByUsername(normalizedUsername);
  if (!user) {
    return {success: false, error: "Invalid username or password."};
  }

  const passwordValid = await checkPassword(password, user.passwordHash);
  if (!passwordValid) {
    return {success: false, error: "Invalid username or password."};
  }

  const token = jwt.sign(
      {uid: user.uid, role: user.role, username: user.username, displayName: user.displayName || ""},
      JWT_SECRET,
      {expiresIn: JWT_EXPIRES},
  );

  await updateLastLogin(user.uid);

  return {
    success: true,
    user: stripSensitiveFields(user),
    token,
    role: user.role,
    portalRoute: ROLE_PORTAL_ROUTES[user.role] || "/",
  };
};

module.exports = {authenticateAccount};
