import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Plus, Pencil, Trash2, X, Check, Save, Star,
  ChevronDown, Users, Eye, RotateCcw, Award, FileText
} from 'lucide-react';

/* ═══════════════════ Types ═══════════════════ */
interface RubricCriterion { id: string; name: string; description: string; maxScore: number; weight: number; }
interface EvaluationRubric { id: string; name: string; description: string; criteria: RubricCriterion[]; status: 'active' | 'draft'; createdAt: string; }
interface TeacherEvaluation { id: string; teacherUsername: string; teacherName: string; rubricId: string; quarter: number; scores: Record<string, number>; comments: string; evaluatedAt: string; evaluatedBy: string; }

const STORAGE_KEY_RUBRICS = 'mmpns_principal_rubrics';
const STORAGE_KEY_EVALS = 'mmpns_principal_evaluations';

const TEACHERS = [
  { username: 'msantos', name: 'Prof. Santos', department: 'Technology' },
  { username: 'jreyes', name: 'Prof. Reyes', department: 'Mathematics' },
  { username: 'lgonzales', name: 'Prof. Gonzales', department: 'English' },
  { username: 'rcruz', name: 'Prof. Cruz', department: 'Science' },
  { username: 'amendiola', name: 'Prof. Mendiola', department: 'Social Studies' },
];

const DEFAULT_RUBRIC: EvaluationRubric = {
  id: 'default-rubric', name: 'DepEd Teaching Performance Rubric', description: 'Standard teacher evaluation criteria based on DepEd competency framework',
  criteria: [
    { id: 'c1', name: 'Content Knowledge & Pedagogy', description: 'Mastery of subject matter and effective teaching strategies', maxScore: 5, weight: 20 },
    { id: 'c2', name: 'Learning Environment', description: 'Creating a safe, inclusive, and engaging classroom', maxScore: 5, weight: 15 },
    { id: 'c3', name: 'Learner Diversity', description: 'Addressing diverse learning needs and styles', maxScore: 5, weight: 15 },
    { id: 'c4', name: 'Curriculum Planning', description: 'Effective lesson planning and curriculum development', maxScore: 5, weight: 15 },
    { id: 'c5', name: 'Assessment & Reporting', description: 'Fair assessment practices and timely grade submission', maxScore: 5, weight: 15 },
    { id: 'c6', name: 'Community & Engagement', description: 'Parent communication and school event participation', maxScore: 5, weight: 10 },
    { id: 'c7', name: 'Professional Growth', description: 'Continuous learning, certifications, and collaboration', maxScore: 5, weight: 10 },
  ],
  status: 'active', createdAt: '2025-06-01',
};

const DEFAULT_EVALS: TeacherEvaluation[] = [
  { id: 'e1', teacherUsername: 'msantos', teacherName: 'Prof. Santos', rubricId: 'default-rubric', quarter: 2, scores: { c1: 4, c2: 5, c3: 4, c4: 4, c5: 5, c6: 4, c7: 3 }, comments: 'Excellent tech integration. Continue professional development.', evaluatedAt: '2025-11-10', evaluatedBy: 'Sr. Catalina De Jesus' },
  { id: 'e2', teacherUsername: 'jreyes', teacherName: 'Prof. Reyes', rubricId: 'default-rubric', quarter: 2, scores: { c1: 5, c2: 4, c3: 4, c4: 5, c5: 4, c6: 3, c7: 4 }, comments: 'Outstanding content knowledge. Improve parent engagement.', evaluatedAt: '2025-11-10', evaluatedBy: 'Sr. Catalina De Jesus' },
  { id: 'e3', teacherUsername: 'lgonzales', teacherName: 'Prof. Gonzales', rubricId: 'default-rubric', quarter: 2, scores: { c1: 4, c2: 5, c3: 5, c4: 4, c5: 4, c6: 5, c7: 4 }, comments: 'Exceptional classroom management and student rapport.', evaluatedAt: '2025-11-11', evaluatedBy: 'Sr. Catalina De Jesus' },
  { id: 'e4', teacherUsername: 'rcruz', teacherName: 'Prof. Cruz', rubricId: 'default-rubric', quarter: 2, scores: { c1: 4, c2: 4, c3: 3, c4: 4, c5: 4, c6: 3, c7: 3 }, comments: 'Solid teaching. Encourage more differentiated instruction.', evaluatedAt: '2025-11-11', evaluatedBy: 'Sr. Catalina De Jesus' },
  { id: 'e5', teacherUsername: 'amendiola', teacherName: 'Prof. Mendiola', rubricId: 'default-rubric', quarter: 2, scores: { c1: 3, c2: 4, c3: 4, c4: 3, c5: 3, c6: 4, c7: 3 }, comments: 'Growing well as a new teacher. Needs mentoring in assessment design.', evaluatedAt: '2025-11-12', evaluatedBy: 'Sr. Catalina De Jesus' },
];

/* ═══════════════════ Modal Shell ═══════════════════ */
const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; maxW?: string }> = ({ open, onClose, children, maxW = 'max-w-lg' }) => (
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

export const PrincipalEvaluation: React.FC = () => {
  const [rubrics, setRubrics] = useState<EvaluationRubric[]>([]);
  const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'rubrics' | 'evaluate'>('overview');
  const [editingRubric, setEditingRubric] = useState<EvaluationRubric | null>(null);
  const [showRubricModal, setShowRubricModal] = useState(false);

  const [evalTeacher, setEvalTeacher] = useState('');
  const [evalQuarter, setEvalQuarter] = useState(3);
  const [evalRubricId, setEvalRubricId] = useState('');
  const [evalScores, setEvalScores] = useState<Record<string, number>>({});
  const [evalComments, setEvalComments] = useState('');

  const [rubricName, setRubricName] = useState('');
  const [rubricDesc, setRubricDesc] = useState('');
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);

  useEffect(() => {
    const savedR = localStorage.getItem(STORAGE_KEY_RUBRICS);
    const savedE = localStorage.getItem(STORAGE_KEY_EVALS);
    setRubrics(savedR ? JSON.parse(savedR) : [DEFAULT_RUBRIC]);
    setEvaluations(savedE ? JSON.parse(savedE) : DEFAULT_EVALS);
  }, []);

  const saveRubrics = (data: EvaluationRubric[]) => { setRubrics(data); localStorage.setItem(STORAGE_KEY_RUBRICS, JSON.stringify(data)); };
  const saveEvals = (data: TeacherEvaluation[]) => { setEvaluations(data); localStorage.setItem(STORAGE_KEY_EVALS, JSON.stringify(data)); };

  const computeOverall = (evalItem: TeacherEvaluation, rubric: EvaluationRubric | undefined) => {
    if (!rubric) return 0;
    let totalWeighted = 0, totalWeight = 0;
    rubric.criteria.forEach(c => { const score = evalItem.scores[c.id] || 0; totalWeighted += (score / c.maxScore) * c.weight; totalWeight += c.weight; });
    return totalWeight > 0 ? (totalWeighted / totalWeight) * 100 : 0;
  };

  const getRating = (pct: number) => {
    if (pct >= 90) return { label: 'Outstanding', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (pct >= 80) return { label: 'Very Satisfactory', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (pct >= 70) return { label: 'Satisfactory', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const handleSubmitEval = () => {
    if (!evalTeacher || !evalRubricId) return;
    const teacher = TEACHERS.find(t => t.username === evalTeacher);
    if (!teacher) return;
    saveEvals([...evaluations, { id: `eval-${Date.now()}`, teacherUsername: evalTeacher, teacherName: teacher.name, rubricId: evalRubricId, quarter: evalQuarter, scores: { ...evalScores }, comments: evalComments, evaluatedAt: new Date().toISOString().split('T')[0], evaluatedBy: 'Sr. Catalina De Jesus' }]);
    setEvalTeacher(''); setEvalScores({}); setEvalComments('');
  };

  const closeRubricModal = () => { setShowRubricModal(false); setEditingRubric(null); setRubricName(''); setRubricDesc(''); setRubricCriteria([]); };

  const handleSaveRubric = () => {
    if (!rubricName.trim() || rubricCriteria.length === 0) return;
    if (editingRubric) { saveRubrics(rubrics.map(r => r.id === editingRubric.id ? { ...r, name: rubricName, description: rubricDesc, criteria: rubricCriteria } : r)); }
    else { saveRubrics([...rubrics, { id: `rubric-${Date.now()}`, name: rubricName, description: rubricDesc, criteria: rubricCriteria, status: 'active', createdAt: new Date().toISOString().split('T')[0] }]); }
    closeRubricModal();
  };

  const addCriterion = () => { setRubricCriteria(prev => [...prev, { id: `c-${Date.now()}`, name: '', description: '', maxScore: 5, weight: 10 }]); };
  const openNewRubric = () => { setEditingRubric(null); setRubricName(''); setRubricDesc(''); setRubricCriteria([]); setShowRubricModal(true); };
  const openEditRubric = (r: EvaluationRubric) => { setEditingRubric(r); setRubricName(r.name); setRubricDesc(r.description); setRubricCriteria([...r.criteria]); setShowRubricModal(true); };

  const selectedRubric = rubrics.find(r => r.id === evalRubricId);

  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 px-1 pt-1 gap-0.5">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'rubrics', label: 'Rubrics' },
          { key: 'evaluate', label: 'New Evaluation' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'text-[#185C20] bg-[#185C20]/5' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {tab.label}
            {activeTab === tab.key && <motion.div layoutId="eval-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#185C20] rounded-full" />}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          <div className="px-4 lg:px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-800">Faculty Evaluation Results</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Latest evaluation scores per teacher</p>
          </div>
          <div className="divide-y divide-gray-100">
            {TEACHERS.map(teacher => {
              const latestEval = [...evaluations].filter(e => e.teacherUsername === teacher.username).sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt))[0];
              const rubric = latestEval ? rubrics.find(r => r.id === latestEval.rubricId) : undefined;
              const overall = latestEval && rubric ? computeOverall(latestEval, rubric) : 0;
              const rating = getRating(overall);
              return (
                <div key={teacher.username} className="flex items-center gap-3 px-4 lg:px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-9 h-9 rounded bg-[#185C20]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#185C20]">{teacher.name.split(' ').pop()?.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-800">{teacher.name}</p>
                    <p className="text-[10px] text-gray-400">{teacher.department} Department</p>
                  </div>
                  {latestEval ? (
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-bold tabular-nums ${rating.color}`}>{overall.toFixed(0)}%</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rating.bg} ${rating.color}`}>{rating.label}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-300 italic">Not yet evaluated</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Evaluation history */}
          <div className="border-t border-gray-200">
            <div className="px-4 lg:px-5 py-3 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">Evaluation History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Quarter</th>
                    <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rating</th>
                    <th className="text-left py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Comments</th>
                    <th className="text-center py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...evaluations].sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt)).map(ev => {
                    const rubric = rubrics.find(r => r.id === ev.rubricId);
                    const overall = computeOverall(ev, rubric);
                    const rating = getRating(overall);
                    return (
                      <tr key={ev.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-gray-700">{ev.teacherName}</td>
                        <td className="py-2.5 px-4 text-center">Q{ev.quarter}</td>
                        <td className="py-2.5 px-4 text-center"><span className={`font-bold ${rating.color}`}>{overall.toFixed(0)}%</span></td>
                        <td className="py-2.5 px-4 text-center"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rating.bg} ${rating.color}`}>{rating.label}</span></td>
                        <td className="py-2.5 px-4 text-gray-500 max-w-[200px] truncate hidden md:table-cell">{ev.comments}</td>
                        <td className="py-2.5 px-4 text-center text-gray-400">{ev.evaluatedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* RUBRICS TAB */}
      {activeTab === 'rubrics' && (
        <>
          <div className="px-4 lg:px-5 py-3 flex items-center justify-between border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-800">Evaluation Rubrics</h3>
            <button onClick={openNewRubric} className="flex items-center gap-1.5 px-4 py-2 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] transition-colors">
              <Plus size={14} /> New Rubric
            </button>
          </div>

          {rubrics.map((rubric, ri) => (
            <div key={rubric.id} className={ri > 0 ? 'border-t border-gray-200' : ''}>
              <div className="px-4 lg:px-5 py-3 flex items-center gap-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded bg-[#EDCD1F]/15 flex items-center justify-center flex-shrink-0">
                  <ClipboardList size={16} className="text-[#185C20]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{rubric.name}</p>
                  <p className="text-[10px] text-gray-400">{rubric.criteria.length} criteria &middot; Created {rubric.createdAt}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditRubric(rubric)} className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-[#185C20] transition-colors">
                    <Pencil size={14} />
                  </button>
                  {rubric.id !== 'default-rubric' && (
                    <button onClick={() => saveRubrics(rubrics.filter(r => r.id !== rubric.id))} className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="text-left py-2 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-8">#</th>
                    <th className="text-left py-2 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Criterion</th>
                    <th className="text-center py-2 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max</th>
                    <th className="text-center py-2 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {rubric.criteria.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50">
                      <td className="py-2 px-4 text-gray-300">{i + 1}</td>
                      <td className="py-2 px-4">
                        <p className="font-bold text-gray-700">{c.name}</p>
                        {c.description && <p className="text-[10px] text-gray-400 mt-0.5">{c.description}</p>}
                      </td>
                      <td className="py-2 px-4 text-center font-bold text-gray-600">{c.maxScore}</td>
                      <td className="py-2 px-4 text-center font-bold text-[#185C20]">{c.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {/* EVALUATE TAB */}
      {activeTab === 'evaluate' && (
        <div className="p-4 lg:p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Evaluate Teacher</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={evalTeacher} onChange={e => setEvalTeacher(e.target.value)} className="h-10 px-3 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15">
              <option value="">Select Teacher...</option>
              {TEACHERS.map(t => <option key={t.username} value={t.username}>{t.name} ({t.department})</option>)}
            </select>
            <select value={evalRubricId} onChange={e => { setEvalRubricId(e.target.value); setEvalScores({}); }} className="h-10 px-3 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15">
              <option value="">Select Rubric...</option>
              {rubrics.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={evalQuarter} onChange={e => setEvalQuarter(Number(e.target.value))} className="h-10 px-3 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15">
              {[1, 2, 3, 4].map(q => <option key={q} value={q}>Q{q}</option>)}
            </select>
          </div>

          {selectedRubric && evalTeacher && (
            <div className="space-y-2 mt-2">
              {selectedRubric.criteria.map(c => (
                <div key={c.id} className="p-3 bg-gray-50 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-gray-700">{c.name}</p>
                      <p className="text-[10px] text-gray-400">{c.description}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{c.weight}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: c.maxScore }, (_, i) => i + 1).map(score => (
                      <button key={score} onClick={() => setEvalScores(prev => ({ ...prev, [c.id]: score }))}
                        className={`w-10 h-10 rounded text-sm font-bold transition-all ${
                          evalScores[c.id] === score ? 'bg-[#185C20] text-[#EDCD1F] shadow-md shadow-[#185C20]/20'
                          : (evalScores[c.id] || 0) >= score ? 'bg-[#185C20]/10 text-[#185C20]'
                          : 'bg-white border border-gray-200 text-gray-400 hover:border-[#185C20]/30'
                        }`}>
                        {score}
                      </button>
                    ))}
                    <span className="text-[10px] text-gray-400 ml-2">/ {c.maxScore}</span>
                  </div>
                </div>
              ))}
              <textarea value={evalComments} onChange={e => setEvalComments(e.target.value)}
                placeholder="Comments and recommendations..."
                className="w-full h-24 px-3 py-2 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15 resize-none" />
              <div className="flex justify-end">
                <button onClick={handleSubmitEval} disabled={!evalTeacher || !evalRubricId || Object.keys(evalScores).length === 0}
                  className="h-10 px-6 bg-[#185C20] text-white rounded text-sm font-bold hover:bg-[#1a6925] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                  <Check size={16} /> Submit Evaluation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ RUBRIC CREATE / EDIT MODAL ═══════════ */}
      <Modal open={showRubricModal} onClose={closeRubricModal} maxW="max-w-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h4 className="text-sm font-bold text-gray-800">{editingRubric ? 'Edit Rubric' : 'New Evaluation Rubric'}</h4>
          <button onClick={closeRubricModal} className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={rubricName} onChange={e => setRubricName(e.target.value)} placeholder="Rubric Name" className="h-10 px-3 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15" />
            <input value={rubricDesc} onChange={e => setRubricDesc(e.target.value)} placeholder="Description" className="h-10 px-3 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600">Criteria</span>
              <button onClick={addCriterion} className="text-xs font-bold text-[#185C20] hover:underline flex items-center gap-1"><Plus size={12} /> Add</button>
            </div>
            <div className="space-y-1">
              {rubricCriteria.map((c, i) => (
                <div key={c.id} className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 mt-2.5 w-4 text-center">{i + 1}</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input value={c.name} onChange={e => setRubricCriteria(prev => prev.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))}
                      placeholder="Criterion name" className="h-9 px-2.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]/20 sm:col-span-2" />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">Max:</span>
                      <input type="number" value={c.maxScore} onChange={e => setRubricCriteria(prev => prev.map(x => x.id === c.id ? { ...x, maxScore: Number(e.target.value) } : x))}
                        min={1} max={10} className="h-9 w-14 text-center text-xs border border-gray-200 rounded bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">Wt:</span>
                      <input type="number" value={c.weight} onChange={e => setRubricCriteria(prev => prev.map(x => x.id === c.id ? { ...x, weight: Number(e.target.value) } : x))}
                        min={1} max={100} className="h-9 w-14 text-center text-xs border border-gray-200 rounded bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="text-[10px] text-gray-400">%</span>
                    </div>
                  </div>
                  <button onClick={() => setRubricCriteria(prev => prev.filter(x => x.id !== c.id))} className="text-gray-300 hover:text-red-400 mt-2 transition-colors"><Trash2 size={13} /></button>
                </div>
              ))}
              {rubricCriteria.length === 0 && <p className="text-xs text-gray-300 italic text-center py-4">Click &quot;Add&quot; above to add criteria</p>}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={closeRubricModal} className="h-9 px-4 bg-gray-100 text-gray-500 rounded text-xs font-bold hover:bg-gray-200">Cancel</button>
          <button onClick={handleSaveRubric} disabled={!rubricName.trim() || rubricCriteria.length === 0}
            className="h-9 px-5 bg-[#185C20] text-white rounded text-xs font-bold hover:bg-[#1a6925] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
            <Save size={13} /> Save Rubric
          </button>
        </div>
      </Modal>
    </div>
  );
};
