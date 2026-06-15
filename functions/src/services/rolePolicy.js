const VALID_ROLES = [
  "teacher",
  "student",
  "principal",
  "librarian",
  "registrar",
  "security",
  "admin",
  "superadmin",
];

const NON_SUPERADMIN_ROLES = VALID_ROLES.filter(
    (role) => role !== "superadmin",
);

const ADMINISTRATION_ROLES = [
  "principal",
  "librarian",
  "registrar",
  "security",
  "admin",
  "superadmin",
];

const ACCOUNT_MANAGER_ROLES = ["registrar", "admin", "superadmin"];
const ATTENDANCE_MANAGER_ROLES = ["security", "admin", "superadmin"];

const ROLE_PORTAL_ROUTES = {
  teacher: "/teacher-portal",
  student: "/student-portal",
  principal: "/admin-portal",
  librarian: "/admin-portal",
  registrar: "/admin-portal",
  security: "/admin-portal",
  admin: "/admin-portal",
  superadmin: "/admin-portal",
};

const COMMON_PROFILE_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "email",
  "contactNumber",
];

const ROLE_PROFILE_FIELDS = {
  teacher: [
    "department",
    "position",
    "employeeId",
    "advisoryClass",
    "subjects",
  ],
  student: [
    "extension",
    "lrn",
    "noOfSiblings",
    "monthlyFamilyIncome",
    "province",
    "city",
    "gradeLevel",
    "section",
    "gender",
    "guardianName",
    "guardianContact",
  ],
  principal: ["position", "department"],
  librarian: ["position", "department"],
  registrar: ["position", "department"],
  security: ["position", "department"],
  admin: ["position", "department"],
  superadmin: [],
};

const getAllowedProfileFields = (role) => [
  ...COMMON_PROFILE_FIELDS,
  ...(ROLE_PROFILE_FIELDS[role] || []),
];

const pickRoleProfileFields = (role, fields = {}) => {
  const allowedFields = new Set(getAllowedProfileFields(role));
  const profile = {};

  for (const [key, value] of Object.entries(fields)) {
    if (allowedFields.has(key)) {
      profile[key] = value;
    }
  }

  return profile;
};

module.exports = {
  VALID_ROLES,
  NON_SUPERADMIN_ROLES,
  ADMINISTRATION_ROLES,
  ACCOUNT_MANAGER_ROLES,
  ATTENDANCE_MANAGER_ROLES,
  ROLE_PORTAL_ROUTES,
  getAllowedProfileFields,
  pickRoleProfileFields,
};
