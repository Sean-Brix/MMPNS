import {
  deleteApiTable,
  getApiSeedSnapshot,
  getApiTable,
  hasDeveloperAdminSession,
  setApiTable,
} from './apiClient';

export type DatabaseTable =
  | 'faculty'
  | 'alumni'
  | 'pages'
  | 'settings'
  | 'credentials'
  | 'school_years'
  | 'teacher_portal'
  | 'calendar'
  | 'teacher_records'
  | 'master_subjects'
  | 'student_registrations'
  | 'students'
  | 'teachers'
  | 'evaluation_rubrics'
  | 'teacher_evaluations';

const DATABASE_TABLES: DatabaseTable[] = [
  'faculty',
  'alumni',
  'pages',
  'settings',
  'credentials',
  'school_years',
  'teacher_portal',
  'calendar',
  'teacher_records',
  'master_subjects',
  'student_registrations',
  'students',
  'teachers',
  'evaluation_rubrics',
  'teacher_evaluations',
];

export const DATABASE_UPDATED_EVENT = 'mmpns-db-updated';

type DatabaseUpdateSource = 'local' | 'cloud';

interface DatabaseUpdateEventDetail {
  key: string;
  table: DatabaseTable;
  source: DatabaseUpdateSource;
}

const EMPTY_CREDENTIALS = {
  teachers: [],
  students: [],
  admins: [],
};

const PROTECTED_TABLES = new Set<DatabaseTable>(['credentials']);

let hasStartedCloudRefresh = false;
let cloudRefreshIntervalId: number | null = null;

const hasWindow = () => typeof window !== 'undefined';

const getStorageKey = (table: DatabaseTable) => `mmpns_db_${table}`;

const emitDatabaseUpdated = (table: DatabaseTable, source: DatabaseUpdateSource) => {
  if (!hasWindow()) {
    return;
  }

  const detail: DatabaseUpdateEventDetail = {
    key: getStorageKey(table),
    table,
    source,
  };

  window.dispatchEvent(new CustomEvent<DatabaseUpdateEventDetail>(DATABASE_UPDATED_EVENT, { detail }));
};

const normalizeCredentials = (value: unknown) => {
  const source = value && typeof value === 'object' ? value as any : EMPTY_CREDENTIALS;
  return {
    ...source,
    teachers: Array.isArray(source.teachers) ? [...source.teachers] : [],
    students: Array.isArray(source.students) ? [...source.students] : [],
    admins: Array.isArray(source.admins) ? [...source.admins] : [],
  };
};

const normalizeTableData = (table: DatabaseTable, value: unknown) => {
  if (table !== 'credentials') {
    return value;
  }

  return normalizeCredentials(value);
};

const persistTableLocally = (
  table: DatabaseTable,
  value: unknown,
  source: DatabaseUpdateSource,
) => {
  if (!hasWindow()) {
    return;
  }

  const normalized = normalizeTableData(table, value);
  localStorage.setItem(getStorageKey(table), JSON.stringify(normalized));
  emitDatabaseUpdated(table, source);
};

const removeTableLocally = (table: DatabaseTable, source: DatabaseUpdateSource) => {
  if (!hasWindow()) {
    return;
  }

  localStorage.removeItem(getStorageKey(table));
  emitDatabaseUpdated(table, source);
};

const canAccessProtectedTable = (table: DatabaseTable) => (
  !PROTECTED_TABLES.has(table) || hasDeveloperAdminSession()
);

const refreshTableFromCloud = async (table: DatabaseTable) => {
  if (!canAccessProtectedTable(table)) {
    removeTableLocally(table, 'cloud');
    return null;
  }

  const cloudValue = await getApiTable(table);

  if (cloudValue !== null) {
    persistTableLocally(table, cloudValue, 'cloud');
    return cloudValue;
  }

  const localValue = readDatabase(table);
  if (localValue !== null) {
    await setApiTable(table, normalizeTableData(table, localValue));
  }

  return localValue;
};

const startCloudRefresh = () => {
  if (!hasWindow() || hasStartedCloudRefresh) {
    return;
  }

  hasStartedCloudRefresh = true;

  cloudRefreshIntervalId = window.setInterval(() => {
    DATABASE_TABLES.forEach((table) => {
      refreshTableFromCloud(table).catch((error) => {
        console.error(`Failed to refresh ${table} from API:`, error);
      });
    });
  }, 30_000);
};

export const isCloudDatabaseConfigured = () => true;

export const initializeDatabase = async () => {
  if (!hasWindow()) {
    return;
  }

  await Promise.all(
    DATABASE_TABLES.map(async (table) => {
      try {
        await refreshTableFromCloud(table);
      } catch (error) {
        console.error(`Failed to initialize ${table} from API:`, error);
      }
    }),
  );

  startCloudRefresh();
};

export const readDatabase = <T = any>(table: DatabaseTable): T | null => {
  if (!hasWindow()) {
    return null;
  }

  if (!canAccessProtectedTable(table)) {
    return null;
  }

  const data = localStorage.getItem(getStorageKey(table));
  if (!data) {
    return null;
  }

  try {
    return normalizeTableData(table, JSON.parse(data)) as T;
  } catch {
    return null;
  }
};

export const readDatabaseOnline = async <T = any>(table: DatabaseTable): Promise<T | null> => {
  if (!canAccessProtectedTable(table)) {
    removeTableLocally(table, 'cloud');
    return null;
  }

  try {
    const cloudValue = await getApiTable<T>(table);
    if (cloudValue !== null) {
      persistTableLocally(table, cloudValue, 'cloud');
      return normalizeTableData(table, cloudValue) as T;
    }
  } catch (error) {
    console.error(`Failed to read ${table} from API:`, error);
  }

  return readDatabase<T>(table);
};

export const readSeedSnapshotOnline = async <T = any>(key: string): Promise<T | null> => {
  try {
    return await getApiSeedSnapshot<T>(key);
  } catch (error) {
    console.error(`Failed to read ${key} seed snapshot from API:`, error);
    return null;
  }
};

export const writeDatabase = (table: DatabaseTable, data: any): boolean => {
  try {
    if (!canAccessProtectedTable(table)) {
      return false;
    }

    const dataWithTimestamp =
      data && typeof data === 'object' && !Array.isArray(data)
        ? {
            ...data,
            lastUpdated: new Date().toISOString(),
          }
        : data;

    const normalized = normalizeTableData(table, dataWithTimestamp);
    persistTableLocally(table, normalized, 'local');

    void setApiTable(table, normalized).catch((error) => {
      console.error(`Failed to write ${table} to API:`, error);
    });

    return true;
  } catch (error) {
    console.error(`Failed to write to ${table}:`, error);
    return false;
  }
};

export const writeDatabaseOnline = async (table: DatabaseTable, data: any): Promise<boolean> => {
  try {
    if (!canAccessProtectedTable(table)) {
      return false;
    }

    const dataWithTimestamp =
      data && typeof data === 'object' && !Array.isArray(data)
        ? {
            ...data,
            lastUpdated: new Date().toISOString(),
          }
        : data;

    const normalized = normalizeTableData(table, dataWithTimestamp);
    persistTableLocally(table, normalized, 'local');
    await setApiTable(table, normalized);
    return true;
  } catch (error) {
    console.error(`Failed to write ${table} online:`, error);
    return false;
  }
};

export const subscribeDatabaseTable = <T = any>(
  table: DatabaseTable,
  callback: (data: T | null) => void,
  onError?: (error: unknown) => void,
) => {
  const refresh = () => {
    void readDatabaseOnline<T>(table)
      .then(callback)
      .catch((error) => {
        if (onError) {
          onError(error);
        }
      });
  };

  const handleDatabaseUpdate = (event: Event) => {
    const detail = (event as CustomEvent<DatabaseUpdateEventDetail>).detail;
    if (detail?.table === table) {
      callback(readDatabase<T>(table));
    }
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === getStorageKey(table)) {
      callback(readDatabase<T>(table));
    }
  };

  window.addEventListener(DATABASE_UPDATED_EVENT, handleDatabaseUpdate);
  window.addEventListener('storage', handleStorage);
  refresh();

  const intervalId = window.setInterval(refresh, 30_000);

  return () => {
    window.removeEventListener(DATABASE_UPDATED_EVENT, handleDatabaseUpdate);
    window.removeEventListener('storage', handleStorage);
    window.clearInterval(intervalId);
  };
};

export const updateDatabaseItem = <T extends { id: number }>(
  table: DatabaseTable,
  arrayKey: string,
  itemId: number,
  updates: Partial<T>,
): boolean => {
  try {
    const data = readDatabase(table);
    if (!data || !data[arrayKey]) return false;

    const items = data[arrayKey] as T[];
    const index = items.findIndex((item) => item.id === itemId);

    if (index === -1) return false;

    items[index] = { ...items[index], ...updates };
    data[arrayKey] = items;

    return writeDatabase(table, data);
  } catch (error) {
    console.error(`Failed to update item in ${table}:`, error);
    return false;
  }
};

export const addDatabaseItem = <T extends { id: number }>(
  table: DatabaseTable,
  arrayKey: string,
  item: Omit<T, 'id'>,
): number | null => {
  try {
    const data = readDatabase(table);
    if (!data || !data[arrayKey]) return null;

    const items = data[arrayKey] as T[];
    const newId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    const newItem = { ...item, id: newId } as T;

    items.push(newItem);
    data[arrayKey] = items;

    return writeDatabase(table, data) ? newId : null;
  } catch (error) {
    console.error(`Failed to add item to ${table}:`, error);
    return null;
  }
};

export const deleteDatabaseItem = (
  table: DatabaseTable,
  arrayKey: string,
  itemId: number,
): boolean => {
  try {
    const data = readDatabase(table);
    if (!data || !data[arrayKey]) return false;

    const items = data[arrayKey] as any[];
    data[arrayKey] = items.filter((item) => item.id !== itemId);

    return writeDatabase(table, data);
  } catch (error) {
    console.error(`Failed to delete item from ${table}:`, error);
    return false;
  }
};

export const exportDatabase = (table: DatabaseTable): string => {
  const data = readDatabase(table);
  return JSON.stringify(data, null, 2);
};

export const importDatabase = (table: DatabaseTable, jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    return writeDatabase(table, data);
  } catch (error) {
    console.error(`Failed to import to ${table}:`, error);
    return false;
  }
};

export const resetDatabase = async (table: DatabaseTable): Promise<boolean> => {
  try {
    await deleteApiTable(table);
    removeTableLocally(table, 'cloud');
    return true;
  } catch (error) {
    console.error(`Failed to reset ${table}:`, error);
    return false;
  }
};

export const stopDatabaseRefreshForTests = () => {
  if (cloudRefreshIntervalId !== null) {
    window.clearInterval(cloudRefreshIntervalId);
    cloudRefreshIntervalId = null;
  }
  hasStartedCloudRefresh = false;
};
