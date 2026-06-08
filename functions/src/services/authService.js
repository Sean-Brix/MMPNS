const {badRequest} = require("../httpError");
const {createSessionToken} = require("./sessionService");
const {getTable, setTable} = require("./tableService");

const EMPTY_CREDENTIALS = {
  teachers: [],
  students: [],
  admins: [],
};

const accountConfigs = {
  teacher: {
    collection: "teachers",
    loginField: "username",
    responseField: "teacher",
    invalidMessage: "Invalid username or password. Please try again.",
  },
  student: {
    collection: "students",
    loginField: "studentId",
    responseField: "student",
    invalidMessage: "Invalid Student ID or password. Please try again.",
  },
  admin: {
    collection: "admins",
    loginField: "username",
    responseField: "admin",
    invalidMessage: "Invalid username or password. Please try again.",
  },
};

const normalizeCredentials = (value) => ({
  ...EMPTY_CREDENTIALS,
  ...(value && typeof value === "object" ? value : {}),
  teachers: Array.isArray(value && value.teachers) ? value.teachers : [],
  students: Array.isArray(value && value.students) ? value.students : [],
  admins: Array.isArray(value && value.admins) ? value.admins : [],
});

const getCredentials = async () => normalizeCredentials(
    await getTable("credentials"),
);

const stripPassword = (account) => {
  if (!account || typeof account !== "object") {
    return account;
  }

  const safeAccount = {...account};
  delete safeAccount.password;
  return safeAccount;
};

const normalizeLoginValue = (value) => String(value || "")
    .trim()
    .toLowerCase();

const isActive = (account) => {
  return normalizeLoginValue(account.status || "active") === "active";
};

const persistAccount = async (credentials, collection, updatedAccount) => {
  const accounts = credentials[collection] || [];
  const updatedAccounts = accounts.map((account) => {
    if (account.id === updatedAccount.id) {
      return updatedAccount;
    }

    return account;
  });

  await setTable("credentials", {
    ...credentials,
    [collection]: updatedAccounts,
  });
};

const createTokenForAccount = (accountType, account) => {
  const username = account.username || account.studentId || String(account.id);

  return createSessionToken({
    sub: `${accountType}:${account.id}`,
    accountType,
    id: account.id,
    username,
    role: account.role || "",
    position: account.position || "",
  });
};

const authenticateAccount = async (accountType, body) => {
  const config = accountConfigs[accountType];
  if (!config) {
    throw badRequest("Unsupported account type.");
  }

  const loginValue = normalizeLoginValue(body && body[config.loginField]);
  const password = String((body && body.password) || "");

  if (!loginValue || !password) {
    return {success: false, error: config.invalidMessage};
  }

  const credentials = await getCredentials();
  const accounts = credentials[config.collection] || [];
  const account = accounts.find((candidate) => {
    return normalizeLoginValue(candidate[config.loginField]) === loginValue &&
      String(candidate.password || "") === password &&
      isActive(candidate);
  });

  if (!account) {
    return {success: false, error: config.invalidMessage};
  }

  const updatedAccount = {
    ...account,
    lastLogin: new Date().toISOString(),
  };

  await persistAccount(credentials, config.collection, updatedAccount);

  return {
    success: true,
    [config.responseField]: stripPassword(updatedAccount),
    token: createTokenForAccount(accountType, updatedAccount),
  };
};

const getPublicTeacherAccounts = async () => {
  const credentials = await getCredentials();
  return credentials.teachers
      .filter(isActive)
      .map((teacher) => ({
        username: teacher.username,
        displayName: teacher.displayName,
        department: teacher.department,
        position: teacher.position,
      }));
};

const getPublicStudentAccounts = async () => {
  const credentials = await getCredentials();
  return credentials.students
      .filter(isActive)
      .map((student) => ({
        studentId: student.studentId,
        displayName: student.displayName,
        gradeLevel: student.gradeLevel,
        section: student.section,
      }));
};

module.exports = {
  authenticateAccount,
  getPublicStudentAccounts,
  getPublicTeacherAccounts,
  stripPassword,
};
