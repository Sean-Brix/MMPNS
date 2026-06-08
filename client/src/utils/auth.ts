// Authentication utilities for portal login
// Uses the Functions API for credential validation

import {
  authenticateApiAccount,
  getDemoStudentAccountsApi,
  getDemoTeacherAccountsApi,
} from './apiClient';
import {
  initializeDatabase,
  readDatabase,
  updateDatabaseItem,
} from './database';

export interface TeacherCredential {
  id: number;
  username: string;
  password?: string;
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
  password?: string;
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
  password?: string;
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
): Promise<{ success: boolean; teacher?: TeacherCredential; token?: string; error?: string }> => {
  try {
    const result = await authenticateApiAccount<TeacherCredential>('teacher', { username, password });
    return {
      success: result.success,
      teacher: result.teacher,
      token: result.token,
      error: result.error,
    };
  } catch (error) {
    console.error('Failed to authenticate teacher through API:', error);
    return { success: false, error: 'Unable to access the authentication service.' };
  }
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
): Promise<{ success: boolean; student?: StudentCredential; token?: string; error?: string }> => {
  try {
    const result = await authenticateApiAccount<StudentCredential>('student', { studentId, password });
    return {
      success: result.success,
      student: result.student,
      token: result.token,
      error: result.error,
    };
  } catch (error) {
    console.error('Failed to authenticate student through API:', error);
    return { success: false, error: 'Unable to access the authentication service.' };
  }
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
): Promise<{ success: boolean; admin?: AdminCredential; token?: string; error?: string }> => {
  try {
    const result = await authenticateApiAccount<AdminCredential>('admin', { username, password });
    return {
      success: result.success,
      admin: result.admin,
      token: result.token,
      error: result.error,
    };
  } catch (error) {
    console.error('Failed to authenticate admin through API:', error);
    return { success: false, error: 'Unable to access the authentication service.' };
  }
};

// Session management helpers
const TEACHER_SESSION_KEY = 'teacherAuth';
const STUDENT_SESSION_KEY = 'studentAuth';
const ADMIN_SESSION_KEY = 'adminAuth';

export const saveTeacherSession = (teacher: TeacherCredential, token?: string) => {
  const sessionData = {
    id: teacher.id,
    username: teacher.username,
    displayName: teacher.displayName,
    initials: teacher.initials,
    department: teacher.department,
    position: teacher.position,
    employeeId: teacher.employeeId,
    email: teacher.email,
    subjects: teacher.subjects,
    advisoryClass: teacher.advisoryClass,
    token,
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
    return session.authenticated && session.token ? session : null;
  } catch {
    return null;
  }
};

export const clearTeacherSession = () => {
  localStorage.removeItem(TEACHER_SESSION_KEY);
};

export const saveStudentSession = (student: StudentCredential, token?: string) => {
  const sessionData = {
    id: student.id,
    studentId: student.studentId,
    displayName: student.displayName,
    initials: student.initials,
    gradeLevel: student.gradeLevel,
    section: student.section,
    email: student.email,
    lrn: student.lrn,
    token,
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
    return session.authenticated && session.token ? session : null;
  } catch {
    return null;
  }
};

export const clearStudentSession = () => {
  localStorage.removeItem(STUDENT_SESSION_KEY);
};

export const saveAdminSession = (admin: AdminCredential, token?: string) => {
  const sessionData = {
    id: admin.id,
    displayName: admin.displayName,
    initials: admin.initials,
    role: admin.role,
    email: admin.email,
    token,
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
    return session.authenticated && session.token ? session : null;
  } catch {
    return null;
  }
};

export const clearAdminSession = () => {
  localStorage.removeItem(ADMIN_SESSION_KEY);
};

// Get all teacher accounts (for demo account display)
export const getTeacherAccounts = (): Pick<TeacherCredential, 'username' | 'displayName' | 'department' | 'position'>[] => {
  const db = ensureDB();
  if (!db || !db.teachers) return [];
  return db.teachers
    .filter((t) => t.status === 'active')
    .map((t) => ({
      username: t.username,
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

export const getTeacherAccountsOnline = async () => {
  try {
    return await getDemoTeacherAccountsApi<ReturnType<typeof getTeacherAccounts>[number]>();
  } catch (error) {
    console.error('Failed to load teacher account list from API:', error);
    return getTeacherAccounts();
  }
};

export const getStudentAccountsOnline = async () => {
  try {
    return await getDemoStudentAccountsApi<ReturnType<typeof getStudentAccounts>[number]>();
  } catch (error) {
    console.error('Failed to load student account list from API:', error);
    return getStudentAccounts();
  }
};
