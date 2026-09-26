// Demo API client.
// Mirrors the exported surface of the production apiClient (which talks to the
// Cloud Functions REST API) but serves everything from the fixed demo dataset
// and localStorage. No network requests leave the page.

import { isAdminRole, canManageAccounts, getStoredSession } from './auth';
import {
  DEMO_ACCOUNTS,
  DEMO_SEED_SNAPSHOTS,
  buildDemoAttendanceSummary,
  formatSystemId,
  manilaDateKey,
  type DemoAccount,
} from '../demo/demoData';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const delay = (ms = 180) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

/* ─── Accounts store (seed + local overlay so demo edits stick) ──────────── */

const ACCOUNTS_OVERLAY_KEY = 'mmpns_demo_accounts_overlay';

interface AccountsOverlay {
  created: DemoAccount[];
  updated: Record<string, Partial<DemoAccount>>;
  deleted: string[];
}

const EMPTY_OVERLAY: AccountsOverlay = { created: [], updated: {}, deleted: [] };

const readOverlay = (): AccountsOverlay => {
  const overlay = readJson<AccountsOverlay>(ACCOUNTS_OVERLAY_KEY, EMPTY_OVERLAY);
  return {
    created: Array.isArray(overlay.created) ? overlay.created : [],
    updated: overlay.updated && typeof overlay.updated === 'object' ? overlay.updated : {},
    deleted: Array.isArray(overlay.deleted) ? overlay.deleted : [],
  };
};

const writeOverlay = (overlay: AccountsOverlay) => writeJson(ACCOUNTS_OVERLAY_KEY, overlay);

const getAllAccounts = (): DemoAccount[] => {
  const overlay = readOverlay();
  const deleted = new Set(overlay.deleted);
  const merged = [...DEMO_ACCOUNTS, ...overlay.created]
    .filter((account) => !deleted.has(account.uid))
    .map((account) => ({ ...account, ...(overlay.updated[account.uid] || {}) }));
  return merged;
};

const mutateAccount = (uid: string, changes: Partial<DemoAccount>): DemoAccount | null => {
  const overlay = readOverlay();
  const createdIndex = overlay.created.findIndex((account) => account.uid === uid);
  if (createdIndex >= 0) {
    overlay.created[createdIndex] = { ...overlay.created[createdIndex], ...changes };
  } else {
    overlay.updated[uid] = { ...(overlay.updated[uid] || {}), ...changes };
  }
  writeOverlay(overlay);
  return getAllAccounts().find((account) => account.uid === uid) || null;
};

/* ─── Account Management ─────────────────────────────────────────────────── */

export interface AccountListParams {
  page?: number;
  pageSize?: number;
  role?: string;
  status?: string;
  search?: string;
  gradeLevel?: string;
  section?: string;
}

export interface AccountListResponse {
  users: any[];
  total?: number;
  page?: number;
  pageSize?: number;
}

const matchesSearch = (account: DemoAccount, search: string) => {
  const haystack = [
    account.displayName,
    account.username,
    account.email,
    account.studentCode,
    account.systemId,
    account.lrn,
    account.employeeId,
    account.firstName,
    account.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
};

export const getAccounts = async (params: AccountListParams = {}): Promise<AccountListResponse> => {
  await delay();

  let users = getAllAccounts();

  if (params.role && params.role !== 'all') {
    users = users.filter((account) => account.role === params.role);
  }
  if (params.status && params.status !== 'all') {
    users = users.filter((account) => account.status === params.status);
  }
  if (params.gradeLevel && params.gradeLevel !== 'all') {
    users = users.filter((account) => account.gradeLevel === params.gradeLevel);
  }
  if (params.section && params.section !== 'all') {
    users = users.filter((account) => account.section === params.section);
  }
  if (params.search && params.search.trim()) {
    users = users.filter((account) => matchesSearch(account, params.search!.trim()));
  }

  const total = users.length;

  if (params.page && params.pageSize) {
    const start = (params.page - 1) * params.pageSize;
    users = users.slice(start, start + params.pageSize);
  }

  return { users, total, page: params.page, pageSize: params.pageSize };
};

export const getMyAccount = async (): Promise<{ user: any }> => {
  await delay();
  const session = getStoredSession();
  const user = session
    ? getAllAccounts().find((account) => account.username === session.username)
    : null;

  if (!user) {
    throw new ApiError(401, 'Not signed in.');
  }

  return { user };
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const randomStudentCode = () => {
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => CODE_ALPHABET[v % CODE_ALPHABET.length]).join('');
};

const randomSystemIdRaw = () => {
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => String(v % 10)).join('');
};

const buildDisplayName = (data: Record<string, any>) =>
  [data.firstName, data.middleName ? `${String(data.middleName)[0]}.` : null, data.lastName]
    .filter(Boolean)
    .join(' ') || data.username || data.role;

const buildInitials = (displayName: string) =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const createAccountInternal = (data: Record<string, any>): DemoAccount => {
  const isStudent = data.role === 'student';
  const studentCode = isStudent ? randomStudentCode() : undefined;
  const systemIdRaw = isStudent ? randomSystemIdRaw() : undefined;
  const username = isStudent ? studentCode! : data.username;
  const displayName = buildDisplayName({ ...data, username });

  const account: DemoAccount = {
    ...data,
    uid: `demo-created-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    role: data.role,
    username,
    status: 'active',
    displayName,
    initials: buildInitials(displayName),
    createdAt: new Date().toISOString(),
    lastLogin: null,
    studentCode,
    systemIdRaw,
    systemId: systemIdRaw ? formatSystemId(systemIdRaw) : undefined,
  };

  const overlay = readOverlay();
  overlay.created.push(account);
  writeOverlay(overlay);
  return account;
};

export const createAccount = async (data: Record<string, any>) => {
  await delay(320);
  const user = createAccountInternal(data);
  return { success: true, user };
};

export interface BatchStudentResult {
  index: number;
  status: 'success' | 'failed';
  uid?: string;
  studentCode?: string;
  error?: string;
}

export const createStudentsBatch = async (students: Record<string, any>[]) => {
  await delay(450);
  const created: any[] = [];
  const results: BatchStudentResult[] = [];

  students.forEach((student, index) => {
    const account = createAccountInternal({ ...student, role: 'student' });
    created.push(account);
    results.push({ index, status: 'success', uid: account.uid, studentCode: account.studentCode });
  });

  return { success: true, created, results };
};

export const updateAccountStatus = async (uid: string, status: 'active' | 'inactive') => {
  await delay();
  mutateAccount(uid, { status });
  return { success: true };
};

export const resetAccountPassword = async (_uid: string, _password: string) => {
  await delay(260);
  return { success: true };
};

export const deleteAccount = async (uid: string) => {
  await delay();
  const overlay = readOverlay();
  overlay.created = overlay.created.filter((account) => account.uid !== uid);
  if (!overlay.deleted.includes(uid)) {
    overlay.deleted.push(uid);
  }
  writeOverlay(overlay);
  return { success: true };
};

export const updateAccountProfile = async (uid: string, data: Record<string, any>) => {
  await delay();
  const user = mutateAccount(uid, data);
  if (!user) {
    throw new ApiError(404, 'Account not found.');
  }
  return { success: true, user };
};

/* ─── Table API (backs the demo "cloud" database) ────────────────────────── */

const tableKey = (table: string) => `mmpns_db_${table}`;

export const getApiTable = async <T = any>(table: string): Promise<T | null> => {
  return readJson<T | null>(tableKey(table), null);
};

export const setApiTable = async <T = any>(table: string, payload: T): Promise<T> => {
  writeJson(tableKey(table), payload);
  return payload;
};

export const deleteApiTable = async (table: string): Promise<void> => {
  localStorage.removeItem(tableKey(table));
};

export const getApiSeedSnapshot = async <T = any>(key: string): Promise<T | null> => {
  await delay();
  return (DEMO_SEED_SNAPSHOTS[key] as T) ?? null;
};

/* ─── Storage ────────────────────────────────────────────────────────────── */

export const getStorageObjectUrl = async (_objectPath: string): Promise<string | null> => {
  // No cloud bucket in the demo; callers fall back to their bundled images.
  return null;
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const uploadPrincipalImage = async (options: {
  file: File;
  pageFolder: string;
  slot: string;
}): Promise<string> => {
  await delay(400);
  // Data URLs persist in localStorage image slots, so edits survive reloads.
  return fileToDataUrl(options.file);
};

/* ─── Kiosk / Student Scan ───────────────────────────────────────────────── */

export const scanStudentBySystemId = async (systemId: string) => {
  await delay(350);
  const student = getAllAccounts().find(
    (account) => account.role === 'student' && account.systemId === systemId.trim(),
  );

  if (!student) {
    throw new ApiError(404, 'No student matches this ID.');
  }

  return { student };
};

export const uploadStudentPhoto = async (uid: string, file: File): Promise<string> => {
  await delay(400);
  const dataUrl = await fileToDataUrl(file);
  mutateAccount(uid, { photoUrl: dataUrl });
  return dataUrl;
};

export type AttendanceScanMode = 'time_in' | 'time_out';

export interface AttendanceRecord {
  id: string;
  date: string;
  studentUid: string;
  systemId: string;
  displayName: string;
  gradeLevel?: string;
  section?: string;
  status: 'present';
  firstScanAt: string;
  lastScanAt: string;
  timeOutAt?: string | null;
  scanCount: number;
  timeInScanCount?: number;
  timeOutScanCount?: number;
  lastScanMode?: AttendanceScanMode;
}

export interface AttendanceSummary {
  date: string;
  totalStudents: number;
  present: number;
  absent: number;
  attendanceRate: number;
  byGrade: Record<string, number>;
  records: AttendanceRecord[];
}

/* Live kiosk scans are layered over the generated attendance sheet. */

const scansKey = (dateKey: string) => `mmpns_demo_attendance_${dateKey}`;

const readScanOverlay = (dateKey: string): Record<string, AttendanceRecord> =>
  readJson<Record<string, AttendanceRecord>>(scansKey(dateKey), {});

export const recordAttendanceScan = async (
  systemId: string,
  scanMode: AttendanceScanMode = 'time_in',
) => {
  const { student } = await scanStudentBySystemId(systemId);

  const dateKey = manilaDateKey();
  const overlay = readScanOverlay(dateKey);
  const base = buildDemoAttendanceSummary(dateKey);
  const existing =
    overlay[student.uid] || base.records.find((record) => record.studentUid === student.uid);

  const nowIso = new Date().toISOString();
  const isFirstScan = !existing;

  const attendance: AttendanceRecord = existing
    ? {
        ...existing,
        lastScanAt: nowIso,
        timeOutAt: scanMode === 'time_out' ? nowIso : existing.timeOutAt ?? null,
        scanCount: (existing.scanCount || 1) + 1,
        timeInScanCount: (existing.timeInScanCount || 1) + (scanMode === 'time_in' ? 1 : 0),
        timeOutScanCount: (existing.timeOutScanCount || 0) + (scanMode === 'time_out' ? 1 : 0),
        lastScanMode: scanMode,
      }
    : {
        id: `att_${dateKey}_${student.uid}`,
        date: dateKey,
        studentUid: student.uid,
        systemId: student.systemId || '',
        displayName: student.displayName,
        gradeLevel: student.gradeLevel,
        section: student.section,
        status: 'present',
        firstScanAt: nowIso,
        lastScanAt: nowIso,
        timeOutAt: scanMode === 'time_out' ? nowIso : null,
        scanCount: 1,
        timeInScanCount: scanMode === 'time_in' ? 1 : 0,
        timeOutScanCount: scanMode === 'time_out' ? 1 : 0,
        lastScanMode: scanMode,
      };

  overlay[student.uid] = attendance;
  writeJson(scansKey(dateKey), overlay);

  return { student, attendance, isFirstScan, scanMode };
};

export const getAttendanceSummary = async (date?: string): Promise<AttendanceSummary> => {
  await delay();

  const dateKey = date || manilaDateKey();
  const summary = buildDemoAttendanceSummary(dateKey);
  const overlay = readScanOverlay(dateKey);

  const merged = new Map<string, AttendanceRecord>();
  summary.records.forEach((record) => merged.set(record.studentUid, record));
  Object.values(overlay).forEach((record) => merged.set(record.studentUid, record));

  const records = Array.from(merged.values()).sort((a, b) =>
    (a.firstScanAt || '').localeCompare(b.firstScanAt || ''),
  );

  const byGrade: Record<string, number> = {};
  records.forEach((record) => {
    const grade = record.gradeLevel || 'Unassigned';
    byGrade[grade] = (byGrade[grade] || 0) + 1;
  });

  const present = records.length;
  return {
    date: dateKey,
    totalStudents: summary.totalStudents,
    present,
    absent: Math.max(0, summary.totalStudents - present),
    attendanceRate: summary.totalStudents > 0 ? Math.round((present / summary.totalStudents) * 100) : 0,
    byGrade,
    records,
  };
};

/* ─── Local Server (offline kiosk mode — not used by the demo) ───────────── */

const LOCAL_SERVER_URL = 'http://localhost:3001';

export { LOCAL_SERVER_URL };

export const pingLocalServer = async (): Promise<boolean> => false;

export const recordAttendanceScanLocal = (
  systemId: string,
  scanMode: AttendanceScanMode = 'time_in',
) => recordAttendanceScan(systemId, scanMode);

export interface LocalSyncStatus {
  lastSynced: string | null;
  isSyncing: boolean;
  syncSteps: string[];
  lastError: string | null;
  pendingLogs: number;
}

export const getLocalSyncStatus = async (): Promise<LocalSyncStatus> => ({
  lastSynced: new Date().toISOString(),
  isSyncing: false,
  syncSteps: ['Demo mode — data is stored in this browser only.'],
  lastError: null,
  pendingLogs: 0,
});

export const triggerManualSync = async (): Promise<{ started: boolean }> => ({ started: true });

/* ─── Legacy helpers (kept for compatibility with existing features) ──────── */

export const hasDeveloperAdminSession = (): boolean => isAdminRole();
export const canAccessAccountManagement = (): boolean => canManageAccounts();

/* apiFetch is kept because a few modules import it; in the demo it always
   fails fast instead of hitting a network. Nothing in the demo calls it at
   runtime once the portals run on the mocks above. */
export const apiFetch = async <T>(_path: string, _init: RequestInit = {}): Promise<T> => {
  throw new ApiError(503, 'Network requests are disabled in this demo build.');
};
