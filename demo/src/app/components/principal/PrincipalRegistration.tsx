import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus, X, Search, Users, Eye, School, Layers
} from 'lucide-react';
import {
  type StudentRecord,
  getAllStudents,
  getActiveStudents,
  registerStudent,
  generateNextStudentId,
  getGradeBreakdown,
  GRADE_LEVELS,
  SECTIONS_MAP,
  YEAR_BATCHES,
  CURRENT_BATCH,
} from '../../../utils/studentData';

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

export const PrincipalRegistration: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState(CURRENT_BATCH);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  // New student form
  const [showRegister, setShowRegister] = useState(false);
  const [formFirst, setFormFirst] = useState('');
  const [formLast, setFormLast] = useState('');
  const [formMiddle, setFormMiddle] = useState('');
  const [formGender, setFormGender] = useState<'M' | 'F'>('M');
  const [formDob, setFormDob] = useState('');
  const [formLrn, setFormLrn] = useState('');
  const [formGrade, setFormGrade] = useState('Grade 7');
  const [formSection, setFormSection] = useState('Section A');
  const [formGuardian, setFormGuardian] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPrevSchool, setFormPrevSchool] = useState('');

  // Load students from shared data layer
  const students = useMemo(() => getAllStudents(), [refreshKey]);

  const batchStudents = useMemo(() => {
    let result = students.filter(s => s.batch === selectedBatch && s.status === 'active');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.studentId.includes(q) ||
        (s.lrn && s.lrn.includes(q))
      );
    }
    if (filterGrade) result = result.filter(s => s.gradeLevel === filterGrade);
    if (filterSection) result = result.filter(s => s.section === filterSection);
    if (filterStatus) result = result.filter(s => s.academicStatus === filterStatus);
    
    // Sort
    return result.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === 'name') {
        comparison = a.lastName.localeCompare(b.lastName);
      } else if (sortConfig.key === 'id') {
        comparison = a.studentId.localeCompare(b.studentId);
      } else if (sortConfig.key === 'gwa') {
        comparison = (b.gwa || 0) - (a.gwa || 0); // Note: descending by default for GWA looks better, but we'll reverse if asc
      } else if (sortConfig.key === 'status') {
        comparison = a.academicStatus.localeCompare(b.academicStatus);
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [students, selectedBatch, searchQuery, filterGrade, filterSection, filterStatus, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const batchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    YEAR_BATCHES.forEach(b => { counts[b] = students.filter(s => s.batch === b && s.status === 'active').length; });
    return counts;
  }, [students]);

  const gradeBreakdown = useMemo(() => {
    const active = students.filter(s => s.batch === selectedBatch && s.status === 'active');
    return GRADE_LEVELS.map(gl => ({
      level: gl,
      count: active.filter(s => s.gradeLevel === gl).length,
      male: active.filter(s => s.gradeLevel === gl && s.gender === 'M').length,
      female: active.filter(s => s.gradeLevel === gl && s.gender === 'F').length,
    }));
  }, [students, selectedBatch]);

  // Available sections for selected grade
  const availableSections = useMemo(() => SECTIONS_MAP[formGrade] || ['Section A'], [formGrade]);

  // Reset section when grade changes and current section isn't available
  useEffect(() => {
    if (!availableSections.includes(formSection)) {
      setFormSection(availableSections[0]);
    }
  }, [formGrade, availableSections, formSection]);

  const handleRegister = () => {
    if (!formFirst.trim() || !formLast.trim()) return;
    const nextId = generateNextStudentId();
    const newStudent: StudentRecord = {
      id: `reg-${Date.now()}`,
      studentId: nextId,
      lrn: formLrn,
      firstName: formFirst.trim(),
      lastName: formLast.trim(),
      middleName: formMiddle.trim(),
      displayName: `${formFirst.trim()} ${formLast.trim()}`,
      gender: formGender,
      dateOfBirth: formDob,
      gradeLevel: formGrade,
      section: formSection,
      guardianName: formGuardian,
      guardianContact: formContact,
      guardianRelationship: '',
      guardianEmail: '',
      guardianOccupation: '',
      address: formAddress,
      email: '',
      enrollmentDate: new Date().toISOString().split('T')[0],
      yearEnrolled: new Date().getFullYear(),
      previousSchool: formPrevSchool || null,
      academicStatus: 'regular',
      honorsStatus: null,
      gwa: 0,
      remarks: null,
      status: 'active',
      batch: selectedBatch,
    };
    registerStudent(newStudent);
    setRefreshKey(k => k + 1); // trigger re-load
    resetForm();
  };

  const resetForm = () => {
    setFormFirst(''); setFormLast(''); setFormMiddle(''); setFormGender('M');
    setFormDob(''); setFormLrn(''); setFormGrade('Grade 7'); setFormSection('Section A');
    setFormGuardian(''); setFormContact(''); setFormAddress(''); setFormPrevSchool('');
    setShowRegister(false);
  };

  const statusColor = (s: string) =>
    s === 'at-risk' ? 'bg-red-50 text-red-600' : s === 'watch' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-5 py-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Students</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Enrolled students by school year &middot; Filter, search, and manage records
          </p>
        </div>
        <button onClick={() => setShowRegister(true)}
          className="self-start sm:self-center flex items-center gap-1.5 px-3 py-2 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] transition-colors">
          <UserPlus size={13} /> Add Student
        </button>
      </div>

      {/* Batch selector */}
      <div className="flex items-center border-b border-gray-200">
        {YEAR_BATCHES.map(batch => (
          <button key={batch} onClick={() => { setSelectedBatch(batch); setFilterGrade(''); setFilterSection(''); setFilterStatus(''); setSearchQuery(''); }}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all ${
              selectedBatch === batch ? 'text-[#185C20] bg-[#185C20]/5' : 'text-gray-400 hover:text-gray-600'
            }`}>
            <School size={13} />
            SY {batch}
            <span className={`text-[9px] px-1.5 py-0.5 rounded tabular-nums ${selectedBatch === batch ? 'bg-[#EDCD1F]/20 text-[#185C20]' : 'bg-gray-100 text-gray-400'}`}>
              {batchCounts[batch] || 0}
            </span>
            {selectedBatch === batch && <motion.div layoutId="batch-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#185C20]" />}
          </button>
        ))}
      </div>

      {/* Grade breakdown summary */}
      <div className="grid grid-cols-5 border-b border-gray-200">
        {gradeBreakdown.map((gl, i) => (
          <button key={gl.level} onClick={() => { setFilterGrade(filterGrade === gl.level ? '' : gl.level); setFilterSection(''); }}
            className={`px-3 py-2.5 text-center transition-all ${i < 4 ? 'border-r border-gray-200' : ''} ${
              filterGrade === gl.level ? 'bg-[#185C20]/5 shadow-inner' : 'hover:bg-gray-50/50'
            }`}>
            <p className="text-lg font-bold text-gray-800 tabular-nums">{gl.count}</p>
            <p className="text-[9px] text-gray-400">{gl.level.replace('Grade ', 'G')}</p>
            <p className="text-[8px] text-gray-300 mt-0.5">{gl.male}M / {gl.female}F</p>
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50/30 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search name, ID, or LRN..."
            className="w-full h-8 pl-8 pr-3 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
          <select 
            value={filterGrade} 
            onChange={e => { setFilterGrade(e.target.value); setFilterSection(''); }}
            className="h-8 px-2 bg-white border border-gray-200 rounded text-[11px] font-medium text-gray-600 focus:outline-none focus:border-[#185C20]"
          >
            <option value="">All Grades</option>
            {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select 
            value={filterSection} 
            onChange={e => setFilterSection(e.target.value)}
            disabled={!filterGrade}
            className="h-8 px-2 bg-white border border-gray-200 rounded text-[11px] font-medium text-gray-600 focus:outline-none focus:border-[#185C20] disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">All Sections</option>
            {filterGrade && SECTIONS_MAP[filterGrade]?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="h-8 px-2 bg-white border border-gray-200 rounded text-[11px] font-medium text-gray-600 focus:outline-none focus:border-[#185C20]"
          >
            <option value="">All Statuses</option>
            <option value="regular">Regular</option>
            <option value="watch">Watch</option>
            <option value="at-risk">At Risk</option>
          </select>

          {(filterGrade || filterSection || filterStatus || searchQuery) && (
            <button 
              onClick={() => { setFilterGrade(''); setFilterSection(''); setFilterStatus(''); setSearchQuery(''); }}
              className="h-8 px-2.5 text-[10px] font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
        
        <div className="text-[10px] font-bold text-gray-400 sm:ml-auto whitespace-nowrap">
          {batchStudents.length} student(s)
        </div>
      </div>

      {/* Student list */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="text-left py-2 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-8">#</th>
              <th 
                className="text-left py-2 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[150px] cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('id')}
              >
                ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gender</th>
              <th className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade</th>
              <th className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Section</th>
              <th 
                className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('gwa')}
              >
                GWA {sortConfig.key === 'gwa' && (sortConfig.direction === 'asc' ? '↓' : '↑')}
              </th>
              <th 
                className="text-center py-2 px-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
              >
                Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="py-2 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {batchStudents.map((s, idx) => (
              <tr key={s.id} onClick={() => setSelectedStudent(s)} className="border-b border-gray-100 hover:bg-gray-50/80 cursor-pointer transition-colors">
                <td className="py-2.5 px-4 text-gray-400 tabular-nums">{idx + 1}</td>
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${s.gender === 'M' ? 'bg-sky-50 text-sky-500' : 'bg-pink-50 text-pink-500'}`}>
                      {s.lastName[0]}
                    </div>
                    <span className="font-bold text-gray-700 truncate">{s.lastName}, {s.firstName} {s.middleName ? s.middleName[0] + '.' : ''}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center text-gray-500 font-mono hidden sm:table-cell">{s.studentId}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`text-[10px] font-bold ${s.gender === 'M' ? 'text-sky-500' : 'text-pink-500'}`}>{s.gender}</span>
                </td>
                <td className="py-2.5 px-3 text-center text-gray-700 font-bold">{s.gradeLevel.replace('Grade ', 'G')}</td>
                <td className="py-2.5 px-3 text-center text-gray-600 hidden md:table-cell">{s.section.replace('Section ', 'Sec ')}</td>
                <td className="py-2.5 px-3 text-center">
                  {s.gwa > 0 ? (
                    <span className={`font-bold tabular-nums ${s.gwa >= 90 ? 'text-emerald-600' : s.gwa >= 80 ? 'text-blue-600' : s.gwa >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                      {s.gwa.toFixed(1)}
                    </span>
                  ) : <span className="text-gray-300">&mdash;</span>}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${statusColor(s.academicStatus)}`}>
                    {s.academicStatus === 'at-risk' ? 'At Risk' : s.academicStatus === 'watch' ? 'Watch' : 'Regular'}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); }} className="text-gray-400 hover:text-[#185C20] transition-colors p-1">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {batchStudents.length === 0 && (
          <div className="py-12 text-center text-gray-300">
            <Users size={28} className="mx-auto mb-2" />
            <p className="text-sm font-bold">No students found</p>
          </div>
        )}
      </div>

      {/* ═══════════ STUDENT DETAIL MODAL ═══════════ */}
      <Modal open={!!selectedStudent} onClose={() => setSelectedStudent(null)}>
        {selectedStudent && (
          <>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
              <div className={`w-10 h-10 rounded flex items-center justify-center text-sm font-bold flex-shrink-0 ${selectedStudent.gender === 'M' ? 'bg-sky-100 text-sky-600' : 'bg-pink-100 text-pink-600'}`}>
                {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.middleName}</p>
                <p className="text-[10px] text-gray-400">{selectedStudent.studentId} &middot; LRN: {selectedStudent.lrn || 'N/A'}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${statusColor(selectedStudent.academicStatus)}`}>
                {selectedStudent.academicStatus === 'at-risk' ? 'At Risk' : selectedStudent.academicStatus === 'watch' ? 'Watch' : 'Regular'}
              </span>
              <button onClick={() => setSelectedStudent(null)} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px text-xs bg-gray-200">
                {[
                  { label: 'Grade Level', value: selectedStudent.gradeLevel },
                  { label: 'Section', value: selectedStudent.section },
                  { label: 'Gender', value: selectedStudent.gender === 'M' ? 'Male' : 'Female' },
                  { label: 'Date of Birth', value: selectedStudent.dateOfBirth || 'N/A' },
                  { label: 'Enrollment Date', value: selectedStudent.enrollmentDate },
                  { label: 'GWA', value: selectedStudent.gwa > 0 ? selectedStudent.gwa.toFixed(1) : 'N/A' },
                  { label: 'Guardian', value: selectedStudent.guardianName || 'N/A' },
                  { label: 'Contact', value: selectedStudent.guardianContact || 'N/A' },
                  { label: 'Batch', value: `SY ${selectedStudent.batch}` },
                  { label: 'Address', value: selectedStudent.address || 'N/A' },
                  { label: 'Previous School', value: selectedStudent.previousSchool || 'N/A' },
                  { label: 'Honors', value: selectedStudent.honorsStatus || 'N/A' },
                ].map((item, i) => (
                  <div key={i} className="p-2.5 bg-white">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="font-bold text-gray-700 truncate">{item.value}</p>
                  </div>
                ))}
              </div>
              {selectedStudent.remarks && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded">
                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-0.5">Remarks</p>
                  <p className="text-xs text-amber-700">{selectedStudent.remarks}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
              <button onClick={() => setSelectedStudent(null)} className="h-9 px-5 bg-gray-100 text-gray-600 rounded text-xs font-bold hover:bg-gray-200 transition-colors">Close</button>
            </div>
          </>
        )}
      </Modal>

      {/* ═══════════ REGISTER STUDENT MODAL ═══════════ */}
      <Modal open={showRegister} onClose={resetForm} maxW="max-w-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white">
          <div>
            <h4 className="text-sm font-bold text-gray-800">New Student Registration</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">School Year {selectedBatch}</p>
          </div>
          <button onClick={resetForm} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-5 space-y-6">
            
            {/* Personal Information */}
            <div className="bg-white border border-gray-200">
              <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-2">
                <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Personal Information</h5>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">First Name *</label>
                  <input value={formFirst} onChange={e => setFormFirst(e.target.value)} placeholder="e.g. Juan" className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Middle Name</label>
                  <input value={formMiddle} onChange={e => setFormMiddle(e.target.value)} placeholder="e.g. Santos" className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Last Name *</label>
                  <input value={formLast} onChange={e => setFormLast(e.target.value)} placeholder="e.g. Dela Cruz" className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Gender *</label>
                  <select value={formGender} onChange={e => setFormGender(e.target.value as any)} className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]">
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Date of Birth</label>
                  <input type="date" value={formDob} onChange={e => setFormDob(e.target.value)} className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white border border-gray-200">
              <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
                <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Academic Placement</h5>
                <span className="text-[9px] text-gray-400 font-medium">DepEd LIS Compatible</span>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Learner Reference Number (LRN)</label>
                  <input value={formLrn} onChange={e => setFormLrn(e.target.value)} placeholder="12-digit LRN" maxLength={12} className="w-full h-9 px-3 border border-gray-200 text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Grade Level *</label>
                  <select value={formGrade} onChange={e => setFormGrade(e.target.value)} className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]">
                    {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Section *</label>
                  <select value={formSection} onChange={e => setFormSection(e.target.value)} className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]">
                    {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Previous School Attended (If Transferee)</label>
                  <input value={formPrevSchool} onChange={e => setFormPrevSchool(e.target.value)} placeholder="Leave blank if not applicable" className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white border border-gray-200">
              <div className="bg-gray-100/50 border-b border-gray-200 px-4 py-2">
                <h5 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Contact & Guardian Info</h5>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Home Address</label>
                  <input value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="Complete residential address" className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Guardian's Full Name</label>
                  <input value={formGuardian} onChange={e => setFormGuardian(e.target.value)} placeholder="e.g. Maria Dela Cruz" className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Guardian's Contact Number</label>
                  <input value={formContact} onChange={e => setFormContact(e.target.value)} placeholder="e.g. 09123456789" className="w-full h-9 px-3 border border-gray-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20] focus:border-[#185C20]" />
                </div>
              </div>
            </div>

          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 bg-white flex justify-between items-center">
          <p className="text-[10px] text-gray-400 italic">* Indicates required fields</p>
          <div className="flex gap-2">
            <button onClick={resetForm} className="h-9 px-4 border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 text-xs font-bold transition-colors">Cancel</button>
            <button onClick={handleRegister} disabled={!formFirst.trim() || !formLast.trim()}
              className="h-9 px-5 bg-[#185C20] text-white text-xs font-bold hover:bg-[#1a6925] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
              <UserPlus size={13} /> Complete Registration
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
