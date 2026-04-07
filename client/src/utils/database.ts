// Database utilities with Firestore-first persistence and local cache fallback.
// Local storage is retained as a compatibility cache during migration.

import facultyData from '../data/seeds/faculty.json';
import alumniData from '../data/seeds/alumni.json';
import pagesData from '../data/seeds/pages.json';
import settingsData from '../data/seeds/settings.json';
import credentialsData from '../data/seeds/credentials.json';
import schoolYearsData from '../data/seeds/school_years.json';
import {
  getCloudTable,
  isCloudDatabaseConfigured,
  setCloudTable,
  subscribeCloudTable,
  type CloudDatabaseTable,
} from './firestoreDatabase';

export type DatabaseTable = CloudDatabaseTable;

const DATABASE_TABLES: DatabaseTable[] = [
  'faculty',
  'alumni',
  'pages',
  'settings',
  'credentials',
  'school_years',
  'teacher_portal',
];

export const DATABASE_UPDATED_EVENT = 'mmpns-db-updated';

type DatabaseUpdateSource = 'local' | 'cloud';

interface DatabaseUpdateEventDetail {
  key: string;
  table: DatabaseTable;
  source: DatabaseUpdateSource;
}

const initialData = {
  faculty: facultyData,
  alumni: alumniData,
  pages: pagesData,
  settings: settingsData,
  credentials: credentialsData,
  school_years: schoolYearsData,
  teacher_portal: {
    classes: {},
    studentsByYear: {},
  },
};

let hasStartedCloudSubscriptions = false;

const ADMIN_TEACHER_TEMPLATE = {
  id: 5,
  username: 'admin.teacher',
  password: '123456',
  firstName: 'Adrian',
  lastName: 'Sarmiento',
  displayName: 'Portal Admin',
  initials: 'PA',
  email: 'portal.admin@mmpns.edu.ph',
  department: 'Administration',
  position: 'Admin',
  employeeId: 'MMPNS-A-2024-002',
  subjects: [],
  advisoryClass: null,
  status: 'active',
  avatar: null,
  lastLogin: null,
};

const migrateCredentials = (rawValue: string | null) => {
  try {
    const source = rawValue ? JSON.parse(rawValue) : credentialsData;

    const next = {
      ...source,
      teachers: Array.isArray(source.teachers) ? [...source.teachers] : [],
      admins: Array.isArray(source.admins) ? [...source.admins] : [],
    };

    const adminIndex = next.admins.findIndex((admin: any) => admin.username === 'admin');
    if (adminIndex >= 0) {
      next.admins[adminIndex] = {
        ...next.admins[adminIndex],
        password: '123456',
      };
    }

    const adminTeacherIndex = next.teachers.findIndex((teacher: any) => teacher.username === 'admin.teacher');
    if (adminTeacherIndex >= 0) {
      next.teachers[adminTeacherIndex] = {
        ...next.teachers[adminTeacherIndex],
        ...ADMIN_TEACHER_TEMPLATE,
      };
    } else {
      const legacyReplacementIndex = next.teachers.findIndex((teacher: any) => teacher.id === 5);
      if (legacyReplacementIndex >= 0) {
        next.teachers[legacyReplacementIndex] = ADMIN_TEACHER_TEMPLATE;
      } else {
        const maxId = next.teachers.reduce((max: number, teacher: any) => {
          return typeof teacher.id === 'number' ? Math.max(max, teacher.id) : max;
        }, 0);

        next.teachers.push({
          ...ADMIN_TEACHER_TEMPLATE,
          id: maxId + 1,
        });
      }
    }

    return next;
  } catch {
    return credentialsData;
  }
};

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

const normalizeTableData = (table: DatabaseTable, value: unknown) => {
  if (table !== 'credentials') {
    return value;
  }

  try {
    const serialized = JSON.stringify(value ?? null);
    return migrateCredentials(serialized);
  } catch {
    return migrateCredentials(null);
  }
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

const startCloudSubscriptions = () => {
  if (!hasWindow() || !isCloudDatabaseConfigured() || hasStartedCloudSubscriptions) {
    return;
  }

  hasStartedCloudSubscriptions = true;

  DATABASE_TABLES.forEach((table) => {
    subscribeCloudTable(
      table,
      (cloudValue) => {
        if (cloudValue === null) {
          return;
        }

        try {
          persistTableLocally(table, cloudValue, 'cloud');
        } catch (error) {
          console.error(`Failed to sync ${table} from cloud snapshot:`, error);
        }
      },
      (error) => {
        console.error(`Cloud listener failed for ${table}:`, error);
      },
    );
  });
};

// Initialize local cache from cloud and seed missing cloud docs.
export const initializeDatabase = async () => {
  if (!hasWindow()) {
    return;
  }

  for (const table of DATABASE_TABLES) {
    try {
      if (!localStorage.getItem(getStorageKey(table))) {
        persistTableLocally(table, initialData[table], 'local');
      }
    } catch (error) {
      console.error(`Failed to initialize ${table} local cache:`, error);
    }
  }

  try {
    persistTableLocally('credentials', readDatabase('credentials') ?? credentialsData, 'local');
  } catch (error) {
    console.error('Failed to migrate local credentials cache:', error);
  }

  if (!isCloudDatabaseConfigured()) {
    return;
  }

  for (const table of DATABASE_TABLES) {
    try {
      const cloudValue = await getCloudTable(table);

      if (cloudValue === null) {
        const seedValue = readDatabase(table) ?? initialData[table];
        const normalizedSeed = normalizeTableData(table, seedValue);
        await setCloudTable(table, normalizedSeed);
        continue;
      }

      const normalizedCloudValue = normalizeTableData(table, cloudValue);
      persistTableLocally(table, normalizedCloudValue, 'cloud');

      if (table === 'credentials') {
        await setCloudTable(table, normalizedCloudValue);
      }
    } catch (error) {
      console.error(`Failed to initialize ${table} from cloud:`, error);
    }
  }

  startCloudSubscriptions();
};

// Read from database
export const readDatabase = <T = any>(table: DatabaseTable): T | null => {
  if (!hasWindow()) {
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
  if (!isCloudDatabaseConfigured()) {
    return readDatabase<T>(table);
  }

  try {
    const cloudValue = await getCloudTable<T>(table);
    if (cloudValue !== null) {
      persistTableLocally(table, cloudValue, 'cloud');
      return normalizeTableData(table, cloudValue) as T;
    }
  } catch (error) {
    console.error(`Failed to read ${table} from cloud:`, error);
  }

  return readDatabase<T>(table);
};

// Write to database
export const writeDatabase = (table: DatabaseTable, data: any): boolean => {
  try {
    const dataWithTimestamp =
      data && typeof data === 'object' && !Array.isArray(data)
        ? {
            ...data,
            lastUpdated: new Date().toISOString(),
          }
        : data;

    persistTableLocally(table, dataWithTimestamp, 'local');

    if (isCloudDatabaseConfigured()) {
      void setCloudTable(table, normalizeTableData(table, dataWithTimestamp)).catch((error) => {
        console.error(`Failed to write ${table} to cloud:`, error);
      });
    }

    return true;
  } catch (error) {
    console.error(`Failed to write to ${table}:`, error);
    return false;
  }
};

export const writeDatabaseOnline = async (table: DatabaseTable, data: any): Promise<boolean> => {
  try {
    const dataWithTimestamp =
      data && typeof data === 'object' && !Array.isArray(data)
        ? {
            ...data,
            lastUpdated: new Date().toISOString(),
          }
        : data;

    persistTableLocally(table, dataWithTimestamp, 'local');

    if (!isCloudDatabaseConfigured()) {
      return true;
    }

    return await setCloudTable(table, normalizeTableData(table, dataWithTimestamp));
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
  if (!isCloudDatabaseConfigured()) {
    callback(readDatabase<T>(table));
    return () => {
      // No-op when cloud database is not configured.
    };
  }

  return subscribeCloudTable<T>(
    table,
    (data) => {
      if (data !== null) {
        try {
          persistTableLocally(table, data, 'cloud');
        } catch (error) {
          console.error(`Failed to persist ${table} snapshot locally:`, error);
        }
      }
      callback(data === null ? null : (normalizeTableData(table, data) as T));
    },
    onError,
  );
};

// Update specific item in an array
export const updateDatabaseItem = <T extends { id: number }>(
  table: DatabaseTable,
  arrayKey: string,
  itemId: number,
  updates: Partial<T>
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

// Add new item to array
export const addDatabaseItem = <T extends { id: number }>(
  table: DatabaseTable,
  arrayKey: string,
  item: Omit<T, 'id'>
): number | null => {
  try {
    const data = readDatabase(table);
    if (!data || !data[arrayKey]) return null;

    const items = data[arrayKey] as T[];
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem = { ...item, id: newId } as T;
    
    items.push(newItem);
    data[arrayKey] = items;
    
    return writeDatabase(table, data) ? newId : null;
  } catch (error) {
    console.error(`Failed to add item to ${table}:`, error);
    return null;
  }
};

// Delete item from array
export const deleteDatabaseItem = (
  table: DatabaseTable,
  arrayKey: string,
  itemId: number
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

// Export database to JSON (for download)
export const exportDatabase = (table: DatabaseTable): string => {
  const data = readDatabase(table);
  return JSON.stringify(data, null, 2);
};

// Import database from JSON string
export const importDatabase = (table: DatabaseTable, jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    return writeDatabase(table, data);
  } catch (error) {
    console.error(`Failed to import to ${table}:`, error);
    return false;
  }
};

// Reset database to initial state
export const resetDatabase = async (table: DatabaseTable): Promise<boolean> => {
  return writeDatabaseOnline(table, initialData[table]);
};