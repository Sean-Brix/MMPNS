const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const AUTH_SESSION_KEYS = ['adminAuth', 'teacherAuth', 'studentAuth'] as const;

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

const hasWindow = () => typeof window !== 'undefined';

const readStoredSession = (key: typeof AUTH_SESSION_KEYS[number]) => {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getApiAuthToken = () => {
  for (const key of AUTH_SESSION_KEYS) {
    const session = readStoredSession(key);
    if (session?.token) {
      return String(session.token);
    }
  }

  return '';
};

export const hasDeveloperAdminSession = () => {
  const session = readStoredSession('adminAuth');
  const role = String(session?.role || '').toLowerCase();
  return Boolean(session?.token && (role === 'admin' || role === 'superadmin'));
};

const withAuthHeader = (headers?: HeadersInit) => {
  const nextHeaders = new Headers(headers);
  const token = getApiAuthToken();

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
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: withAuthHeader(init.headers),
  });
  return readResponse<T>(response);
};

export const authenticateApiAccount = async <T = any>(
  accountType: 'teacher' | 'student' | 'admin',
  credentials: Record<string, string>,
) => {
  return apiFetch<{
    success: boolean;
    teacher?: T;
    student?: T;
    admin?: T;
    token?: string;
    error?: string;
  }>(`/auth/${accountType}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
};

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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payload }),
  });

  return result.payload;
};

export const deleteApiTable = async (table: string): Promise<void> => {
  await apiFetch<void>(`/tables/${encodeURIComponent(table)}`, {
    method: 'DELETE',
  });
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
