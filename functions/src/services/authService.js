const {admin} = require("../firebaseAdmin");
const {
  getUserByUsername,
  verifyFirebasePassword,
  updateLastLogin,
  stripSensitiveFields,
  ensureBootstrapSuperAdmin,
} = require("./userService");

// Role → portal route mapping (sent to client for redirect)
const ROLE_PORTAL_ROUTES = {
  teacher: "/teacher-portal",
  student: "/student-portal",
  principal: "/principal-portal",
  librarian: "/librarian-portal",
  registrar: "/registrar-portal",
  admin: "/admin-portal",
  superadmin: "/superadmin",
};

const authenticateAccount = async (body) => {
  const {username, password} = body || {};

  if (!username || !password) {
    return {success: false, error: "Username and password are required."};
  }

  // Ensure the bootstrap superadmin exists (first-run only)
  await ensureBootstrapSuperAdmin();

  const normalizedUsername = String(username).trim().toLowerCase();

  const user = await getUserByUsername(normalizedUsername);
  if (!user) {
    return {success: false, error: "Invalid username or password."};
  }

  const passwordValid = await verifyFirebasePassword(normalizedUsername, password);
  if (!passwordValid) {
    return {success: false, error: "Invalid username or password."};
  }

  // Issue Firebase custom token (client will exchange this for an ID token)
  const customToken = await admin.auth().createCustomToken(user.authUid, {
    role: user.role,
    displayName: user.displayName || "",
  });

  await updateLastLogin(user.uid);

  return {
    success: true,
    user: stripSensitiveFields(user),
    customToken,
    role: user.role,
    portalRoute: ROLE_PORTAL_ROUTES[user.role] || "/",
  };
};

module.exports = {authenticateAccount};
