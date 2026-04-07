// Authentication utilities for portal login
// Uses the credentials database for validation

import {
  initializeDatabase,
  readDatabase,
  readDatabaseOnline,
  updateDatabaseItem,
  writeDatabaseOnline,
} from './database';

export interface TeacherCredential {
  id: number;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  email: string;
  department: string;
  position: string;
  employeeId: string;
  subjects: string[];
  advisoryClass: string | null;
  status: string;
  avatar: string | null;
  lastLogin: string | null;
}

export interface StudentCredential {
  id: number;
  studentId: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  email: string;
  gradeLevel: string;
  section: string;
  lrn: string;
  guardianName: string;
  guardianContact: string;
  status: string;
  avatar: string | null;
  lastLogin: string | null;
}

export interface AdminCredential {
  id: number;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string | null;
}

interface CredentialsDB {
  teachers: TeacherCredential[];
  students: StudentCredential[];
  admins: AdminCredential[];
}

let initializeDatabasePromise: Promise<void> | null = null;

// Ensure the database is initialized
const ensureDB = () => {
  const data = readDatabase<CredentialsDB>('credentials');
  if (!data) {
    // Force re-init if credentials not found
    initializeDatabase();
    return readDatabase<CredentialsDB>('credentials');
  }
  return data;
};

const ensureDatabaseInitialized = async () => {
  if (!initializeDatabasePromise) {
    initializeDatabasePromise = initializeDatabase();
  }

  try {
    await initializeDatabasePromise;
  } catch {
    // Allow retry on the next call if initialization failed.
    initializeDatabasePromise = null;
  }
};

const ensureDBOnline = async (): Promise<CredentialsDB | null> => {
  await ensureDatabaseInitialized();

  try {
    const onlineData = await readDatabaseOnline<CredentialsDB>('credentials');
    if (onlineData) {
      return onlineData;
    }
  } catch (error) {
    console.error('Failed to load credentials from cloud database:', error);
  }

  return ensureDB();
};

const persistLastLoginOnline = async (
  accountType: 'teachers' | 'students' | 'admins',
  accountId: number,
  credentials: CredentialsDB,
) => {
  const accounts = credentials[accountType];

  if (!Array.isArray(accounts)) {
    return;
  }

  const updatedAccounts = accounts.map((account) =>
    account.id === accountId
      ? {
          ...account,
          lastLogin: new Date().toISOString(),
        }
      : account,
  );

  await writeDatabaseOnline('credentials', {
    ...credentials,
    [accountType]: updatedAccounts,
  });
};

// Authenticate a teacher by username and password
export const authenticateTeacher = (
  username: string,
  password: string
): { success: boolean; teacher?: TeacherCredential; error?: string } => {
  const db = ensureDB();
  if (!db || !db.teachers) {
    return { success: false, error: 'Unable to access credentials database.' };
  }

  const teacher = db.teachers.find(
    (t) =>
      t.username.toLowerCase() === username.trim().toLowerCase() &&
      t.password === password &&
      t.status === 'active'
  );

  if (!teacher) {
    return { success: false, error: 'Invalid username or password. Please try again.' };
  }

  // Update last login
  updateDatabaseItem('credentials', 'teachers', teacher.id, {
    lastLogin: new Date().toISOString(),
  });

  return { success: true, teacher };
};

// Authenticate a teacher using online-first credentials
export const authenticateTeacherOnline = async (
  username: string,
  password: string,
): Promise<{ success: boolean; teacher?: TeacherCredential; error?: string }> => {
  const db = await ensureDBOnline();
  if (!db || !db.teachers) {
    return { success: false, error: 'Unable to access credentials database.' };
  }

  const teacher = db.teachers.find(
    (record) =>
      record.username.toLowerCase() === username.trim().toLowerCase() &&
      record.password === password &&
      record.status === 'active',
  );

  if (!teacher) {
    return { success: false, error: 'Invalid username or password. Please try again.' };
  }

  try {
    await persistLastLoginOnline('teachers', teacher.id, db);
  } catch (error) {
    console.error('Failed to persist teacher last login online:', error);
  }

  return { success: true, teacher };
};

// Authenticate a student by student ID and password
export const authenticateStudent = (
  studentId: string,
  password: string
): { success: boolean; student?: StudentCredential; error?: string } => {
  const db = ensureDB();
  if (!db || !db.students) {
    return { success: false, error: 'Unable to access credentials database.' };
  }

  const student = db.students.find(
    (s) =>
      s.studentId.toLowerCase() === studentId.trim().toLowerCase() &&
      s.password === password &&
      s.status === 'active'
  );

  if (!student) {
    return { success: false, error: 'Invalid Student ID or password. Please try again.' };
  }

  // Update last login
  updateDatabaseItem('credentials', 'students', student.id, {
    lastLogin: new Date().toISOString(),
  });

  return { success: true, student };
};

// Authenticate a student using online-first credentials
export const authenticateStudentOnline = async (
  studentId: string,
  password: string,
): Promise<{ success: boolean; student?: StudentCredential; error?: string }> => {
  const db = await ensureDBOnline();
  if (!db || !db.students) {
    return { success: false, error: 'Unable to access credentials database.' };
  }

  const student = db.students.find(
    (record) =>
      record.studentId.toLowerCase() === studentId.trim().toLowerCase() &&
      record.password === password &&
      record.status === 'active',
  );

  if (!student) {
    return { success: false, error: 'Invalid Student ID or password. Please try again.' };
  }

  try {
    await persistLastLoginOnline('students', student.id, db);
  } catch (error) {
    console.error('Failed to persist student last login online:', error);
  }

  return { success: true, student };
};

// Authenticate an admin by username and password
export const authenticateAdmin = (
  username: string,
  password: string
): { success: boolean; admin?: AdminCredential; error?: string } => {
  const db = ensureDB();
  if (!db || !db.admins) {
    return { success: false, error: 'Unable to access credentials database.' };
  }

  const admin = db.admins.find(
    (a) =>
      a.username.toLowerCase() === username.trim().toLowerCase() &&
      a.password === password &&
      a.status === 'active'
  );

  if (!admin) {
    return { success: false, error: 'Invalid username or password. Please try again.' };
  }

  // Update last login
  updateDatabaseItem('credentials', 'admins', admin.id, {
    lastLogin: new Date().toISOString(),
  });

  return { success: true, admin };
};

// Authenticate an admin using online-first credentials
export const authenticateAdminOnline = async (
  username: string,
  password: string,
): Promise<{ success: boolean; admin?: AdminCredential; error?: string }> => {
  const db = await ensureDBOnline();
  if (!db || !db.admins) {
    return { success: false, error: 'Unable to access credentials database.' };
  }

  const admin = db.admins.find(
    (record) =>
      record.username.toLowerCase() === username.trim().toLowerCase() &&
      record.password === password &&
      record.status === 'active',
  );

  if (!admin) {
    return { success: false, error: 'Invalid username or password. Please try again.' };
  }

  try {
    await persistLastLoginOnline('admins', admin.id, db);
  } catch (error) {
    console.error('Failed to persist admin last login online:', error);
  }

  return { success: true, admin };
};

// Session management helpers
const TEACHER_SESSION_KEY = 'teacherAuth';
const STUDENT_SESSION_KEY = 'studentAuth';
const ADMIN_SESSION_KEY = 'adminAuth';

export const saveTeacherSession = (teacher: TeacherCredential) => {
  const sessionData = {
    id: teacher.id,
    displayName: teacher.displayName,
    initials: teacher.initials,
    department: teacher.department,
    position: teacher.position,
    employeeId: teacher.employeeId,
    email: teacher.email,
    subjects: teacher.subjects,
    advisoryClass: teacher.advisoryClass,
    authenticated: true,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(sessionData));
};

export const getTeacherSession = () => {
  const data = localStorage.getItem(TEACHER_SESSION_KEY);
  if (!data) return null;
  try {
    const session = JSON.parse(data);
    return session.authenticated ? session : null;
  } catch {
    return null;
  }
};

export const clearTeacherSession = () => {
  localStorage.removeItem(TEACHER_SESSION_KEY);
};

export const saveStudentSession = (student: StudentCredential) => {
  const sessionData = {
    id: student.id,
    studentId: student.studentId,
    displayName: student.displayName,
    initials: student.initials,
    gradeLevel: student.gradeLevel,
    section: student.section,
    email: student.email,
    lrn: student.lrn,
    authenticated: true,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(sessionData));
};

export const getStudentSession = () => {
  const data = localStorage.getItem(STUDENT_SESSION_KEY);
  if (!data) return null;
  try {
    const session = JSON.parse(data);
    return session.authenticated ? session : null;
  } catch {
    return null;
  }
};

export const clearStudentSession = () => {
  localStorage.removeItem(STUDENT_SESSION_KEY);
};

export const saveAdminSession = (admin: AdminCredential) => {
  const sessionData = {
    id: admin.id,
    displayName: admin.displayName,
    initials: admin.initials,
    role: admin.role,
    email: admin.email,
    authenticated: true,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(sessionData));
};

export const getAdminSession = () => {
  const data = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!data) return null;
  try {
    const session = JSON.parse(data);
    return session.authenticated ? session : null;
  } catch {
    return null;
  }
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_SESSION_KEY);
};

// Get all teacher accounts (for demo credentials display)
export const getTeacherAccounts = (): Pick<TeacherCredential, 'username' | 'password' | 'displayName' | 'department' | 'position'>[] => {
  const db = ensureDB();
  if (!db || !db.teachers) return [];
  return db.teachers
    .filter((t) => t.status === 'active')
    .map((t) => ({
      username: t.username,
      password: t.password,
      displayName: t.displayName,
      department: t.department,
      position: t.position,
    }));
};

// Get all student accounts (for demo credentials display)
export const getStudentAccounts = (): Pick<StudentCredential, 'studentId' | 'displayName' | 'gradeLevel' | 'section'>[] => {
  const db = ensureDB();
  if (!db || !db.students) return [];
  return db.students
    .filter((s) => s.status === 'active')
    .map((s) => ({
      studentId: s.studentId,
      displayName: s.displayName,
      gradeLevel: s.gradeLevel,
      section: s.section,
    }));
};