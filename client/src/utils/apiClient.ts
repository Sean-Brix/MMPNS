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

export const getAccounts = () =>
  apiFetch<{ users: any[] }>('/accounts');

export const createAccount = (data: Record<string, any>) =>
  apiFetch<{ success: boolean; user: any }>('/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
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
  scanCount: number;
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

export const recordAttendanceScan = (systemId: string) =>
  apiFetch<{ student: any; attendance: AttendanceRecord; isFirstScan: boolean }>('/attendance/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemId }),
  });

export const getAttendanceSummary = (date?: string) =>
  apiFetch<AttendanceSummary>(`/attendance/summary${date ? `?date=${encodeURIComponent(date)}` : ''}`);

// ─── Legacy helpers (kept for compatibility with existing features) ────────────

export const hasDeveloperAdminSession = (): boolean => isAdminRole();
export const canAccessAccountManagement = (): boolean => canManageAccounts();
