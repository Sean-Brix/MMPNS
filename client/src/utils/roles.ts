export const USER_ROLES = [
  'teacher',
  'student',
  'principal',
  'librarian',
  'registrar',
  'security',
  'admin',
  'superadmin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ADMINISTRATION_ROLES: UserRole[] = [
  'principal',
  'librarian',
  'registrar',
  'security',
  'admin',
  'superadmin',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  teacher: 'Teacher',
  student: 'Student',
  principal: 'Principal',
  librarian: 'Librarian',
  registrar: 'Registrar',
  security: 'Security',
  admin: 'System Admin',
  superadmin: 'Superadmin',
};

export const ROLE_PORTAL_ROUTES: Record<UserRole, string> = {
  teacher: '/teacher-portal',
  student: '/student-portal',
  principal: '/principal-portal',
  librarian: '/librarian-portal',
  registrar: '/registrar-portal',
  security: '/admin-portal',
  admin: '/admin-portal',
  superadmin: '/admin-portal',
};

export const isAdministrationRole = (role: string | null | undefined): role is UserRole =>
  !!role && ADMINISTRATION_ROLES.includes(role as UserRole);
