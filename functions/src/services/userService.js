const crypto = require("crypto");
const {defineSecret} = require("firebase-functions/params");
const {admin, firestore} = require("../firebaseAdmin");

const FIREBASE_WEB_API_KEY = defineSecret("FIREBASE_WEB_API_KEY");

const USERS_COLLECTION = "users";
const SYNTHETIC_EMAIL_DOMAIN = "@mmpns.internal";

const VALID_ROLES = [
  "teacher",
  "student",
  "superadmin",
  "librarian",
  "registrar",
  "principal",
  "admin",
];

// Roles that non-superadmin can create
const NON_SUPERADMIN_ROLES = [
  "teacher",
  "student",
  "principal",
  "librarian",
  "registrar",
  "admin",
];

// ─── ID / Code Generation ─────────────────────────────────────────────────────

const generateUUID = () => crypto.randomUUID();

const generateStudentCode = () => {
  // Unambiguous chars: no 0/O, 1/I
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
};

const getSyntheticEmail = (username) =>
  `${String(username).trim().toLowerCase()}${SYNTHETIC_EMAIL_DOMAIN}`;

// ─── Firebase Auth REST (password verification) ───────────────────────────────

const getWebApiKey = () => {
  const fromEnv = process.env.FIREBASE_WEB_API_KEY;
  if (fromEnv) return fromEnv;

  try {
    return FIREBASE_WEB_API_KEY.value();
  } catch {
    if (process.env.FUNCTIONS_EMULATOR) {
      return process.env.FIREBASE_WEB_API_KEY || "";
    }
    throw new Error("FIREBASE_WEB_API_KEY secret is not configured.");
  }
};

const verifyFirebasePassword = async (username, password) => {
  const apiKey = getWebApiKey();
  if (!apiKey) return false;

  const email = getSyntheticEmail(username);

  try {
    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({email, password, returnSecureToken: false}),
        },
    );
    return res.ok;
  } catch {
    return false;
  }
};

// ─── Display Name / Initials ──────────────────────────────────────────────────

const buildDisplayName = (role, fields) => {
  if (role === "superadmin") {
    return fields.email || fields.username || "Superadmin";
  }
  const parts = [
    fields.firstName,
    fields.middleName ? `${fields.middleName[0]}.` : null,
    fields.lastName,
  ].filter(Boolean);
  return parts.join(" ") || fields.username || role;
};

const buildInitials = (displayName) =>
  displayName
      .split(" ")
      .map((p) => (p[0] || "").toUpperCase())
      .join("")
      .slice(0, 2);

// ─── Sensitive Field Stripping ────────────────────────────────────────────────

// authUid is always removed before sending to client.
// uid (UUID) is kept in API responses for use in management operations
// but is never rendered in the UI as visible text.
const stripSensitiveFields = (user) => {
  if (!user || typeof user !== "object") return user;
  const safe = {...user};
  delete safe.authUid;
  delete safe.password;
  return safe;
};

// ─── Bootstrap Superadmin ─────────────────────────────────────────────────────

const BOOTSTRAP_SUPERADMIN = {
  username: "sean-brix",
  password: "121802",
  email: "sean-brix@mmpns.local",
  contactNumber: "",
};

const ensureBootstrapSuperAdmin = async () => {
  try {
    const snapshot = await firestore
        .collection(USERS_COLLECTION)
        .where("role", "==", "superadmin")
        .limit(1)
        .get();

    if (!snapshot.empty) return; // Superadmin already exists

    await createUser({
      role: "superadmin",
      username: BOOTSTRAP_SUPERADMIN.username,
      password: BOOTSTRAP_SUPERADMIN.password,
      email: BOOTSTRAP_SUPERADMIN.email,
      contactNumber: BOOTSTRAP_SUPERADMIN.contactNumber,
      createdBy: "system",
    });

    console.info("[MMPNS] Bootstrap superadmin created:", BOOTSTRAP_SUPERADMIN.username);
  } catch (err) {
    console.error("[MMPNS] Failed to bootstrap superadmin:", err);
  }
};

// ─── User CRUD ────────────────────────────────────────────────────────────────

const getUserByUsername = async (username) => {
  const normalized = String(username || "").trim().toLowerCase();
  if (!normalized) return null;

  const snapshot = await firestore
      .collection(USERS_COLLECTION)
      .where("username", "==", normalized)
      .limit(1)
      .get();

  if (snapshot.empty) return null;

  const data = snapshot.docs[0].data();
  if (data.status !== "active") return null;

  // uid is stored in the document itself
  return data;
};

const getUserByUid = async (uid) => {
  const doc = await firestore.collection(USERS_COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return doc.data();
};

const generateUniqueStudentCode = async () => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateStudentCode();
    const existing = await getUserByUsername(code);
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique student code. Please try again.");
};

const validateCreatePayload = (role, fields) => {
  const errors = [];

  if (!VALID_ROLES.includes(role)) {
    errors.push(`Invalid role: ${role}`);
  }

  if (role !== "student" && !fields.username) {
    errors.push("Username is required.");
  }

  if (!fields.password) {
    errors.push("Password is required.");
  }

  if (role === "teacher" && !fields.department) {
    errors.push("Department is required for teachers.");
  }

  return errors;
};

const createUser = async ({role, username, password, createdBy, ...profileFields}) => {
  const errors = validateCreatePayload(role, {username, password, ...profileFields});
  if (errors.length) {
    const {badRequest} = require("../httpError");
    throw badRequest(errors.join(" "));
  }

  // Determine username (students get auto-generated student code)
  let finalUsername;
  let studentCode;

  if (role === "student") {
    studentCode = await generateUniqueStudentCode();
    finalUsername = studentCode;
  } else {
    finalUsername = String(username).trim().toLowerCase();
  }

  // Check username uniqueness
  const existing = await firestore
      .collection(USERS_COLLECTION)
      .where("username", "==", finalUsername)
      .limit(1)
      .get();

  if (!existing.empty) {
    const {badRequest} = require("../httpError");
    throw badRequest(`Username "${finalUsername}" is already taken.`);
  }

  const uid = generateUUID();
  const syntheticEmail = getSyntheticEmail(finalUsername);
  const displayName = buildDisplayName(role, {...profileFields, username: finalUsername});
  const initials = buildInitials(displayName);

  // Create Firebase Auth user
  const authUser = await admin.auth().createUser({
    email: syntheticEmail,
    password,
    displayName,
  });

  await admin.auth().setCustomUserClaims(authUser.uid, {role, displayName});

  const now = new Date().toISOString();
  const userDoc = {
    uid,
    authUid: authUser.uid,
    role,
    username: finalUsername,
    status: "active",
    createdAt: now,
    createdBy: createdBy || "system",
    lastLogin: null,
    displayName,
    initials,
    ...profileFields,
  };

  if (role === "student") {
    userDoc.studentCode = studentCode;
    delete userDoc.username; // stored but not needed separately since username = studentCode
    userDoc.username = studentCode; // keep consistent
  }

  delete userDoc.password;

  await firestore.collection(USERS_COLLECTION).doc(uid).set(userDoc);

  return stripSensitiveFields(userDoc);
};

const listUsers = async () => {
  const snapshot = await firestore
      .collection(USERS_COLLECTION)
      .orderBy("createdAt", "asc")
      .get();

  return snapshot.docs.map((doc) => stripSensitiveFields(doc.data()));
};

const updateUserStatus = async (uid, status) => {
  const user = await getUserByUid(uid);
  if (!user) {
    const {notFound} = require("../httpError");
    throw notFound("User not found.");
  }

  await firestore.collection(USERS_COLLECTION).doc(uid).update({status});
  await admin.auth().updateUser(user.authUid, {disabled: status === "inactive"});
};

const resetUserPassword = async (uid, newPassword) => {
  const user = await getUserByUid(uid);
  if (!user) {
    const {notFound} = require("../httpError");
    throw notFound("User not found.");
  }

  await admin.auth().updateUser(user.authUid, {password: newPassword});
};

const updateLastLogin = async (uid) => {
  await firestore
      .collection(USERS_COLLECTION)
      .doc(uid)
      .update({lastLogin: new Date().toISOString()});
};

module.exports = {
  FIREBASE_WEB_API_KEY,
  VALID_ROLES,
  NON_SUPERADMIN_ROLES,
  verifyFirebasePassword,
  getUserByUsername,
  getUserByUid,
  createUser,
  listUsers,
  updateUserStatus,
  resetUserPassword,
  updateLastLogin,
  stripSensitiveFields,
  ensureBootstrapSuperAdmin,
};
