/**
 * Shared Student Data Layer
 * ─────────────────────────
 * Single source of truth for student data across all Principal components.
 * Loads roster data from the cloud-backed database cache, merges any new
 * registrations, and provides helper functions for both
 * PrincipalRegistration and PrincipalTeachers.
 */

import { getAccounts } from './apiClient';
import { readDatabase, writeDatabase } from './database';

/* ═══════════════════ Types ═══════════════════ */

export interface StudentRecord {
  id: string;
  studentId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName: string;
  displayName: string;
  gender: 'M' | 'F';
  dateOfBirth: string;
  gradeLevel: string;
  section: string;
  guardianName: string;
  guardianContact: string;
  guardianRelationship: string;
  guardianEmail: string;
  guardianOccupation: string;
  address: string;
  email: string;
  enrollmentDate: string;
  yearEnrolled: number;
  previousSchool: string | null;
  academicStatus: 'regular' | 'at-risk' | 'watch';
  honorsStatus: string | null;
  gwa: number;
  remarks: string | null;
  status: 'active' | 'inactive';
  batch: string;
}

/** Lightweight student reference for teacher subject enrollment */
export interface StudentPoolEntry {
  id: string;
  studentId: string;
  name: string;          // "LastName, FirstName M."
  gradeLevel: string;
  section: string;
  gender: 'M' | 'F';
}

export interface TeacherInfo {
  username: string;
  displayName: string;
  department: string;
  employeeId: string;
  assignments: {
    subjectId: string;
    subjectName: string;
    yearLevel: string;
    section: string;
    schedule: string;
  }[];
}

export interface GradeSectionGroup {
  gradeLevel: string;
  section: string;
  students: StudentPoolEntry[];
  label: string;         // e.g. "Grade 7 - Section A"
}

/* ═══════════════════ Constants ═══════════════════ */
const CURRENT_BATCH = '2025-2026';
const GRADE_LEVELS = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
const SECTIONS_MAP: Record<string, string[]> = {
  'Grade 6': ['Section A'],
  'Grade 7': ['Section A', 'Section B'],
  'Grade 8': ['Section A', 'Section B'],
  'Grade 9': ['Section A'],
  'Grade 10': ['Section A'],
};

/* ═══════════════════ Internal helpers ═══════════════════ */

function mapCloudStudent(s: any): StudentRecord {
  if (s?.id && s?.studentId && s?.batch) {
    return s as StudentRecord;
  }

  return {
    id: `json-${s.id}`,
    studentId: s.studentId,
    lrn: s.lrn || '',
    firstName: s.firstName,
    lastName: s.lastName,
    middleName: s.middleName || '',
    displayName: s.displayName || `${s.firstName} ${s.lastName}`,
    gender: s.gender as 'M' | 'F',
    dateOfBirth: s.dateOfBirth || '',
    gradeLevel: s.gradeLevel,
    section: s.section,
    guardianName: s.guardian?.name || '',
    guardianContact: s.guardian?.contact || '',
    guardianRelationship: s.guardian?.relationship || '',
    guardianEmail: s.guardian?.email || '',
    guardianOccupation: s.guardian?.occupation || '',
    address: s.address || s.guardian?.address || '',
    email: s.email || '',
    enrollmentDate: s.enrollmentDate || '',
    yearEnrolled: s.yearEnrolled || 0,
    previousSchool: s.previousSchool || null,
    academicStatus: (s.academicStatus || 'regular') as any,
    honorsStatus: s.honorsStatus || null,
    gwa: s.gwa || 0,
    remarks: s.remarks || null,
    status: (s.status || 'active') as any,
    batch: CURRENT_BATCH,
  };
}

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] || '', lastName: '' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

function normalizeGender(value: unknown): 'M' | 'F' {
  const text = String(value || '').trim().toLowerCase();
  return text.startsWith('f') ? 'F' : 'M';
}

function mapAccountStudent(user: any): StudentRecord {
  const nameParts = splitDisplayName(user.displayName || user.username || '');
  const firstName = user.firstName || nameParts.firstName || user.displayName || user.username || '';
  const lastName = user.lastName || nameParts.lastName || '';
  const displayName = user.displayName || `${firstName} ${lastName}`.trim();
  const studentId = user.studentCode || user.username || user.systemId || user.uid;

  return {
    id: user.uid || studentId,
    studentId,
    lrn: user.lrn || '',
    firstName,
    lastName,
    middleName: user.middleName || '',
    displayName,
    gender: normalizeGender(user.gender),
    dateOfBirth: user.dateOfBirth || '',
    gradeLevel: user.gradeLevel || '',
    section: user.section || '',
    guardianName: user.guardianName || user.emergencyContactName || '',
    guardianContact: user.guardianContact || user.emergencyContactNumber || '',
    guardianRelationship: user.guardianRelationship || '',
    guardianEmail: user.guardianEmail || '',
    guardianOccupation: user.guardianOccupation || '',
    address: user.address || [user.city, user.province].filter(Boolean).join(', '),
    email: user.email || '',
    enrollmentDate: user.enrollmentDate || user.createdAt || '',
    yearEnrolled: user.yearEnrolled || new Date(user.createdAt || Date.now()).getFullYear(),
    previousSchool: user.previousSchool || null,
    academicStatus: (user.academicStatus || 'regular') as any,
    honorsStatus: user.honorsStatus || null,
    gwa: user.gwa || 0,
    remarks: user.remarks || null,
    status: (user.status || 'active') as any,
    batch: user.batch || CURRENT_BATCH,
  };
}

function toPoolEntry(s: StudentRecord): StudentPoolEntry {
  const middleInitial = s.middleName ? ` ${s.middleName[0]}.` : '';
  return {
    id: s.id,
    studentId: s.studentId,
    name: `${s.lastName}, ${s.firstName}${middleInitial}`,
    gradeLevel: s.gradeLevel,
    section: s.section,
    gender: s.gender,
  };
}

function mergeStudentsIntoBase(students: StudentRecord[]): void {
  if (students.length === 0) return;

  const existing = loadBaseStudents();
  const byStudentId = new Map<string, StudentRecord>();
  existing.forEach((student) => byStudentId.set(student.studentId || student.id, student));
  students.forEach((student) => byStudentId.set(student.studentId || student.id, student));
  writeDatabase('students', { students: Array.from(byStudentId.values()) });
}

/* ═══════════════════ Load base data from cloud cache ═══════════════════ */

function loadBaseStudents(): StudentRecord[] {
  try {
    const data = readDatabase<{ students?: any[] }>('students');
    const raw = data?.students;
    if (!Array.isArray(raw)) return [];
    return raw.map(mapCloudStudent);
  } catch {
    return [];
  }
}

function loadNewRegistrations(): StudentRecord[] {
  try {
    const stored = readDatabase<{ students: StudentRecord[] }>('student_registrations');
    return stored?.students ?? [];
  } catch {
    return [];
  }
}

/* ═══════════════════ Public API ═══════════════════ */

/** Get ALL students (cloud roster + new registrations), deduped by studentId */
export function getAllStudents(batch?: string): StudentRecord[] {
  const base = loadBaseStudents();
  const added = loadNewRegistrations();

  // Merge: added students override base students with same studentId
  const byStudentId = new Map<string, StudentRecord>();
  base.forEach(s => byStudentId.set(s.studentId, s));
  added.forEach(s => byStudentId.set(s.studentId, s));

  let all = Array.from(byStudentId.values());

  if (batch) {
    all = all.filter(s => s.batch === batch);
  }

  return all.sort((a, b) => a.lastName.localeCompare(b.lastName));
}

/** Get active students only */
export function getActiveStudents(batch?: string): StudentRecord[] {
  return getAllStudents(batch).filter(s => s.status === 'active');
}

/** Get lightweight student pool for teacher enrollment */
export function getStudentPool(batch?: string): StudentPoolEntry[] {
  return getActiveStudents(batch || CURRENT_BATCH).map(toPoolEntry);
}

/** Get students grouped by Grade Level + Section */
export function getStudentsByGradeSection(batch?: string): GradeSectionGroup[] {
  const pool = getStudentPool(batch);
  const groups: GradeSectionGroup[] = [];

  const gradeLevels = Array.from(new Set([
    ...GRADE_LEVELS,
    ...pool.map((student) => student.gradeLevel).filter(Boolean),
  ])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const grade of gradeLevels) {
    const sections = Array.from(new Set([
      ...(SECTIONS_MAP[grade] || []),
      ...pool
        .filter((student) => student.gradeLevel === grade)
        .map((student) => student.section)
        .filter(Boolean),
    ])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const section of sections) {
      const students = pool
        .filter(s => s.gradeLevel === grade && s.section === section)
        .sort((a, b) => a.name.localeCompare(b.name));
      groups.push({
        gradeLevel: grade,
        section,
        students,
        label: `${grade} - ${section}`,
      });
    }
  }

  return groups;
}

export async function syncStudentAccountsToStudentData(): Promise<StudentRecord[]> {
  const pageSize = 100;
  let page = 1;
  const accountStudents: any[] = [];

  for (;;) {
    const result = await getAccounts({ role: 'student', page, pageSize });
    const users = result.users || [];
    accountStudents.push(...users);

    const total = result.total ?? accountStudents.length;
    if (accountStudents.length >= total || users.length < pageSize) break;
    page += 1;
  }

  const students = accountStudents.map(mapAccountStudent);
  mergeStudentsIntoBase(students);
  return getAllStudents();
}

/** Get students for a specific grade-section combo */
export function getStudentsInSection(gradeLevel: string, section: string, batch?: string): StudentPoolEntry[] {
  return getStudentPool(batch).filter(s => s.gradeLevel === gradeLevel && s.section === section);
}

/** Save a new registered student (added via PrincipalRegistration) */
export function registerStudent(student: StudentRecord): void {
  const existing = loadNewRegistrations();
  existing.push(student);
  writeDatabase('student_registrations', { students: existing });
}

/** Save the full list of new registrations (for bulk updates) */
export function saveRegistrations(students: StudentRecord[]): void {
  writeDatabase('student_registrations', { students });
}

/** Generate the next student ID */
export function generateNextStudentId(): string {
  const all = getAllStudents();
  const maxNum = Math.max(0, ...all.map(s => {
    const parts = s.studentId.split('-');
    return parseInt(parts[1] || '0', 10);
  }));
  return `2024-${String(maxNum + 1).padStart(4, '0')}`;
}

/** Get grade breakdown stats */
export function getGradeBreakdown(batch?: string): {
  level: string;
  count: number;
  male: number;
  female: number;
  sections: string[];
}[] {
  const active = getActiveStudents(batch || CURRENT_BATCH);
  return GRADE_LEVELS.map(gl => ({
    level: gl,
    count: active.filter(s => s.gradeLevel === gl).length,
    male: active.filter(s => s.gradeLevel === gl && s.gender === 'M').length,
    female: active.filter(s => s.gradeLevel === gl && s.gender === 'F').length,
    sections: SECTIONS_MAP[gl] || ['Section A'],
  }));
}

/** Load teacher info from the cloud-backed teachers table */
export function getTeachers(): TeacherInfo[] {
  try {
    const data = readDatabase<{ teachers?: any[] }>('teachers');
    const raw = data?.teachers;
    if (!Array.isArray(raw)) return [];
    return raw.map((t: any) => ({
      username: t.username,
      displayName: t.displayName,
      department: t.department,
      employeeId: t.employeeId,
      assignments: t.assignments || [],
    }));
  } catch {
    return [];
  }
}

/* ═══════════════════ Exports for constants ═══════════════════ */

export { GRADE_LEVELS, SECTIONS_MAP, CURRENT_BATCH };
export const YEAR_BATCHES = [CURRENT_BATCH, '2024-2025'];
