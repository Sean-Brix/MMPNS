// Demo authentication layer.
// The production app authenticates against the backend (/api/auth/login) and
// stores a JWT. This portfolio build keeps the exact same public surface but
// resolves every login locally against the fixed demo accounts — no network,
// no passwords. Opening a portal signs you in automatically.

import type { UserRole } from './roles';
import { ROLE_PORTAL_ROUTES } from './roles';
import { DEMO_ACCOUNTS, DEMO_ACCOUNT_BY_ROLE, type DemoAccount } from '../demo/demoData';

export type { UserRole } from './roles';

export interface UserProfile {
  uid?: string;
  role: UserRole;
  username: string;
  status: string;
  displayName: string;
  initials: string;
  createdAt?: string;
  lastLogin: string | null;

  // Teacher
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  department?: 'Kindergarten' | 'Elementary' | 'JHS';

  // Student
  extension?: string;
  studentCode?: string;
  lrn?: string;
  noOfSiblings?: number;
  monthlyFamilyIncome?: number;
  province?: string;
  city?: string;
  gradeLevel?: string;
  section?: string;
}

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  role?: UserRole;
  portalRoute?: string;
  error?: string;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const SESSION_KEY = 'mmpns_session';
const ROLE_KEY = 'mmpns_user_role';
const TOKEN_KEY = 'mmpns_token';

interface StoredSession {
  role: UserRole;
  displayName: string;
  username: string;
  loginTime: string;
  department?: string;
  gradeLevel?: string;
  initials?: string;
}

// ─── Demo helpers ─────────────────────────────────────────────────────────────

const toUserProfile = (account: DemoAccount): UserProfile => ({
  uid: account.uid,
  role: account.role as UserRole,
  username: account.username,
  status: account.status,
  displayName: account.displayName,
  initials: account.initials,
  createdAt: account.createdAt,
  lastLogin: account.lastLogin,
  firstName: account.firstName,
  middleName: account.middleName,
  lastName: account.lastName,
  email: account.email,
  contactNumber: account.contactNumber,
  department: account.department as UserProfile['department'],
  studentCode: account.studentCode,
  lrn: account.lrn,
  noOfSiblings: account.noOfSiblings,
  monthlyFamilyIncome: account.monthlyFamilyIncome,
  province: account.province,
  city: account.city,
  gradeLevel: account.gradeLevel,
  section: account.section,
});

const persistSession = (account: DemoAccount): StoredSession => {
  const session: StoredSession = {
    role: account.role as UserRole,
    displayName: account.displayName,
    username: account.username,
    loginTime: new Date().toISOString(),
    initials: account.initials,
    department: account.department,
    gradeLevel: account.gradeLevel,
  };

  localStorage.setItem(TOKEN_KEY, `demo-token-${account.uid}`);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(ROLE_KEY, account.role);

  return session;
};

/** Which role a login attempt from the current page should resolve to. */
const roleForCurrentPortal = (): UserRole => {
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (path.startsWith('/teacher-portal')) return 'teacher';
  if (path.startsWith('/student-portal')) return 'student';
  if (path.startsWith('/principal-portal')) return 'principal';
  if (path.startsWith('/librarian-portal')) return 'librarian';
  if (path.startsWith('/registrar-portal')) return 'registrar';
  return 'superadmin';
};

const findAccount = (username: string): DemoAccount | undefined => {
  const needle = username.trim().toLowerCase();
  if (!needle) return undefined;
  return DEMO_ACCOUNTS.find(
    (account) =>
      account.username.toLowerCase() === needle ||
      (account.studentCode || '').toLowerCase() === needle ||
      (account.email || '').toLowerCase() === needle,
  );
};

/**
 * Signs the demo visitor in as the given role without a login form.
 * Reuses an existing matching session so a visitor's in-portal edits survive
 * navigation; otherwise replaces the session with the demo account for the role.
 */
export const ensureDemoSession = (role: UserRole): StoredSession => {
  const existing = getStoredSession();
  if (existing && existing.role === role && localStorage.getItem(TOKEN_KEY)) {
    return existing;
  }

  const account = DEMO_ACCOUNT_BY_ROLE[role] || DEMO_ACCOUNT_BY_ROLE.superadmin;
  return persistSession(account);
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginWithCredentials = async (
  username: string,
  _password: string,
): Promise<LoginResult> => {
  // Small delay keeps the sign-in animation looking natural.
  await new Promise((resolve) => window.setTimeout(resolve, 350));

  // Any credentials work in the demo: a known username signs in as that
  // account, anything else signs in as the current portal's demo account.
  const account = findAccount(username) || DEMO_ACCOUNT_BY_ROLE[roleForCurrentPortal()];

  persistSession(account);

  return {
    success: true,
    user: toUserProfile(account),
    role: account.role as UserRole,
    portalRoute: ROLE_PORTAL_ROUTES[account.role as UserRole],
  };
};

// ─── Session Access ───────────────────────────────────────────────────────────

export const getStoredSession = (): StoredSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getCurrentRole = (): UserRole | null => {
  const role = localStorage.getItem(ROLE_KEY);
  return (role as UserRole) || null;
};

export const isAdminRole = (): boolean => {
  const role = getCurrentRole();
  return role === 'admin' || role === 'superadmin';
};

export const canManageAccounts = (): boolean => {
  const role = getCurrentRole();
  return role === 'registrar' || role === 'admin' || role === 'superadmin';
};

// ─── JWT Token (kept for API-shape compatibility) ─────────────────────────────

export const getFirebaseIdToken = async (): Promise<string> => {
  return localStorage.getItem(TOKEN_KEY) || '';
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = async (): Promise<void> => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ROLE_KEY);
};

// ─── Active Session Info ──────────────────────────────────────────────────────

export interface ActiveSessionInfo {
  displayName: string;
  role: UserRole;
  loginTime: string;
}

export const getActiveSessionInfo = (): ActiveSessionInfo | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  const session = getStoredSession();

  if (!token || !session) return null;

  return {
    displayName: session.displayName,
    role: session.role,
    loginTime: session.loginTime,
  };
};
