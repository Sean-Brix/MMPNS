// Unified authentication utilities for all 7 portal roles.
// Uses JWT stored in localStorage — no Firebase Authentication SDK required.

import type { UserRole } from './roles';

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

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginWithCredentials = async (
  username: string,
  password: string,
): Promise<LoginResult> => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!data.success || !data.token) {
      return { success: false, error: data.error || 'Login failed. Please try again.' };
    }

    localStorage.setItem(TOKEN_KEY, data.token);

    const session: StoredSession = {
      role: data.role,
      displayName: data.user?.displayName || '',
      username: data.user?.username || username,
      loginTime: new Date().toISOString(),
      initials: data.user?.initials || '',
      department: data.user?.department,
      gradeLevel: data.user?.gradeLevel,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(ROLE_KEY, data.role);

    return {
      success: true,
      user: data.user,
      role: data.role,
      portalRoute: data.portalRoute,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Login failed. Please try again.' };
  }
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

// ─── JWT Token (for API calls) ────────────────────────────────────────────────

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
