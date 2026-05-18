/**
 * Shared Student Data Layer
 * ─────────────────────────
 * Single source of truth for student data across all Principal components.
 * Loads base data from /src/data/seeds/student.json, merges any new registrations
 * stored in localStorage, and provides helper functions for both
 * PrincipalRegistration and PrincipalTeachers.
 */

import studentJsonData from '../data/seeds/student.json';
import teacherJsonData from '../data/seeds/teacher.json';
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

function mapJsonStudent(s: any): StudentRecord {
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

/* ═══════════════════ Load base data from JSON ═══════════════════ */

function loadBaseStudents(): StudentRecord[] {
  try {
    const raw = (studentJsonData as any).students;
    if (!Array.isArray(raw)) return [];
    return raw.map(mapJsonStudent);
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

/** Get ALL students (base JSON + new registrations), deduped by studentId */
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

  for (const grade of GRADE_LEVELS) {
    const sections = SECTIONS_MAP[grade] || ['Section A'];
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

/** Load teacher info from teacher.json */
export function getTeachers(): TeacherInfo[] {
  try {
    const raw = (teacherJsonData as any).teachers;
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
