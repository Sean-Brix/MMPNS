// Demo database layer.
// The production build syncs these tables with the cloud REST API; the demo
// keeps the identical read/write/subscribe surface but stores everything in
// localStorage, seeded once per table from the fixed demo dataset.

import { getApiSeedSnapshot } from './apiClient';
import { DEMO_TABLE_SEEDS } from '../demo/demoData';

export type DatabaseTable =
  | 'faculty'
  | 'alumni'
  | 'pages'
  | 'settings'
  | 'school_years'
  | 'teacher_portal'
  | 'calendar'
  | 'teacher_records'
  | 'master_subjects'
  | 'student_registrations'
  | 'students'
  | 'teachers'
  | 'evaluation_rubrics'
  | 'teacher_evaluations'
  | 'books'
  | 'library_circulation'
  | 'library_entry_logs';

const DATABASE_TABLES: DatabaseTable[] = [
  'faculty',
  'alumni',
  'pages',
  'settings',
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
  'books',
  'library_circulation',
  'library_entry_logs',
];

export const DATABASE_UPDATED_EVENT = 'mmpns-db-updated';

type DatabaseUpdateSource = 'local' | 'cloud';

interface DatabaseUpdateEventDetail {
  key: string;
  table: DatabaseTable;
  source: DatabaseUpdateSource;
}

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

const persistTableLocally = (
  table: DatabaseTable,
  value: unknown,
  source: DatabaseUpdateSource,
) => {
  if (!hasWindow()) {
    return;
  }

  localStorage.setItem(getStorageKey(table), JSON.stringify(value));
  emitDatabaseUpdated(table, source);
};

/** Writes the fixed demo content into a table the first time it is touched. */
const ensureSeeded = (table: DatabaseTable) => {
  if (!hasWindow()) {
    return;
  }

  if (localStorage.getItem(getStorageKey(table)) !== null) {
    return;
  }

  const seed = DEMO_TABLE_SEEDS[table];
  if (seed !== undefined) {
    localStorage.setItem(getStorageKey(table), JSON.stringify(seed));
  }
};

const resolveTables = (tables?: DatabaseTable[]) => tables ?? DATABASE_TABLES;

export const isCloudDatabaseConfigured = () => true;

export const initializeDatabase = async (tables?: DatabaseTable[]) => {
  if (!hasWindow()) {
    return;
  }

  resolveTables(tables).forEach(ensureSeeded);
};

export const readDatabase = <T = any>(table: DatabaseTable): T | null => {
  if (!hasWindow()) {
    return null;
  }

  ensureSeeded(table);

  const data = localStorage.getItem(getStorageKey(table));
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

export const readDatabaseOnline = async <T = any>(table: DatabaseTable): Promise<T | null> => {
  return readDatabase<T>(table);
};

export const readSeedSnapshotOnline = async <T = any>(key: string): Promise<T | null> => {
  try {
    return await getApiSeedSnapshot<T>(key);
  } catch (error) {
    console.error(`Failed to read ${key} seed snapshot:`, error);
    return null;
  }
};

export const writeDatabase = (table: DatabaseTable, data: any): boolean => {
  try {
    const dataWithTimestamp =
      data && typeof data === 'object' && !Array.isArray(data)
        ? { ...data, lastUpdated: new Date().toISOString() }
        : data;

    persistTableLocally(table, dataWithTimestamp, 'local');

    return true;
  } catch (error) {
    console.error(`Failed to write to ${table}:`, error);
    return false;
  }
};

export const writeDatabaseOnline = async (table: DatabaseTable, data: any): Promise<boolean> => {
  return writeDatabase(table, data);
};

export const subscribeDatabaseTable = <T = any>(
  table: DatabaseTable,
  callback: (data: T | null) => void,
  onError?: (error: unknown) => void,
) => {
  const refresh = () => {
    try {
      callback(readDatabase<T>(table));
    } catch (error) {
      if (onError) {
        onError(error);
      }
    }
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

  return () => {
    window.removeEventListener(DATABASE_UPDATED_EVENT, handleDatabaseUpdate);
    window.removeEventListener('storage', handleStorage);
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

/** Resetting a table restores the fixed demo content for it. */
export const resetDatabase = async (table: DatabaseTable): Promise<boolean> => {
  try {
    localStorage.removeItem(getStorageKey(table));
    ensureSeeded(table);
    emitDatabaseUpdated(table, 'cloud');
    return true;
  } catch (error) {
    console.error(`Failed to reset ${table}:`, error);
    return false;
  }
};

export const stopDatabaseRefreshForTests = () => {};
