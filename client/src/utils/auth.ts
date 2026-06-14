// Unified authentication utilities for all 7 portal roles.
// Uses Firebase Auth (custom token) + Firebase ID tokens for API calls.

import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'teacher'
  | 'student'
  | 'superadmin'
  | 'librarian'
  | 'registrar'
  | 'principal'
  | 'admin';

export interface UserProfile {
  uid?: string;            // UUID (present in some responses, never rendered in UI)
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
  studentCode?: string;   // login code (never shown publicly)
  lrn?: string;
  noOfSiblings?: number;
  monthlyFamilyIncome?: number;
  province?: string;

  // Staff (shared)
  // firstName / middleName / lastName / email / contactNumber (already above)
}

export interface LoginResult {
  success: boolean;
  user?: UserProfile;
  role?: UserRole;
  portalRoute?: string;
  error?: string;
}

// ─── Session Storage Keys ─────────────────────────────────────────────────────

const SESSION_KEY = 'mmpns_session';
const ROLE_KEY = 'mmpns_user_role';

interface StoredSession {
  role: UserRole;
  displayName: string;
  username: string;
  loginTime: string;
  // Additional profile fields for quick access
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

    if (!data.success || !data.customToken) {
      return { success: false, error: data.error || 'Login failed. Please try again.' };
    }

    // Establish Firebase Auth session
    await signInWithCustomToken(auth, data.customToken);

    // Store session metadata for quick access
    const session: StoredSession = {
      role: data.role,
      displayName: data.user?.displayName || '',
      username: data.user?.username || username,
      loginTime: new Date().toISOString(),
      initials: data.user?.initials || '',
      department: data.user?.department,
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

// Returns true if the caller role can access admin-level features
export const isAdminRole = (): boolean => {
  const role = getCurrentRole();
  return role === 'admin' || role === 'superadmin';
};

// Returns true if the caller can manage accounts (registrar, admin, superadmin)
export const canManageAccounts = (): boolean => {
  const role = getCurrentRole();
  return role === 'registrar' || role === 'admin' || role === 'superadmin';
};

// ─── Firebase ID Token (for API calls) ───────────────────────────────────────

export const getFirebaseIdToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return '';
  try {
    return await user.getIdToken();
  } catch {
    return '';
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = async (): Promise<void> => {
  await signOut(auth);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ROLE_KEY);
};

// ─── Cross-Portal Conflict Detection ─────────────────────────────────────────

export interface ActiveSessionInfo {
  displayName: string;
  role: UserRole;
  loginTime: string;
}

export const getActiveSessionInfo = (): ActiveSessionInfo | null => {
  const user = auth.currentUser;
  const session = getStoredSession();

  if (!user || !session) return null;

  return {
    displayName: session.displayName,
    role: session.role,
    loginTime: session.loginTime,
  };
};
