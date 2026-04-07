// Mock database utilities using localStorage to simulate JSON file read/write
// In a real implementation, this would use actual file system or API calls

import facultyData from '../data/seeds/faculty.json';
import alumniData from '../data/seeds/alumni.json';
import pagesData from '../data/seeds/pages.json';
import settingsData from '../data/seeds/settings.json';
import credentialsData from '../data/seeds/credentials.json';
import schoolYearsData from '../data/seeds/school_years.json';

type DatabaseTable = 'faculty' | 'alumni' | 'pages' | 'settings' | 'credentials' | 'school_years';

const initialData = {
  faculty: facultyData,
  alumni: alumniData,
  pages: pagesData,
  settings: settingsData,
  credentials: credentialsData,
  school_years: schoolYearsData
};

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

// Initialize database from JSON files (simulated with localStorage)
export const initializeDatabase = async () => {
  const tables: DatabaseTable[] = ['faculty', 'alumni', 'pages', 'settings', 'credentials', 'school_years'];
  
  for (const table of tables) {
    const storageKey = `mmpns_db_${table}`;
    if (!localStorage.getItem(storageKey)) {
      // Load initial data from imported JSON
      try {
        const data = initialData[table];
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.error(`Failed to initialize ${table} table:`, error);
      }
    }

    if (table === 'credentials') {
      try {
        const existingValue = localStorage.getItem(storageKey);
        const migrated = migrateCredentials(existingValue);
        localStorage.setItem(storageKey, JSON.stringify(migrated));
      } catch (error) {
        console.error('Failed to migrate credentials table:', error);
      }
    }
  }
};

// Read from database
export const readDatabase = <T = any>(table: DatabaseTable): T | null => {
  const storageKey = `mmpns_db_${table}`;
  const data = localStorage.getItem(storageKey);
  return data ? JSON.parse(data) : null;
};

// Write to database
export const writeDatabase = (table: DatabaseTable, data: any): boolean => {
  try {
    const storageKey = `mmpns_db_${table}`;
    const dataWithTimestamp = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(storageKey, JSON.stringify(dataWithTimestamp));
    return true;
  } catch (error) {
    console.error(`Failed to write to ${table}:`, error);
    return false;
  }
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
  try {
    const storageKey = `mmpns_db_${table}`;
    const data = initialData[table];
    localStorage.setItem(storageKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Failed to reset ${table}:`, error);
    return false;
  }
};