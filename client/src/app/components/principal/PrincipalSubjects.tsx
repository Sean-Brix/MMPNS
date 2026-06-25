import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Plus, Trash2, X, Check, Pencil, Percent
} from 'lucide-react';
import { readDatabase, writeDatabase } from '../../../utils/database';
import { Pagination } from '../registrar/shared';

/* ═══════════════════ Types ═══════════════════ */
export interface MasterSubject {
  id: string;
  name: string;
  type: 'major' | 'minor';
  weights: {
    writtenWork: number;
    performanceTask: number;
    quarterlyAssessment: number;
  };
}

export const DEFAULT_SUBJECTS: MasterSubject[] = [
  { id: 'math', name: 'Mathematics', type: 'major', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'science', name: 'Science', type: 'major', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'english', name: 'English', type: 'major', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'filipino', name: 'Filipino', type: 'major', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'ap', name: 'Araling Panlipunan', type: 'minor', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'mapeh', name: 'MAPEH', type: 'minor', weights: { writtenWork: 20, performanceTask: 60, quarterlyAssessment: 20 } },
  { id: 'esp', name: 'ESP', type: 'minor', weights: { writtenWork: 30, performanceTask: 50, quarterlyAssessment: 20 } },
  { id: 'tle', name: 'TLE', type: 'minor', weights: { writtenWork: 20, performanceTask: 60, quarterlyAssessment: 20 } },
  { id: 'ict', name: 'ICT', type: 'minor', weights: { writtenWork: 20, performanceTask: 60, quarterlyAssessment: 20 } },
];

export function loadMasterSubjects(): MasterSubject[] {
  const stored = readDatabase<{ subjects: MasterSubject[] }>('master_subjects');
  if (stored?.subjects && stored.subjects.length > 0) return stored.subjects;
  return DEFAULT_SUBJECTS;
}

function saveMasterSubjects(subjects: MasterSubject[]): void {
  writeDatabase('master_subjects', { subjects });
}

/* ═══════════════════ Modal Shell ═══════════════════ */
const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({ open, onClose, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ═══════════════════ Component ═══════════════════ */
export const PrincipalSubjects: React.FC = () => {
  const [subjects, setSubjects] = useState<MasterSubject[]>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MasterSubject | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'major' | 'minor'>('major');
  const [formWW, setFormWW] = useState(30);
  const [formPT, setFormPT] = useState(50);
  const [formQA, setFormQA] = useState(20);

  useEffect(() => { setSubjects(loadMasterSubjects()); }, []);

  const save = (data: MasterSubject[]) => {
    setSubjects(data);
    saveMasterSubjects(data);
  };

  const weightTotal = formWW + formPT + formQA;
  const weightValid = weightTotal === 100;

  const openCreate = () => {
    setEditing(null);
    setFormName(''); setFormType('major'); setFormWW(30); setFormPT(50); setFormQA(20);
    setShowForm(true);
  };

  const openEdit = (sub: MasterSubject) => {
    setEditing(sub);
    setFormName(sub.name); setFormType(sub.type);
    setFormWW(sub.weights.writtenWork); setFormPT(sub.weights.performanceTask); setFormQA(sub.weights.quarterlyAssessment);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = () => {
    if (!formName.trim() || !weightValid) return;
    const entry: MasterSubject = {
      id: editing ? editing.id : formName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: formName.trim(),
      type: formType,
      weights: { writtenWork: formWW, performanceTask: formPT, quarterlyAssessment: formQA },
    };
    if (editing) {
      save(subjects.map(s => s.id === editing.id ? entry : s));
    } else {
      save([...subjects, entry]);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    save(subjects.filter(s => s.id !== id));
    setDeleteConfirm(null);
  };

  const majors = subjects.filter(s => s.type === 'major');
  const minors = subjects.filter(s => s.type === 'minor');
  const PAGE_SIZE = 10;
  const pageCount = Math.max(1, Math.ceil(subjects.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedSubjects = subjects.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-5 py-3 border-b border-gray-200 flex items-center gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-gray-800">Subject Management</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">{subjects.length} subject{subjects.length !== 1 ? 's' : ''} &middot; {majors.length} major &middot; {minors.length} minor</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] transition-colors">
          <Plus size={13} /> Add Subject
        </button>
      </div>

      {/* Subject list */}
      {subjects.length === 0 ? (
        <div className="py-12 text-center text-gray-300">
          <BookOpen size={32} className="mx-auto mb-2" />
          <p className="text-sm font-bold">No subjects yet</p>
          <p className="text-[10px] text-gray-400 mt-1">Click "Add Subject" to create one</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_1fr_48px] items-center px-4 lg:px-5 py-2 border-b border-gray-200 bg-gray-50/80">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subject Name</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Type</span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">GWA Computation (WW / PT / QA)</span>
            <span />
          </div>

          {/* Rows */}
          {pagedSubjects.map(sub => (
            <div key={sub.id} className="group">
              <div className="flex items-center gap-3 px-4 lg:px-5 py-3 border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                {/* Icon + name */}
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${sub.type === 'major' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                  <BookOpen size={14} className={sub.type === 'major' ? 'text-blue-500' : 'text-purple-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{sub.name}</p>
                  <p className="text-[10px] text-gray-400 sm:hidden">
                    {sub.type.toUpperCase()} &middot; WW {sub.weights.writtenWork}% / PT {sub.weights.performanceTask}% / QA {sub.weights.quarterlyAssessment}%
                  </p>
                </div>

                {/* Type badge – desktop */}
                <div className="hidden sm:flex w-[80px] justify-center">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sub.type === 'major' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {sub.type.toUpperCase()}
                  </span>
                </div>

                {/* Weights – desktop */}
                <div className="hidden sm:flex flex-1 items-center justify-center gap-1">
                  <WeightBar label="WW" value={sub.weights.writtenWork} color="bg-sky-400" />
                  <WeightBar label="PT" value={sub.weights.performanceTask} color="bg-emerald-400" />
                  <WeightBar label="QA" value={sub.weights.quarterlyAssessment} color="bg-amber-400" />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => openEdit(sub)}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors">
                    <Pencil size={13} />
                  </button>
                  {deleteConfirm === sub.id ? (
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => handleDelete(sub.id)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-gray-100 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(sub.id)}
                      className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Pagination
            page={safePage}
            pageCount={pageCount}
            totalItems={subjects.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}

      {/* ═══════════ CREATE / EDIT MODAL ═══════════ */}
      <Modal open={showForm} onClose={closeForm}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h4 className="text-sm font-bold text-gray-800">{editing ? 'Edit Subject' : 'Add New Subject'}</h4>
          <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subject Name</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Mathematics"
              className="w-full h-10 px-3 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15" />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
            <div className="flex gap-2">
              {(['major', 'minor'] as const).map(t => (
                <button key={t} onClick={() => setFormType(t)}
                  className={`flex-1 h-10 rounded text-xs font-bold transition-all border ${
                    formType === t
                      ? t === 'major' ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-purple-300 bg-purple-50 text-purple-600'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* GWA Computation */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              GWA Computation Format
            </label>
            <div className="space-y-3">
              <WeightInput label="Written Work (WW)" value={formWW} onChange={setFormWW} color="bg-sky-400" />
              <WeightInput label="Performance Task (PT)" value={formPT} onChange={setFormPT} color="bg-emerald-400" />
              <WeightInput label="Quarterly Assessment (QA)" value={formQA} onChange={setFormQA} color="bg-amber-400" />
            </div>

            {/* Total indicator */}
            <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded border ${
              weightValid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-1.5">
                <Percent size={12} className={weightValid ? 'text-emerald-500' : 'text-red-500'} />
                <span className={`text-[11px] font-bold ${weightValid ? 'text-emerald-600' : 'text-red-600'}`}>
                  Total: {weightTotal}%
                </span>
              </div>
              {weightValid ? (
                <span className="text-[10px] text-emerald-500 flex items-center gap-1"><Check size={12} /> Valid</span>
              ) : (
                <span className="text-[10px] text-red-500">Must equal 100%</span>
              )}
            </div>

            {/* Visual bar */}
            <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden flex">
              <div className="bg-sky-400 transition-all" style={{ width: `${formWW}%` }} />
              <div className="bg-emerald-400 transition-all" style={{ width: `${formPT}%` }} />
              <div className="bg-amber-400 transition-all" style={{ width: `${formQA}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-gray-400">WW {formWW}%</span>
              <span className="text-[8px] text-gray-400">PT {formPT}%</span>
              <span className="text-[8px] text-gray-400">QA {formQA}%</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={closeForm} className="h-9 px-4 bg-gray-100 text-gray-500 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
          <button onClick={handleSave} disabled={!formName.trim() || !weightValid}
            className="h-9 px-5 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
            <Check size={13} /> {editing ? 'Save Changes' : 'Create Subject'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════ Sub-components ═══════════════════ */
const WeightBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-1">
    <div className={`w-2 h-2 rounded-sm ${color}`} />
    <span className="text-[10px] text-gray-500 tabular-nums">{label} {value}%</span>
  </div>
);

const WeightInput: React.FC<{ label: string; value: number; onChange: (v: number) => void; color: string }> = ({ label, value, onChange, color }) => (
  <div className="flex items-center gap-3">
    <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
    <span className="text-xs text-gray-600 flex-1 min-w-0">{label}</span>
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(Math.max(0, value - 5))} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 text-sm">−</button>
      <input type="number" value={value} onChange={e => onChange(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
        className="w-14 h-7 text-center border border-gray-200 rounded text-xs font-bold tabular-nums bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15" />
      <button onClick={() => onChange(Math.min(100, value + 5))} className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 text-sm">+</button>
      <span className="text-[10px] text-gray-400 w-4">%</span>
    </div>
  </div>
);
