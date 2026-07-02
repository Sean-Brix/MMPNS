import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Plus, Trash2, X, Check, Users, ChevronRight,
  UserCheck, ArrowLeft, Search, CheckSquare, Square, MinusSquare,
  Layers, UsersRound, Pencil, AlertTriangle, UserPlus,
  RefreshCw, Copy, Eye, EyeOff, KeyRound, CheckCircle2,
} from 'lucide-react';
import { loadMasterSubjects, type MasterSubject } from './PrincipalSubjects';
import {
  getStudentPool,
  getStudentsByGradeSection,
  syncStudentAccountsToStudentData,
  type StudentPoolEntry,
  type GradeSectionGroup,
  getTeachers,
} from '../../../utils/studentData';
import { readDatabase, writeDatabase } from '../../../utils/database';
import { createAccount, updateAccountProfile, resetAccountPassword } from '../../../utils/apiClient';
import { Pagination } from '../registrar/shared';

/* ═══════════════════ Types ═══════════════════ */
interface AssignedSubject {
  subjectId: string;      // references MasterSubject.id
  students: { id: string; name: string; gradeLevel: string; section: string }[];
}

interface TeacherRecord {
  username: string;
  displayName: string;
  department: string;
  subjects: AssignedSubject[];
  uid?: string; // present for teachers with a real login account
}

type AddMode = 'section' | 'individual';

/* ═══════════════════ Credential generation ═══════════════════ */
const DEPARTMENTS = ['Kindergarten', 'Elementary', 'JHS'];

const TITLE_PREFIXES = new Set(['prof', 'mr', 'mrs', 'ms', 'dr', 'sr', 'fr', 'engr', 'atty']);
const slugifyNamePart = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');

function suggestTeacherUsername(displayName: string, taken: Set<string>): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter((word) => word && !TITLE_PREFIXES.has(word.toLowerCase().replace(/\.+$/, '')));
  const first = words[0] || 'teacher';
  const last = words[words.length - 1] || first;
  const base = slugifyNamePart(`${first[0] || ''}${last}`) || 'teacher';
  let candidate = base;
  let suffix = 1;
  while (taken.has(candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateTeacherPassword(length = 10): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join('');
}

/* ═══════════════════ Credential field (shared by add + reset password) ═══════════════════ */
const CredentialField: React.FC<{
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onRegenerate: () => void;
  maskable?: boolean;
  reveal?: boolean;
  onToggleReveal?: () => void;
}> = ({ label, value, onChange, onRegenerate, maskable = false, reveal = true, onToggleReveal }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={onChange ? (e) => onChange(e.target.value) : undefined}
            type={maskable && !reveal ? 'password' : 'text'}
            className={`w-full h-9 px-3 ${maskable ? 'pr-9' : ''} border border-gray-200 rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/40 transition-all font-mono`}
          />
          {maskable && (
            <button type="button" onClick={onToggleReveal} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {reveal ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
        </div>
        <button type="button" onClick={copy} title="Copy" className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
          {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        </button>
        <button type="button" onClick={onRegenerate} title="Generate new" className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════ Build default teachers from the cloud roster ═══════════════════ */
function buildDefaultTeachers(): TeacherRecord[] {
  const teachers = getTeachers();
  const pool = getStudentPool();

  return teachers.map(t => {
    // Group assignments by subjectId (a teacher may teach same subject to multiple sections)
    const subjectMap = new Map<string, AssignedSubject>();

    t.assignments.forEach(a => {
      if (!subjectMap.has(a.subjectId)) {
        subjectMap.set(a.subjectId, { subjectId: a.subjectId, students: [] });
      }
      // Auto-enroll all students in this grade-section
      const sectionStudents = pool.filter(
        s => s.gradeLevel === a.yearLevel && s.section === a.section
      );
      const existing = subjectMap.get(a.subjectId)!;
      const existingIds = new Set(existing.students.map(s => s.id));
      sectionStudents.forEach(s => {
        if (!existingIds.has(s.id)) {
          existing.students.push({ id: s.id, name: s.name, gradeLevel: s.gradeLevel, section: s.section });
          existingIds.add(s.id);
        }
      });
    });

    return {
      username: t.username,
      displayName: t.displayName,
      department: t.department,
      subjects: Array.from(subjectMap.values()),
    };
  });
}

/* ═══════════════════ Modal Shell ═══════════════════ */
const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; maxW?: string }> = ({ open, onClose, children, maxW = 'max-w-md' }) => (
  <AnimatePresence>
    {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          className={`bg-white rounded-lg shadow-2xl w-full ${maxW} max-h-[85vh] overflow-hidden flex flex-col`}
          onClick={e => e.stopPropagation()}>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ═══════════════════ Component ═══════════════════ */
export const PrincipalTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [masterSubjects, setMasterSubjects] = useState<MasterSubject[]>([]);
  const [teacherPage, setTeacherPage] = useState(1);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Teacher CRUD modals
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [confirmDeleteTeacher, setConfirmDeleteTeacher] = useState<TeacherRecord | null>(null);
  const [teacherForm, setTeacherForm] = useState({ displayName: '', username: '', department: '', password: '' });
  const [teacherFormError, setTeacherFormError] = useState('');
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string; displayName: string } | null>(null);
  const [revealPassword, setRevealPassword] = useState(false);

  // Password reset (edit teacher)
  const [resetPassword, setResetPassword] = useState('');
  const [revealResetPassword, setRevealResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetDone, setPasswordResetDone] = useState(false);

  // Add subject modal
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');

  // Add student modal
  const [addStudentToSubject, setAddStudentToSubject] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>('section');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState('All');
  const [addedToast, setAddedToast] = useState<{ count: number; mode: string } | null>(null);

  // Load student pool from shared data layer
  const [studentPool, setStudentPool] = useState<StudentPoolEntry[]>([]);
  const [gradeSectionGroups, setGradeSectionGroups] = useState<GradeSectionGroup[]>([]);

  const refreshStudentPool = useCallback(() => {
    setStudentPool(getStudentPool());
    setGradeSectionGroups(getStudentsByGradeSection());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setMasterSubjects(loadMasterSubjects());
      refreshStudentPool();
      try {
        await syncStudentAccountsToStudentData();
      } catch (error) {
        console.error('Failed to sync registered students for teacher assignment:', error);
      }
      if (cancelled) return;
      refreshStudentPool();

      const stored = readDatabase<{ teachers: TeacherRecord[] }>('teacher_records');
      if (stored?.teachers && stored.teachers.length > 0) {
        setTeachers(stored.teachers);
      } else {
        const defaults = buildDefaultTeachers();
        setTeachers(defaults);
        writeDatabase('teacher_records', { teachers: defaults });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshStudentPool]);

  // Re-load master subjects when returning to teacher list
  useEffect(() => {
    if (!selectedTeacher) {
      setMasterSubjects(loadMasterSubjects());
    }
  }, [selectedTeacher]);

  const save = (data: TeacherRecord[]) => { setTeachers(data); writeDatabase('teacher_records', { teachers: data }); };

  /* ── Teacher CRUD ── */
  const takenUsernames = () => new Set(teachers.map(t => t.username));

  const openAddTeacher = () => {
    setTeacherForm({ displayName: '', username: '', department: '', password: generateTeacherPassword() });
    setUsernameEdited(false);
    setTeacherFormError('');
    setCreatedCredentials(null);
    setRevealPassword(false);
    setShowAddTeacher(true);
  };

  const closeAddTeacher = () => {
    setShowAddTeacher(false);
    setCreatedCredentials(null);
  };

  const openEditTeacher = (t: TeacherRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setTeacherForm({ displayName: t.displayName, username: t.username, department: t.department, password: '' });
    setTeacherFormError('');
    setResetPassword(generateTeacherPassword());
    setRevealResetPassword(false);
    setPasswordResetDone(false);
    setEditingTeacher(t);
  };

  const closeEditTeacher = () => {
    setEditingTeacher(null);
    setPasswordResetDone(false);
    setTeacherFormError('');
  };

  const handleAddTeacher = async () => {
    if (isSavingTeacher) return;
    const { displayName, department, password } = teacherForm;
    const username = (teacherForm.username.trim() || suggestTeacherUsername(displayName, takenUsernames())).toLowerCase();
    if (!displayName.trim() || !username || !department.trim() || !password.trim()) {
      setTeacherFormError('All fields are required.');
      return;
    }
    if (password.trim().length < 6) {
      setTeacherFormError('Password must be at least 6 characters.');
      return;
    }
    if (takenUsernames().has(username)) {
      setTeacherFormError('Username already exists. Choose a different one.');
      return;
    }
    setIsSavingTeacher(true);
    setTeacherFormError('');
    try {
      const res = await createAccount({
        role: 'teacher',
        username,
        password,
        firstName: displayName.trim(),
        department,
      });
      const account = res.user;
      save([...teachers, {
        username: account.username,
        displayName: displayName.trim(),
        department: department.trim(),
        subjects: [],
        uid: account.uid,
      }]);
      setCreatedCredentials({ username: account.username, password, displayName: displayName.trim() });
    } catch (err: any) {
      setTeacherFormError(err?.message || 'Failed to create teacher account.');
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const handleEditTeacher = async () => {
    if (!editingTeacher || isSavingTeacher) return;
    const { displayName, department } = teacherForm;
    if (!displayName.trim() || !department.trim()) {
      setTeacherFormError('All fields are required.');
      return;
    }
    setIsSavingTeacher(true);
    setTeacherFormError('');
    try {
      if (editingTeacher.uid) {
        await updateAccountProfile(editingTeacher.uid, { firstName: displayName.trim(), department: department.trim() });
      }
      save(teachers.map(t => t.username !== editingTeacher.username ? t : { ...t, displayName: displayName.trim(), department: department.trim() }));
      closeEditTeacher();
    } catch (err: any) {
      setTeacherFormError(err?.message || 'Failed to update teacher.');
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editingTeacher?.uid || isResettingPassword) return;
    if (resetPassword.trim().length < 6) {
      setTeacherFormError('Password must be at least 6 characters.');
      return;
    }
    setIsResettingPassword(true);
    setTeacherFormError('');
    try {
      await resetAccountPassword(editingTeacher.uid, resetPassword.trim());
      setPasswordResetDone(true);
    } catch (err: any) {
      setTeacherFormError(err?.message || 'Failed to reset password.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteTeacher = () => {
    if (!confirmDeleteTeacher) return;
    if (selectedTeacher === confirmDeleteTeacher.username) {
      setSelectedTeacher(null);
      setExpandedSubject(null);
    }
    save(teachers.filter(t => t.username !== confirmDeleteTeacher.username));
    setConfirmDeleteTeacher(null);
  };

  const teacher = teachers.find(t => t.username === selectedTeacher);
  const TEACHER_PAGE_SIZE = 10;
  const teacherPageCount = Math.max(1, Math.ceil(teachers.length / TEACHER_PAGE_SIZE));
  const safeTeacherPage = Math.min(teacherPage, teacherPageCount);
  const pagedTeachers = teachers.slice(
    (safeTeacherPage - 1) * TEACHER_PAGE_SIZE,
    safeTeacherPage * TEACHER_PAGE_SIZE,
  );

  useEffect(() => {
    if (teacherPage > teacherPageCount) setTeacherPage(teacherPageCount);
  }, [teacherPage, teacherPageCount]);

  const resolveSubject = (subjectId: string): MasterSubject | undefined =>
    masterSubjects.find(s => s.id === subjectId);

  const totalStudents = (t: TeacherRecord) => {
    const ids = new Set<string>();
    t.subjects.forEach(s => s.students.forEach(st => ids.add(st.id)));
    return ids.size;
  };

  const handleAddSubject = () => {
    if (!selectedTeacher || !newSubjectId) return;
    save(teachers.map(t => {
      if (t.username !== selectedTeacher) return t;
      if (t.subjects.find(s => s.subjectId === newSubjectId)) return t;
      return { ...t, subjects: [...t.subjects, { subjectId: newSubjectId, students: [] }] };
    }));
    setNewSubjectId(''); setShowAddSubject(false);
  };

  const removeSubject = (subjectId: string) => {
    if (!selectedTeacher) return;
    save(teachers.map(t => t.username !== selectedTeacher ? t : { ...t, subjects: t.subjects.filter(s => s.subjectId !== subjectId) }));
    if (expandedSubject === subjectId) setExpandedSubject(null);
  };

  /* ── Add students (works for both section and individual mode) ── */
  const handleAddStudents = (studentIds: Set<string>) => {
    if (!selectedTeacher || !addStudentToSubject || studentIds.size === 0) return;
    const studentsToAdd = studentPool.filter(s => studentIds.has(s.id));
    if (studentsToAdd.length === 0) return;
    save(teachers.map(t => {
      if (t.username !== selectedTeacher) return t;
      return { ...t, subjects: t.subjects.map(s => {
        if (s.subjectId !== addStudentToSubject) return s;
        const existingIds = new Set(s.students.map(st => st.id));
        const newStudents = studentsToAdd.filter(st => !existingIds.has(st.id))
          .map(st => ({ id: st.id, name: st.name, gradeLevel: st.gradeLevel, section: st.section }));
        return { ...s, students: [...s.students, ...newStudents] };
      })};
    }));
    return studentsToAdd.length;
  };

  const handleAddIndividual = () => {
    const count = handleAddStudents(selectedStudentIds);
    setSelectedStudentIds(new Set()); setAddStudentToSubject(null);
    setStudentSearch(''); setStudentGradeFilter('All'); setAddMode('section');
    if (count) {
      setAddedToast({ count, mode: 'individual' });
      setTimeout(() => setAddedToast(null), 3000);
    }
  };

  const handleAddSection = (group: GradeSectionGroup, enrolledIds: Set<string>) => {
    const newIds = group.students.filter(s => !enrolledIds.has(s.id)).map(s => s.id);
    if (newIds.length === 0) return;
    const count = handleAddStudents(new Set(newIds));
    if (count) {
      setAddedToast({ count, mode: `${group.label}` });
      setTimeout(() => setAddedToast(null), 3000);
    }
    // Don't close modal so they can add more sections
  };

  const removeStudent = (subjectId: string, studentId: string) => {
    if (!selectedTeacher) return;
    save(teachers.map(t => {
      if (t.username !== selectedTeacher) return t;
      return { ...t, subjects: t.subjects.map(s => s.subjectId !== subjectId ? s : { ...s, students: s.students.filter(st => st.id !== studentId) }) };
    }));
  };

  /* ═══════════ TEACHER LIST VIEW ═══════════ */
  if (!selectedTeacher) {
    return (
      <div className="border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 lg:px-5 py-3 border-b border-gray-200 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800">Teacher Management</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Click a teacher to manage subject assignments and students</p>
          </div>
          <button onClick={openAddTeacher}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] transition-colors flex-shrink-0">
            <UserPlus size={13} /> Add Teacher
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {teachers.length === 0 && (
            <div className="py-12 text-center text-gray-300">
              <Users size={32} className="mx-auto mb-2" />
              <p className="text-sm font-bold">No teachers yet</p>
              <p className="text-[10px] text-gray-400 mt-1">Click "Add Teacher" to get started</p>
            </div>
          )}
          {pagedTeachers.map(t => {
            const subjectNames = t.subjects
              .map(s => resolveSubject(s.subjectId)?.name || s.subjectId)
              .join(', ');
            const stuCount = totalStudents(t);
            return (
              <div key={t.username} className="flex items-center gap-3 px-4 lg:px-5 py-3 hover:bg-gray-50/50 transition-colors group">
                <button onClick={() => setSelectedTeacher(t.username)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-10 h-10 rounded bg-[#185C20]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-[#185C20]">{t.displayName.split(' ').pop()?.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800">{t.displayName}</p>
                    <p className="text-[10px] text-gray-400 truncate">{t.department} &middot; {subjectNames || 'No subjects'}</p>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <p className="text-sm font-bold text-gray-700 tabular-nums">{t.subjects.length}</p>
                    <p className="text-[9px] text-gray-400">subject{t.subjects.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0 mr-2">
                    <p className="text-sm font-bold text-[#185C20] tabular-nums">{stuCount}</p>
                    <p className="text-[9px] text-gray-400">student{stuCount !== 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </button>
                {/* Row actions - visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={(e) => openEditTeacher(t, e)}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                    title="Edit teacher">
                    <Pencil size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteTeacher(t); }}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                    title="Delete teacher">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination
          page={safeTeacherPage}
          pageCount={teacherPageCount}
          totalItems={teachers.length}
          pageSize={TEACHER_PAGE_SIZE}
          onChange={setTeacherPage}
        />

        {/* ═══════════ ADD TEACHER MODAL ═══════════ */}
        <Modal open={showAddTeacher} onClose={closeAddTeacher}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h4 className="text-sm font-bold text-gray-800">{createdCredentials ? 'Teacher Account Created' : 'Add New Teacher'}</h4>
            <button onClick={closeAddTeacher} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
          </div>
          {createdCredentials ? (
            <>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded p-3">
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <p className="text-xs font-bold">{createdCredentials.displayName}'s login account is ready.</p>
                </div>
                <p className="text-[11px] text-gray-500">Share these credentials with the teacher. The password won't be shown again — reset it anytime from Edit Teacher.</p>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                  <div className="h-9 px-3 border border-gray-100 rounded text-xs bg-gray-50 flex items-center font-mono text-gray-700">{createdCredentials.username}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                  <div className="h-9 px-3 border border-gray-100 rounded text-xs bg-gray-50 flex items-center font-mono text-gray-700">{createdCredentials.password}</div>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
                <button onClick={closeAddTeacher}
                  className="h-9 px-5 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] transition-colors flex items-center gap-1.5">
                  <Check size={13} /> Done
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Display Name <span className="text-red-400">*</span></label>
                  <input
                    value={teacherForm.displayName}
                    onChange={e => {
                      const displayName = e.target.value;
                      setTeacherForm(f => ({
                        ...f,
                        displayName,
                        username: usernameEdited ? f.username : suggestTeacherUsername(displayName, takenUsernames()),
                      }));
                    }}
                    placeholder="e.g. Prof. Santos"
                    className="w-full h-9 px-3 border border-gray-200 rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Department <span className="text-red-400">*</span></label>
                  <select
                    value={teacherForm.department}
                    onChange={e => setTeacherForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full h-9 px-3 border border-gray-200 rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/40 transition-all"
                  >
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <CredentialField
                  label="Username"
                  value={teacherForm.username}
                  onChange={(value) => { setUsernameEdited(true); setTeacherForm(f => ({ ...f, username: value })); }}
                  onRegenerate={() => { setUsernameEdited(true); setTeacherForm(f => ({ ...f, username: suggestTeacherUsername(f.displayName, takenUsernames()) })); }}
                />
                <p className="text-[10px] text-gray-400 -mt-3">Auto-generated from the display name. Used for login — you can edit it.</p>
                <CredentialField
                  label="Password"
                  value={teacherForm.password}
                  onChange={(value) => setTeacherForm(f => ({ ...f, password: value }))}
                  onRegenerate={() => setTeacherForm(f => ({ ...f, password: generateTeacherPassword() }))}
                  maskable
                  reveal={revealPassword}
                  onToggleReveal={() => setRevealPassword(v => !v)}
                />
                <p className="text-[10px] text-gray-400 -mt-3">Auto-generated. Share it with the teacher after creating the account, or edit it here.</p>
                {teacherFormError && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12} /> {teacherFormError}</p>
                )}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
                <button onClick={closeAddTeacher} className="h-9 px-4 bg-gray-100 text-gray-500 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
                <button onClick={handleAddTeacher} disabled={isSavingTeacher}
                  className="h-9 px-5 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] disabled:opacity-50 transition-colors flex items-center gap-1.5">
                  <UserPlus size={13} /> {isSavingTeacher ? 'Creating...' : 'Add Teacher'}
                </button>
              </div>
            </>
          )}
        </Modal>

        {/* ═══════════ EDIT TEACHER MODAL ═══════════ */}
        <Modal open={!!editingTeacher} onClose={closeEditTeacher}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h4 className="text-sm font-bold text-gray-800">Edit Teacher</h4>
            <button onClick={closeEditTeacher} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
              <div className="h-9 px-3 border border-gray-100 rounded text-xs bg-gray-50 flex items-center font-mono text-gray-400">{editingTeacher?.username}</div>
              <p className="text-[10px] text-gray-400 mt-1">Username cannot be changed.</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Display Name <span className="text-red-400">*</span></label>
              <input
                value={teacherForm.displayName}
                onChange={e => setTeacherForm(f => ({ ...f, displayName: e.target.value }))}
                className="w-full h-9 px-3 border border-gray-200 rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Department <span className="text-red-400">*</span></label>
              <select
                value={teacherForm.department}
                onChange={e => setTeacherForm(f => ({ ...f, department: e.target.value }))}
                className="w-full h-9 px-3 border border-gray-200 rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/40 transition-all"
              >
                <option value="">Select department...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {editingTeacher?.uid ? (
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><KeyRound size={12} /> Reset Password</p>
                <CredentialField
                  label="New Password"
                  value={resetPassword}
                  onChange={(value) => { setResetPassword(value); setPasswordResetDone(false); }}
                  onRegenerate={() => { setResetPassword(generateTeacherPassword()); setPasswordResetDone(false); }}
                  maskable
                  reveal={revealResetPassword}
                  onToggleReveal={() => setRevealResetPassword(v => !v)}
                />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleResetPassword} disabled={isResettingPassword}
                    className="h-8 px-3 bg-gray-800 text-white rounded text-[11px] font-bold hover:bg-gray-900 disabled:opacity-50 transition-colors">
                    {isResettingPassword ? 'Saving...' : 'Update Password'}
                  </button>
                  {passwordResetDone && (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><Check size={12} /> Password updated</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-3">This teacher isn't linked to a login account yet.</p>
            )}
            {teacherFormError && (
              <p className="text-[11px] text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12} /> {teacherFormError}</p>
            )}
          </div>
          <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
            <button onClick={closeEditTeacher} className="h-9 px-4 bg-gray-100 text-gray-500 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
            <button onClick={handleEditTeacher} disabled={isSavingTeacher}
              className="h-9 px-5 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] disabled:opacity-50 transition-colors flex items-center gap-1.5">
              <Check size={13} /> {isSavingTeacher ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </Modal>

        {/* ═══════════ DELETE TEACHER CONFIRMATION ═══════════ */}
        {confirmDeleteTeacher && (
          <Modal open={!!confirmDeleteTeacher} onClose={() => setConfirmDeleteTeacher(null)}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <h4 className="text-sm font-bold text-red-700">Remove Teacher</h4>
              </div>
              <button onClick={() => setConfirmDeleteTeacher(null)} className="w-8 h-8 flex items-center justify-center rounded text-red-300 hover:bg-red-100 hover:text-red-500 transition-colors"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">
                You are about to permanently remove <span className="font-bold">{confirmDeleteTeacher.displayName}</span> from the system.
              </p>
              <div className="border border-red-100 rounded bg-red-50/60 p-3 space-y-2">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">This will also delete:</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={11} className="text-red-500" />
                  </div>
                  <p className="text-xs text-gray-700">
                    <span className="font-bold">{confirmDeleteTeacher.subjects.length}</span> subject assignment{confirmDeleteTeacher.subjects.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                    <Users size={11} className="text-red-500" />
                  </div>
                  <p className="text-xs text-gray-700">
                    <span className="font-bold">{totalStudents(confirmDeleteTeacher)}</span> student enrollment{totalStudents(confirmDeleteTeacher) !== 1 ? 's' : ''} across all subjects
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">This action cannot be undone. Student records themselves are not affected — only this teacher's assignments are removed.</p>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteTeacher(null)} className="h-9 px-4 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
              <button onClick={handleDeleteTeacher}
                className="h-9 px-5 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1.5">
                <Trash2 size={13} /> Remove Teacher
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  /* ═══════════ TEACHER PROFILE VIEW ═══════════ */
  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      {/* Header with back */}
      <div className="px-4 lg:px-5 py-3 border-b border-gray-200 flex items-center gap-3">
        <button onClick={() => { setSelectedTeacher(null); setExpandedSubject(null); }}
          className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="w-10 h-10 rounded bg-[#185C20]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-[#185C20]">{teacher?.displayName.split(' ').pop()?.slice(0, 2).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800">{teacher?.displayName}</p>
          <p className="text-[10px] text-gray-400">{teacher?.department} Department &middot; {teacher?.subjects.length} subject{teacher?.subjects.length !== 1 ? 's' : ''} &middot; {teacher ? totalStudents(teacher) : 0} students</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => teacher && openEditTeacher(teacher, e)}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
            title="Edit teacher">
            <Pencil size={14} />
          </button>
          <button onClick={() => teacher && setConfirmDeleteTeacher(teacher)}
            className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-400 transition-colors"
            title="Remove teacher">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setShowAddSubject(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] transition-colors">
            <Plus size={13} /> Add Subject
          </button>
        </div>
      </div>

      {/* Subjects list */}
      {teacher?.subjects.length === 0 && (
        <div className="py-12 text-center text-gray-300">
          <BookOpen size={32} className="mx-auto mb-2" />
          <p className="text-sm font-bold">No subjects assigned</p>
          <p className="text-[10px] text-gray-400 mt-1">Click "Add Subject" to assign from the master subject list</p>
        </div>
      )}

      {teacher?.subjects.map(sub => {
        const masterSub = resolveSubject(sub.subjectId);
        const isExpanded = expandedSubject === sub.subjectId;

        // Group enrolled students by grade-section
        const enrolledBySection = sub.students.reduce<Record<string, typeof sub.students>>((acc, s) => {
          const key = `${s.gradeLevel} - ${s.section}`;
          (acc[key] = acc[key] || []).push(s);
          return acc;
        }, {});
        const sectionKeys = Object.keys(enrolledBySection).sort();

        return (
          <div key={sub.subjectId}>
            {/* Subject row */}
            <div className="flex items-center gap-3 px-4 lg:px-5 py-3 border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
              <button onClick={() => setExpandedSubject(isExpanded ? null : sub.subjectId)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${masterSub?.type === 'major' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                  <BookOpen size={14} className={masterSub?.type === 'major' ? 'text-blue-500' : 'text-purple-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800">{masterSub?.name || sub.subjectId}</p>
                    {masterSub && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${masterSub.type === 'major' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {masterSub.type.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400">
                    {sub.students.length} student{sub.students.length !== 1 ? 's' : ''}
                    {sectionKeys.length > 0 && <span> &middot; {sectionKeys.join(', ')}</span>}
                    {masterSub && <span> &middot; WW {masterSub.weights.writtenWork}% / PT {masterSub.weights.performanceTask}% / QA {masterSub.weights.quarterlyAssessment}%</span>}
                  </p>
                </div>
                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}>
                  <ChevronRight size={14} className="text-gray-300" />
                </motion.div>
              </button>
              <button onClick={() => removeSubject(sub.subjectId)} className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>

            {/* Expanded student list - grouped by section */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-gray-50/50 border-b border-gray-200">
                    <div className="px-4 lg:px-5 py-2 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Students in {masterSub?.name || sub.subjectId}</span>
                      <button onClick={() => { setAddStudentToSubject(sub.subjectId); setAddMode('section'); }}
                        className="flex items-center gap-1 text-[11px] font-bold text-[#185C20] hover:underline">
                        <Plus size={12} /> Add Students
                      </button>
                    </div>

                    {sub.students.length === 0 ? (
                      <div className="px-4 lg:px-5 py-6 text-center text-gray-300">
                        <Users size={20} className="mx-auto mb-1" />
                        <p className="text-[11px]">No students yet</p>
                        <p className="text-[10px] text-gray-300 mt-1">Use "Add Students" to enroll by section or individually</p>
                      </div>
                    ) : (
                      <div>
                        {sectionKeys.map(sectionKey => (
                          <div key={sectionKey}>
                            {/* Section sub-header */}
                            {sectionKeys.length > 1 && (
                              <div className="flex items-center gap-2 px-4 lg:px-5 py-1.5 bg-gray-100/60 border-b border-gray-100">
                                <Layers size={10} className="text-gray-400" />
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{sectionKey}</span>
                                <span className="text-[9px] text-gray-300">{enrolledBySection[sectionKey].length}</span>
                              </div>
                            )}
                            {enrolledBySection[sectionKey]
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map(st => (
                              <div key={st.id} className="flex items-center gap-3 px-4 lg:px-5 py-2 border-b border-gray-100/80">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[8px] font-bold text-gray-500">{st.name.split(',')[0]?.slice(0, 2).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-700 truncate">{st.name}</p>
                                </div>
                                <span className="text-[10px] text-gray-400 flex-shrink-0">{st.gradeLevel}</span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0 hidden sm:block">{st.section}</span>
                                <button onClick={() => removeStudent(sub.subjectId, st.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* ═══════════ ADD SUBJECT MODAL ═══════════ */}
      <Modal open={showAddSubject} onClose={() => { setShowAddSubject(false); setNewSubjectId(''); }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h4 className="text-sm font-bold text-gray-800">Assign Subject to {teacher?.displayName}</h4>
          <button onClick={() => { setShowAddSubject(false); setNewSubjectId(''); }} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select from Master Subject List</label>
          <div className="space-y-1 max-h-[350px] overflow-y-auto">
            {(() => {
              const assignedIds = teacher?.subjects.map(s => s.subjectId) || [];
              const available = masterSubjects.filter(ms => !assignedIds.includes(ms.id));
              if (available.length === 0) return <p className="text-xs text-gray-300 italic text-center py-4">All subjects already assigned</p>;
              return available.map(ms => (
                <button key={ms.id} onClick={() => setNewSubjectId(ms.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all border ${
                    newSubjectId === ms.id ? 'border-[#185C20] bg-[#185C20]/5' : 'border-gray-100 hover:border-gray-200'
                  }`}>
                  <div className={`w-7 h-7 rounded flex items-center justify-center ${ms.type === 'major' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                    <BookOpen size={12} className={ms.type === 'major' ? 'text-blue-500' : 'text-purple-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700">{ms.name}</p>
                    <p className="text-[10px] text-gray-400">WW {ms.weights.writtenWork}% / PT {ms.weights.performanceTask}% / QA {ms.weights.quarterlyAssessment}%</p>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ms.type === 'major' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {ms.type.toUpperCase()}
                  </span>
                  {newSubjectId === ms.id && <Check size={14} className="text-[#185C20]" />}
                </button>
              ));
            })()}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={() => { setShowAddSubject(false); setNewSubjectId(''); }} className="h-9 px-4 bg-gray-100 text-gray-500 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
          <button onClick={handleAddSubject} disabled={!newSubjectId}
            className="h-9 px-5 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
            <Plus size={13} /> Assign Subject
          </button>
        </div>
      </Modal>

      {/* ═══════════ ADD STUDENT MODAL (REDESIGNED) ═══════════ */}
      <Modal open={!!addStudentToSubject} onClose={() => { setAddStudentToSubject(null); setSelectedStudentIds(new Set()); setStudentSearch(''); setStudentGradeFilter('All'); setAddMode('section'); }} maxW="max-w-lg">
        {(() => {
          const currentSubject = teacher?.subjects.find(s => s.subjectId === addStudentToSubject);
          const enrolledIds = new Set(currentSubject?.students.map(s => s.id) || []);
          const subjectName = resolveSubject(addStudentToSubject || '')?.name || addStudentToSubject;

          const closeModal = () => {
            setAddStudentToSubject(null); setSelectedStudentIds(new Set());
            setStudentSearch(''); setStudentGradeFilter('All'); setAddMode('section');
          };

          return (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-gray-800">Add Students to {subjectName}</h4>
                  <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
                </div>
                <p className="text-[10px] text-gray-400">
                  {currentSubject?.students.length || 0} currently enrolled &middot; {studentPool.length} total students
                </p>
              </div>

              {/* Mode tabs */}
              <div className="flex border-b border-gray-200">
                <button onClick={() => setAddMode('section')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all relative ${
                    addMode === 'section' ? 'text-[#185C20]' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  <Layers size={13} /> By Section
                  {addMode === 'section' && <motion.div layoutId="add-mode-tab" className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#185C20]" />}
                </button>
                <button onClick={() => setAddMode('individual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all relative ${
                    addMode === 'individual' ? 'text-[#185C20]' : 'text-gray-400 hover:text-gray-600'
                  }`}>
                  <UsersRound size={13} /> Individual
                  {addMode === 'individual' && <motion.div layoutId="add-mode-tab" className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#185C20]" />}
                </button>
              </div>

              {/* ── SECTION MODE ── */}
              {addMode === 'section' && (
                <>
                  <div className="flex-1 overflow-y-auto" style={{ maxHeight: '380px' }}>
                    <div className="px-5 py-2">
                      <p className="text-[10px] text-gray-400 mb-2">Click a section to enroll all its students at once</p>
                    </div>
                    <div className="px-5 pb-4 space-y-1.5">
                      {gradeSectionGroups.map(group => {
                        const totalInSection = group.students.length;
                        if (totalInSection === 0) return null;

                        const alreadyEnrolled = group.students.filter(s => enrolledIds.has(s.id)).length;
                        const remaining = totalInSection - alreadyEnrolled;
                        const allEnrolled = remaining === 0;

                        return (
                          <div key={group.label}
                            className={`flex items-center gap-3 px-3 py-3 border transition-all ${
                              allEnrolled
                                ? 'border-emerald-100 bg-emerald-50/50'
                                : 'border-gray-100 hover:border-[#185C20]/30 hover:bg-[#185C20]/3'
                            }`}>
                            <div className={`w-9 h-9 rounded flex items-center justify-center flex-shrink-0 ${
                              allEnrolled ? 'bg-emerald-100' : 'bg-[#185C20]/10'
                            }`}>
                              {allEnrolled
                                ? <Check size={14} className="text-emerald-600" />
                                : <Layers size={14} className="text-[#185C20]" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold ${allEnrolled ? 'text-emerald-700' : 'text-gray-800'}`}>{group.label}</p>
                              <p className="text-[10px] text-gray-400">
                                {totalInSection} student{totalInSection !== 1 ? 's' : ''}
                                {alreadyEnrolled > 0 && !allEnrolled && (
                                  <span> &middot; <span className="text-emerald-500">{alreadyEnrolled} already enrolled</span></span>
                                )}
                                {allEnrolled && (
                                  <span className="text-emerald-500"> &middot; All enrolled</span>
                                )}
                              </p>
                            </div>
                            {!allEnrolled ? (
                              <button onClick={() => handleAddSection(group, enrolledIds)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#185C20] text-white rounded text-[11px] font-bold hover:bg-[#1a6925] transition-colors flex-shrink-0">
                                <Plus size={11} /> Add {remaining}
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-500 flex-shrink-0 px-2">
                                <Check size={14} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
                    <button onClick={closeModal} className="h-9 px-5 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200">Done</button>
                  </div>
                </>
              )}

              {/* ── INDIVIDUAL MODE ── */}
              {addMode === 'individual' && (() => {
                const available = studentPool.filter(s => !enrolledIds.has(s.id));
                const gradeLevels = ['All', ...Array.from(new Set(available.map(s => s.gradeLevel))).sort()];

                const filtered = available.filter(s => {
                  const matchesSearch = !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase());
                  const matchesGrade = studentGradeFilter === 'All' || s.gradeLevel === studentGradeFilter;
                  return matchesSearch && matchesGrade;
                });

                const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, s) => {
                  (acc[s.gradeLevel] = acc[s.gradeLevel] || []).push(s);
                  return acc;
                }, {});
                const sortedGrades = Object.keys(grouped).sort();

                const allFilteredIds = filtered.map(s => s.id);
                const allFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedStudentIds.has(id));
                const someFilteredSelected = allFilteredIds.some(id => selectedStudentIds.has(id));

                const toggleStudent = (id: string) => {
                  setSelectedStudentIds(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                };

                const toggleAll = () => {
                  if (allFilteredSelected) {
                    setSelectedStudentIds(prev => {
                      const next = new Set(prev);
                      allFilteredIds.forEach(id => next.delete(id));
                      return next;
                    });
                  } else {
                    setSelectedStudentIds(prev => {
                      const next = new Set(prev);
                      allFilteredIds.forEach(id => next.add(id));
                      return next;
                    });
                  }
                };

                return (
                  <>
                    {/* Search bar */}
                    <div className="px-5 pt-3 pb-1">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input
                          value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                          placeholder="Search by name..."
                          className="w-full h-9 pl-9 pr-8 border border-gray-200 rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/30 transition-all"
                        />
                        {studentSearch && (
                          <button onClick={() => setStudentSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Grade level filter tabs */}
                    <div className="px-5 pt-2 pb-1">
                      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                        {gradeLevels.map(gl => {
                          const count = gl === 'All' ? available.length : available.filter(s => s.gradeLevel === gl).length;
                          const isActive = studentGradeFilter === gl;
                          return (
                            <button key={gl} onClick={() => setStudentGradeFilter(gl)}
                              className={`flex-shrink-0 px-2.5 py-1.5 rounded text-[10px] font-bold transition-all border ${
                                isActive
                                  ? 'border-[#185C20]/30 bg-[#185C20]/8 text-[#185C20]'
                                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                              }`}>
                              {gl === 'All' ? 'All' : gl.replace('Grade ', 'G')}{' '}
                              <span className={isActive ? 'text-[#185C20]/60' : 'text-gray-300'}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Select all / none bar */}
                    {filtered.length > 0 && (
                      <div className="px-5 py-1.5 flex items-center justify-between">
                        <button onClick={toggleAll} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 hover:text-[#185C20] transition-colors">
                          {allFilteredSelected ? <CheckSquare size={14} className="text-[#185C20]" /> : someFilteredSelected ? <MinusSquare size={14} className="text-[#185C20]/50" /> : <Square size={14} />}
                          {allFilteredSelected ? 'Deselect All' : 'Select All'} ({filtered.length})
                        </button>
                        {selectedStudentIds.size > 0 && (
                          <span className="text-[10px] font-bold text-[#185C20] bg-[#185C20]/8 px-2 py-1 rounded-full">
                            {selectedStudentIds.size} selected
                          </span>
                        )}
                      </div>
                    )}

                    {/* Student list */}
                    <div className="flex-1 overflow-y-auto px-5 pb-3" style={{ maxHeight: '280px' }}>
                      {available.length === 0 ? (
                        <div className="text-center py-8 text-gray-300">
                          <Users size={24} className="mx-auto mb-2" />
                          <p className="text-xs font-bold">All students already enrolled</p>
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="text-center py-8 text-gray-300">
                          <Search size={20} className="mx-auto mb-2" />
                          <p className="text-xs font-bold">No students match your search</p>
                          <button onClick={() => { setStudentSearch(''); setStudentGradeFilter('All'); }} className="text-[11px] text-[#185C20] font-bold mt-2 hover:underline">Clear filters</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sortedGrades.map(grade => (
                            <div key={grade}>
                              {studentGradeFilter === 'All' && (
                                <div className="flex items-center gap-2 py-1.5 sticky top-0 bg-white z-[1]">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{grade}</span>
                                  <div className="flex-1 h-px bg-gray-100" />
                                  <span className="text-[9px] text-gray-300">{grouped[grade].length}</span>
                                </div>
                              )}
                              {grouped[grade].map(st => {
                                const isSelected = selectedStudentIds.has(st.id);
                                return (
                                  <button key={st.id} onClick={() => toggleStudent(st.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all rounded border ${
                                      isSelected ? 'border-[#185C20]/30 bg-[#185C20]/5' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                                    }`}>
                                    {isSelected
                                      ? <CheckSquare size={15} className="text-[#185C20] flex-shrink-0" />
                                      : <Square size={15} className="text-gray-300 flex-shrink-0" />
                                    }
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                      style={{ backgroundColor: isSelected ? '#185C20' + '18' : '#f3f4f6' }}>
                                      <span className={`text-[9px] font-bold ${isSelected ? 'text-[#185C20]' : 'text-gray-400'}`}>
                                        {st.name.split(',')[0]?.slice(0, 2).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-xs truncate ${isSelected ? 'font-bold text-[#185C20]' : 'font-bold text-gray-700'}`}>{st.name}</p>
                                      <p className="text-[10px] text-gray-400">{st.gradeLevel} &middot; {st.section}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-gray-400">
                        {selectedStudentIds.size > 0
                          ? <span className="text-[#185C20] font-bold">{selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''} selected</span>
                          : 'Click students or use "Select All"'
                        }
                      </div>
                      <div className="flex gap-2">
                        <button onClick={closeModal} className="h-9 px-4 bg-gray-100 text-gray-500 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
                        <button onClick={handleAddIndividual} disabled={selectedStudentIds.size === 0}
                          className="h-9 px-5 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                          <UserCheck size={13} /> Add {selectedStudentIds.size > 0 ? selectedStudentIds.size : ''} Student{selectedStudentIds.size !== 1 ? 's' : ''}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </>
          );
        })()}
      </Modal>

      {/* ═══════════ EDIT TEACHER MODAL (profile view) ═══════════ */}
      <Modal open={!!editingTeacher} onClose={closeEditTeacher}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h4 className="text-sm font-bold text-gray-800">Edit Teacher</h4>
          <button onClick={closeEditTeacher} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
            <div className="h-9 px-3 border border-gray-100 rounded text-xs bg-gray-50 flex items-center font-mono text-gray-400">{editingTeacher?.username}</div>
            <p className="text-[10px] text-gray-400 mt-1">Username cannot be changed.</p>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Display Name <span className="text-red-400">*</span></label>
            <input
              value={teacherForm.displayName}
              onChange={e => setTeacherForm(f => ({ ...f, displayName: e.target.value }))}
              className="w-full h-9 px-3 border border-gray-200 rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Department <span className="text-red-400">*</span></label>
            <select
              value={teacherForm.department}
              onChange={e => setTeacherForm(f => ({ ...f, department: e.target.value }))}
              className="w-full h-9 px-3 border border-gray-200 rounded text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 focus:border-[#185C20]/40 transition-all"
            >
              <option value="">Select department...</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {editingTeacher?.uid ? (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><KeyRound size={12} /> Reset Password</p>
              <CredentialField
                label="New Password"
                value={resetPassword}
                onChange={setResetPassword}
                onRegenerate={() => { setResetPassword(generateTeacherPassword()); setPasswordResetDone(false); }}
                reveal={revealResetPassword}
                onToggleReveal={() => setRevealResetPassword(v => !v)}
              />
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleResetPassword} disabled={isResettingPassword}
                  className="h-8 px-3 bg-gray-800 text-white rounded text-[11px] font-bold hover:bg-gray-900 disabled:opacity-50 transition-colors">
                  {isResettingPassword ? 'Saving...' : 'Update Password'}
                </button>
                {passwordResetDone && (
                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><Check size={12} /> Password updated</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-3">This teacher isn't linked to a login account yet.</p>
          )}
          {teacherFormError && (
            <p className="text-[11px] text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12} /> {teacherFormError}</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={closeEditTeacher} className="h-9 px-4 bg-gray-100 text-gray-500 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
          <button onClick={handleEditTeacher} disabled={isSavingTeacher}
            className="h-9 px-5 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] disabled:opacity-50 transition-colors flex items-center gap-1.5">
            <Check size={13} /> {isSavingTeacher ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* ═══════════ DELETE TEACHER CONFIRMATION (profile view) ═══════════ */}
      {confirmDeleteTeacher && (
        <Modal open={!!confirmDeleteTeacher} onClose={() => setConfirmDeleteTeacher(null)}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <h4 className="text-sm font-bold text-red-700">Remove Teacher</h4>
            </div>
            <button onClick={() => setConfirmDeleteTeacher(null)} className="w-8 h-8 flex items-center justify-center rounded text-red-300 hover:bg-red-100 hover:text-red-500 transition-colors"><X size={16} /></button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700">
              You are about to permanently remove <span className="font-bold">{confirmDeleteTeacher.displayName}</span> from the system.
            </p>
            <div className="border border-red-100 rounded bg-red-50/60 p-3 space-y-2">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">This will also delete:</p>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={11} className="text-red-500" />
                </div>
                <p className="text-xs text-gray-700">
                  <span className="font-bold">{confirmDeleteTeacher.subjects.length}</span> subject assignment{confirmDeleteTeacher.subjects.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Users size={11} className="text-red-500" />
                </div>
                <p className="text-xs text-gray-700">
                  <span className="font-bold">{totalStudents(confirmDeleteTeacher)}</span> student enrollment{totalStudents(confirmDeleteTeacher) !== 1 ? 's' : ''} across all subjects
                </p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">This action cannot be undone. Student records themselves are not affected — only this teacher's assignments are removed.</p>
          </div>
          <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
            <button onClick={() => setConfirmDeleteTeacher(null)} className="h-9 px-4 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
            <button onClick={handleDeleteTeacher}
              className="h-9 px-5 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1.5">
              <Trash2 size={13} /> Remove Teacher
            </button>
          </div>
        </Modal>
      )}

      {/* Toast for added students */}
      <AnimatePresence>
        {addedToast !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#185C20] text-white pl-3 pr-4 py-2.5 rounded-lg shadow-xl">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Check size={13} />
            </div>
            <div>
              <p className="text-xs font-bold">Added {addedToast.count} student{addedToast.count !== 1 ? 's' : ''} successfully</p>
              {addedToast.mode !== 'individual' && (
                <p className="text-[10px] text-white/70">{addedToast.mode}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
