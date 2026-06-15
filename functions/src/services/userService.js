const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const {admin, firestore} = require("../firebaseAdmin");

const USERS_COLLECTION = "users";

const VALID_ROLES = [
  "teacher",
  "student",
  "superadmin",
  "librarian",
  "registrar",
  "principal",
  "admin",
];

const NON_SUPERADMIN_ROLES = [
  "teacher",
  "student",
  "principal",
  "librarian",
  "registrar",
  "admin",
];

// ─── Password Hashing ──────────────────────────────────────────────────────────

const hashPassword = (plain) => bcrypt.hash(String(plain), 10);
const checkPassword = (plain, hash) => {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(String(plain), hash);
};

// ─── ID / Code Generation ─────────────────────────────────────────────────────

const generateUUID = () => crypto.randomUUID();

const generateStudentCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
};

const generateSystemIdRaw = () => {
  let digits = "";
  for (let i = 0; i < 12; i++) {
    digits += (crypto.randomBytes(1)[0] % 10).toString();
  }
  return digits;
};

const formatSystemId = (rawId) => rawId.match(/.{2}/g).join("0");

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

const stripSensitiveFields = (user) => {
  if (!user || typeof user !== "object") return user;
  const safe = {...user};
  delete safe.passwordHash;
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

    if (!snapshot.empty) {
      // Migrate: existing superadmin may lack passwordHash if created before bcrypt auth
      const existingUser = snapshot.docs[0].data();
      if (!existingUser.passwordHash) {
        const passwordHash = await hashPassword(BOOTSTRAP_SUPERADMIN.password);
        await firestore.collection(USERS_COLLECTION).doc(existingUser.uid).update({passwordHash});
        console.info("[MMPNS] Bootstrap superadmin password hash migrated.");
      }
      return;
    }

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

// Returns the raw user doc including passwordHash — for internal use only.
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

  let finalUsername;
  let studentCode;
  let systemIdRaw;

  if (role === "student") {
    studentCode = await generateUniqueStudentCode();
    finalUsername = studentCode;
    systemIdRaw = generateSystemIdRaw();
  } else {
    finalUsername = String(username).trim().toLowerCase();
  }

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
  const displayName = buildDisplayName(role, {...profileFields, username: finalUsername});
  const initials = buildInitials(displayName);
  const passwordHash = await hashPassword(password);

  const now = new Date().toISOString();
  const userDoc = {
    uid,
    role,
    username: finalUsername,
    status: "active",
    createdAt: now,
    createdBy: createdBy || "system",
    lastLogin: null,
    displayName,
    initials,
    passwordHash,
    ...profileFields,
  };

  if (role === "student") {
    userDoc.studentCode = studentCode;
    userDoc.systemIdRaw = systemIdRaw;
    userDoc.systemId = formatSystemId(systemIdRaw);
    userDoc.username = studentCode;
  }

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
};

const resetUserPassword = async (uid, newPassword) => {
  const user = await getUserByUid(uid);
  if (!user) {
    const {notFound} = require("../httpError");
    throw notFound("User not found.");
  }

  const passwordHash = await hashPassword(newPassword);
  await firestore.collection(USERS_COLLECTION).doc(uid).update({passwordHash});
};

const deleteUser = async (uid) => {
  const user = await getUserByUid(uid);
  if (!user) {
    const {notFound} = require("../httpError");
    throw notFound("User not found.");
  }
  await firestore.collection(USERS_COLLECTION).doc(uid).delete();
};

const updateUserProfile = async (uid, fields) => {
  const current = await getUserByUid(uid);
  if (!current) {
    const {notFound} = require("../httpError");
    throw notFound("User not found.");
  }

  const SAFE_FIELDS = [
    "firstName", "middleName", "lastName", "extension",
    "lrn", "noOfSiblings", "monthlyFamilyIncome", "province", "city",
    "email", "contactNumber", "department",
  ];

  const update = {};
  for (const key of SAFE_FIELDS) {
    if (key in fields) update[key] = fields[key];
  }

  // Always rebuild displayName when any profile field changes
  const merged = {...current, ...update};
  update.displayName = buildDisplayName(current.role, merged);
  update.initials = buildInitials(update.displayName);

  if (fields.password) {
    update.passwordHash = await hashPassword(fields.password);
  }

  await firestore.collection(USERS_COLLECTION).doc(uid).update(update);
  return stripSensitiveFields({...current, ...update});
};

const getStudentBySystemId = async (systemId) => {
  // Single equality filter — no composite index needed
  const snapshot = await firestore
      .collection(USERS_COLLECTION)
      .where("systemId", "==", systemId)
      .limit(1)
      .get();
  if (snapshot.empty) return null;
  const data = snapshot.docs[0].data();
  return data.role === "student" ? data : null;
};

const updateStudentPhoto = async (uid, photoUrl) => {
  await firestore.collection(USERS_COLLECTION).doc(uid).update({photoUrl});
};

const updateLastLogin = async (uid) => {
  await firestore
      .collection(USERS_COLLECTION)
      .doc(uid)
      .update({lastLogin: new Date().toISOString()});
};

module.exports = {
  VALID_ROLES,
  NON_SUPERADMIN_ROLES,
  checkPassword,
  getUserByUsername,
  getUserByUid,
  getStudentBySystemId,
  createUser,
  listUsers,
  deleteUser,
  updateUserStatus,
  updateUserProfile,
  updateStudentPhoto,
  resetUserPassword,
  updateLastLogin,
  stripSensitiveFields,
  ensureBootstrapSuperAdmin,
};
