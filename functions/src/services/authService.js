const {badRequest} = require("../httpError");
const {createSessionToken} = require("./sessionService");
const {getTable, setTable} = require("./tableService");

const EMPTY_CREDENTIALS = {
  teachers: [],
  students: [],
  admins: [],
};

const DEV_ADMIN_ACCOUNT = {
  id: 1,
  username: "sean-brix",
  password: "121802",
  firstName: "Sean",
  lastName: "Brix",
  displayName: "Sean Brix",
  initials: "SB",
  email: "sean-brix@mmpns.local",
  role: "superadmin",
  status: "active",
  lastLogin: null,
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

const normalizeLoginValue = (value) => String(value || "")
    .trim()
    .toLowerCase();

const nextAdminId = (admins) => {
  const ids = admins
      .map((admin) => Number(admin && admin.id))
      .filter((id) => Number.isFinite(id));
  return ids.length ? Math.max(...ids) + 1 : DEV_ADMIN_ACCOUNT.id;
};

const ensureDevAdminAccount = (credentials) => {
  const normalized = normalizeCredentials(credentials);
  const admins = [...normalized.admins];
  const existingIndex = admins.findIndex((admin) => {
    return normalizeLoginValue(admin.username) ===
      normalizeLoginValue(DEV_ADMIN_ACCOUNT.username);
  });

  if (existingIndex < 0) {
    admins.push({
      ...DEV_ADMIN_ACCOUNT,
      id: nextAdminId(admins),
    });
  }

  return {
    ...normalized,
    admins,
  };
};

const getCredentials = async () => {
  try {
    return ensureDevAdminAccount(await getTable("credentials"));
  } catch (error) {
    if (error && error.statusCode === 404) {
      return ensureDevAdminAccount(EMPTY_CREDENTIALS);
    }

    throw error;
  }
};

const stripPassword = (account) => {
  if (!account || typeof account !== "object") {
    return account;
  }

  const safeAccount = {...account};
  delete safeAccount.password;
  return safeAccount;
};

const isActive = (account) => {
  return normalizeLoginValue(account.status || "active") === "active";
};

const persistAccount = async (credentials, collection, updatedAccount) => {
  const accounts = credentials[collection] || [];
  let didUpdate = false;
  const updatedAccounts = accounts.map((account) => {
    if (account.id === updatedAccount.id) {
      didUpdate = true;
      return updatedAccount;
    }

    return account;
  });

  await setTable("credentials", {
    ...credentials,
    [collection]: didUpdate ?
      updatedAccounts :
      [...updatedAccounts, updatedAccount],
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
  let account = accounts.find((candidate) => {
    return normalizeLoginValue(candidate[config.loginField]) === loginValue &&
      String(candidate.password || "") === password &&
      isActive(candidate);
  });

  if (!account && accountType === "admin" &&
    loginValue === normalizeLoginValue(DEV_ADMIN_ACCOUNT.username) &&
    password === DEV_ADMIN_ACCOUNT.password) {
    const existingDevAdmin = accounts.find((candidate) => {
      return normalizeLoginValue(candidate.username) === loginValue;
    });

    account = {
      ...DEV_ADMIN_ACCOUNT,
      ...(existingDevAdmin || {}),
      id: existingDevAdmin && existingDevAdmin.id ?
        existingDevAdmin.id :
        nextAdminId(accounts),
      username: DEV_ADMIN_ACCOUNT.username,
      password: DEV_ADMIN_ACCOUNT.password,
      role: DEV_ADMIN_ACCOUNT.role,
      status: DEV_ADMIN_ACCOUNT.status,
    };
  }

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

module.exports = {
  authenticateAccount,
  stripPassword,
};
