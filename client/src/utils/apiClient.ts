import { getFirebaseIdToken, isAdminRole, canManageAccounts } from './auth';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const withAuthHeader = async (headers?: HeadersInit): Promise<Headers> => {
  const nextHeaders = new Headers(headers);
  const token = await getFirebaseIdToken();
  if (token && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }
  return nextHeaders;
};

const readResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, parsed?.error || response.statusText || 'API request failed');
  }

  return parsed as T;
};

export const apiFetch = async <T>(path: string, init: RequestInit = {}) => {
  const headers = await withAuthHeader(init.headers);
  const response = await fetch(apiUrl(path), { ...init, headers });
  return readResponse<T>(response);
};

// ─── Account Management ───────────────────────────────────────────────────────

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

const toQueryString = (params: Record<string, unknown>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return;
    }
    query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

export const getAccounts = (params: AccountListParams = {}) =>
  apiFetch<AccountListResponse>(`/accounts${toQueryString(params)}`);

export const getMyAccount = () => apiFetch<{ user: any }>('/accounts/me');

export const createAccount = (data: Record<string, any>) =>
  apiFetch<{ success: boolean; user: any }>('/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export interface BatchStudentResult {
  index: number;
  status: 'success' | 'failed';
  uid?: string;
  studentCode?: string;
  error?: string;
}

// Registers many students in a single request (one batched Firestore write
// server-side) instead of one HTTP call per student.
export const createStudentsBatch = (students: Record<string, any>[]) =>
  apiFetch<{ success: boolean; created: any[]; results: BatchStudentResult[] }>('/accounts/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students }),
  });

export const updateAccountStatus = (uid: string, status: 'active' | 'inactive') =>
  apiFetch<{ success: boolean }>(`/accounts/${uid}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

export const resetAccountPassword = (uid: string, password: string) =>
  apiFetch<{ success: boolean }>(`/accounts/${uid}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

export const deleteAccount = (uid: string) =>
  apiFetch<{ success: boolean }>(`/accounts/${uid}`, { method: 'DELETE' });

export const updateAccountProfile = (uid: string, data: Record<string, any>) =>
  apiFetch<{ success: boolean; user: any }>(`/accounts/${uid}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ─── Table API (kept for existing features) ───────────────────────────────────

export const getApiTable = async <T = any>(table: string): Promise<T | null> => {
  try {
    const result = await apiFetch<{ table: string; payload: T }>(`/tables/${encodeURIComponent(table)}`);
    return result.payload;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const setApiTable = async <T = any>(table: string, payload: T): Promise<T> => {
  const result = await apiFetch<{ table: string; payload: T }>(`/tables/${encodeURIComponent(table)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });
  return result.payload;
};

export const deleteApiTable = async (table: string): Promise<void> => {
  await apiFetch<void>(`/tables/${encodeURIComponent(table)}`, { method: 'DELETE' });
};

export const getApiSeedSnapshot = async <T = any>(key: string): Promise<T | null> => {
  try {
    const result = await apiFetch<{ key: string; payload: T }>(`/tables/seed-snapshots/${encodeURIComponent(key)}`);
    return result.payload;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

// ─── Storage ──────────────────────────────────────────────────────────────────

export const getStorageObjectUrl = async (objectPath: string): Promise<string | null> => {
  try {
    const result = await apiFetch<{ path: string; url: string }>(
      `/storage/objects/url?path=${encodeURIComponent(objectPath)}`,
    );
    return result.url;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const uploadPrincipalImage = async (options: {
  file: File;
  pageFolder: string;
  slot: string;
}): Promise<string> => {
  const formData = new FormData();
  formData.append('file', options.file);
  formData.append('pageFolder', options.pageFolder);
  formData.append('slot', options.slot);

  const result = await apiFetch<{ path: string; url: string }>('/storage/principal-edits', {
    method: 'POST',
    body: formData,
  });

  return result.url;
};

// ─── Kiosk / Student Scan ─────────────────────────────────────────────────────

export const scanStudentBySystemId = (systemId: string) =>
  apiFetch<{ student: any }>(`/accounts/scan/${encodeURIComponent(systemId)}`);

export const uploadStudentPhoto = async (uid: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiFetch<{ url: string }>(`/storage/student-photos/${uid}`, {
    method: 'POST',
    body: formData,
  });
  return result.url;
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

export const recordAttendanceScan = (systemId: string, scanMode: AttendanceScanMode = 'time_in') =>
  apiFetch<{
    student: any;
    attendance: AttendanceRecord;
    isFirstScan: boolean;
    scanMode: AttendanceScanMode;
  }>('/attendance/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemId, scanMode }),
  });

export const getAttendanceSummary = (date?: string) =>
  apiFetch<AttendanceSummary>(`/attendance/summary${date ? `?date=${encodeURIComponent(date)}` : ''}`);

// ─── Local Server (Offline Mode) ──────────────────────────────────────────────

const LOCAL_SERVER_URL = (import.meta.env.VITE_LOCAL_SERVER_URL || 'http://localhost:3001').replace(/\/$/, '');

export { LOCAL_SERVER_URL };

const localFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const url = `${LOCAL_SERVER_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, parsed?.error || res.statusText || 'Local server error');
  return parsed as T;
};

export const pingLocalServer = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${LOCAL_SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
};

export const recordAttendanceScanLocal = (systemId: string, scanMode: AttendanceScanMode = 'time_in') =>
  localFetch<{
    student: any;
    attendance: AttendanceRecord;
    isFirstScan: boolean;
    scanMode: AttendanceScanMode;
  }>('/local/attendance/scan', {
    method: 'POST',
    body: JSON.stringify({ systemId, scanMode }),
  });

export interface LocalSyncStatus {
  lastSynced: string | null;
  isSyncing: boolean;
  syncSteps: string[];
  lastError: string | null;
  pendingLogs: number;
}

export const getLocalSyncStatus = () =>
  localFetch<LocalSyncStatus>('/local/sync/status');

export const triggerManualSync = () =>
  localFetch<{ started: boolean }>('/local/sync/run', { method: 'POST' });

// ─── Legacy helpers (kept for compatibility with existing features) ────────────

export const hasDeveloperAdminSession = (): boolean => isAdminRole();
export const canAccessAccountManagement = (): boolean => canManageAccounts();
