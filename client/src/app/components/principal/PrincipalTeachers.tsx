import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Plus, Trash2, X, Check, Users, ChevronRight,
  UserCheck, ArrowLeft, Search, CheckSquare, Square, MinusSquare,
  Layers, UsersRound
} from 'lucide-react';
import { loadMasterSubjects, type MasterSubject } from './PrincipalSubjects';
import {
  getStudentPool,
  getStudentsByGradeSection,
  type StudentPoolEntry,
  type GradeSectionGroup,
  getTeachers,
} from '../../../utils/studentData';

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
}

type AddMode = 'section' | 'individual';

const STORAGE_KEY = 'mmpns_teacher_records';
const STORAGE_VERSION_KEY = 'mmpns_teacher_records_v';
const CURRENT_VERSION = '2'; // Bump this to force re-initialization from JSON data

/* ═══════════════════ Build default teachers from teacher.json ═══════════════════ */
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
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

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
  const studentPool = useMemo(() => getStudentPool(), []);
  const gradeSectionGroups = useMemo(() => getStudentsByGradeSection(), []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (saved && savedVersion === CURRENT_VERSION) {
      setTeachers(JSON.parse(saved));
    } else {
      const defaults = buildDefaultTeachers();
      setTeachers(defaults);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
    }
    setMasterSubjects(loadMasterSubjects());
  }, []);

  // Re-load master subjects when returning to teacher list
  useEffect(() => {
    if (!selectedTeacher) {
      setMasterSubjects(loadMasterSubjects());
    }
  }, [selectedTeacher]);

  const save = (data: TeacherRecord[]) => { setTeachers(data); localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); };

  const teacher = teachers.find(t => t.username === selectedTeacher);

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
        <div className="px-4 lg:px-5 py-3 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">Teacher Management</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Click a teacher to manage their subject assignments and students &middot; Data from teacher.json + student.json</p>
        </div>
        <div className="divide-y divide-gray-100">
          {teachers.map(t => {
            const subjectNames = t.subjects
              .map(s => resolveSubject(s.subjectId)?.name || s.subjectId)
              .join(', ');
            return (
              <button key={t.username} onClick={() => setSelectedTeacher(t.username)}
                className="w-full flex items-center gap-3 px-4 lg:px-5 py-3 hover:bg-gray-50/50 transition-colors text-left">
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
                  <p className="text-sm font-bold text-[#185C20] tabular-nums">{totalStudents(t)}</p>
                  <p className="text-[9px] text-gray-400">student{totalStudents(t) !== 1 ? 's' : ''}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
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
        <button onClick={() => setShowAddSubject(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] transition-colors">
          <Plus size={13} /> Add Subject
        </button>
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