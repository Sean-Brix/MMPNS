import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ClipboardList, Plus, Pencil, Trash2, X, Check, Save,
  Award, FileText, BarChart3, TrendingUp, MessageSquare, Target
} from 'lucide-react';
import {
  computeEvaluationOverall,
  getEvaluationRating,
  getEvaluationTeachers,
  getLatestTeacherEvaluation,
  loadEvaluationRubrics,
  loadTeacherEvaluations,
  saveEvaluationRubrics,
  saveTeacherEvaluations,
  type EvaluationRubric,
  type RubricCriterion,
  type TeacherEvaluation,
} from '../../../utils/teacherEvaluations';

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
  const teachers = useMemo(() => getEvaluationTeachers(), []);
  const [rubrics, setRubrics] = useState<EvaluationRubric[]>([]);
  const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'rubrics' | 'evaluate'>('overview');
  const [selectedAnalyticsTeacher, setSelectedAnalyticsTeacher] = useState('');
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
    setRubrics(loadEvaluationRubrics());
    setEvaluations(loadTeacherEvaluations());
  }, []);

  useEffect(() => {
    if (!selectedAnalyticsTeacher && teachers.length > 0) {
      const firstEvaluatedTeacher = teachers.find((teacher) =>
        evaluations.some((evaluation) => evaluation.teacherUsername === teacher.username),
      );
      setSelectedAnalyticsTeacher(firstEvaluatedTeacher?.username || teachers[0].username);
    }
  }, [evaluations, selectedAnalyticsTeacher, teachers]);

  const saveRubrics = (data: EvaluationRubric[]) => {
    setRubrics(data);
    saveEvaluationRubrics(data);
  };

  const saveEvals = (data: TeacherEvaluation[]) => {
    setEvaluations(data);
    saveTeacherEvaluations(data);
  };

  const handleSubmitEval = () => {
    if (!evalTeacher || !evalRubricId) return;
    const teacher = teachers.find(t => t.username === evalTeacher);
    if (!teacher) return;

    saveEvals([
      ...evaluations,
      {
        id: `eval-${Date.now()}`,
        teacherUsername: evalTeacher,
        teacherName: teacher.name,
        rubricId: evalRubricId,
        quarter: evalQuarter,
        scores: { ...evalScores },
        comments: evalComments,
        evaluatedAt: new Date().toISOString().split('T')[0],
        evaluatedBy: 'Sr. Catalina De Jesus',
      },
    ]);
    setEvalTeacher('');
    setEvalScores({});
    setEvalComments('');
    setActiveTab('analytics');
    setSelectedAnalyticsTeacher(teacher.username);
  };

  const closeRubricModal = () => {
    setShowRubricModal(false);
    setEditingRubric(null);
    setRubricName('');
    setRubricDesc('');
    setRubricCriteria([]);
  };

  const handleSaveRubric = () => {
    if (!rubricName.trim() || rubricCriteria.length === 0) return;

    if (editingRubric) {
      saveRubrics(rubrics.map(r => r.id === editingRubric.id ? { ...r, name: rubricName, description: rubricDesc, criteria: rubricCriteria } : r));
    } else {
      saveRubrics([
        ...rubrics,
        {
          id: `rubric-${Date.now()}`,
          name: rubricName,
          description: rubricDesc,
          criteria: rubricCriteria,
          status: 'active',
          createdAt: new Date().toISOString().split('T')[0],
        },
      ]);
    }
    closeRubricModal();
  };

  const addCriterion = () => {
    setRubricCriteria(prev => [...prev, { id: `c-${Date.now()}`, name: '', description: '', maxScore: 5, weight: 10 }]);
  };

  const openNewRubric = () => {
    setEditingRubric(null);
    setRubricName('');
    setRubricDesc('');
    setRubricCriteria([]);
    setShowRubricModal(true);
  };

  const openEditRubric = (rubric: EvaluationRubric) => {
    setEditingRubric(rubric);
    setRubricName(rubric.name);
    setRubricDesc(rubric.description);
    setRubricCriteria([...rubric.criteria]);
    setShowRubricModal(true);
  };

  const selectedRubric = rubrics.find(r => r.id === evalRubricId);
  const analyticsTeacher = teachers.find((teacher) => teacher.username === selectedAnalyticsTeacher) || teachers[0];
  const teacherEvaluations = [...evaluations]
    .filter((evaluation) => evaluation.teacherUsername === analyticsTeacher?.username)
    .sort((a, b) => b.evaluatedAt.localeCompare(a.evaluatedAt));
  const latestAnalyticsEvaluation = teacherEvaluations[0];
  const latestRubric = latestAnalyticsEvaluation ? rubrics.find((rubric) => rubric.id === latestAnalyticsEvaluation.rubricId) : undefined;
  const latestOverall = latestAnalyticsEvaluation ? computeEvaluationOverall(latestAnalyticsEvaluation, latestRubric) : 0;
  const latestRating = getEvaluationRating(latestOverall);
  const averageOverall = teacherEvaluations.length > 0
    ? teacherEvaluations.reduce((sum, evaluation) => sum + computeEvaluationOverall(evaluation, rubrics.find((rubric) => rubric.id === evaluation.rubricId)), 0) / teacherEvaluations.length
    : 0;
  const previousOverall = teacherEvaluations[1]
    ? computeEvaluationOverall(teacherEvaluations[1], rubrics.find((rubric) => rubric.id === teacherEvaluations[1].rubricId))
    : null;
  const trendDelta = previousOverall === null ? null : latestOverall - previousOverall;
  const chronologicalEvaluations = [...teacherEvaluations].reverse();
  const latestCriterionScores = latestRubric && latestAnalyticsEvaluation
    ? latestRubric.criteria.map((criterion) => ({
      criterion,
      score: latestAnalyticsEvaluation.scores[criterion.id] || 0,
      pct: ((latestAnalyticsEvaluation.scores[criterion.id] || 0) / criterion.maxScore) * 100,
    }))
    : [];
  const strongestCriterion = [...latestCriterionScores].sort((a, b) => b.pct - a.pct)[0];
  const focusCriterion = [...latestCriterionScores].sort((a, b) => a.pct - b.pct)[0];

  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center border-b border-gray-200 px-1 pt-1 gap-0.5 overflow-x-auto">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'analytics', label: 'Analytics' },
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

      {activeTab === 'overview' && (
        <>
          <div className="px-4 lg:px-5 py-3 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-800">Faculty Evaluation Results</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Latest evaluation scores per teacher</p>
          </div>
          <div className="divide-y divide-gray-100">
            {teachers.map(teacher => {
              const latestEval = getLatestTeacherEvaluation(evaluations, teacher.username);
              const rubric = latestEval ? rubrics.find(r => r.id === latestEval.rubricId) : undefined;
              const overall = latestEval && rubric ? computeEvaluationOverall(latestEval, rubric) : 0;
              const rating = getEvaluationRating(overall);
              return (
                <button key={teacher.username} type="button" onClick={() => { setSelectedAnalyticsTeacher(teacher.username); setActiveTab('analytics'); }}
                  className="w-full flex items-center gap-3 px-4 lg:px-5 py-3 hover:bg-gray-50/50 transition-colors text-left">
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
                </button>
              );
            })}
          </div>

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
                    const overall = computeEvaluationOverall(ev, rubric);
                    const rating = getEvaluationRating(overall);
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

      {activeTab === 'analytics' && (
        <div className="p-4 lg:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Teacher Performance Analytics</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Review each teacher individually using the principal evaluation records</p>
            </div>
            <select value={selectedAnalyticsTeacher} onChange={e => setSelectedAnalyticsTeacher(e.target.value)}
              className="h-10 px-3 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15">
              {teachers.map(teacher => <option key={teacher.username} value={teacher.username}>{teacher.name} ({teacher.department})</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              {teachers.map(teacher => {
                const latestEval = getLatestTeacherEvaluation(evaluations, teacher.username);
                const rubric = latestEval ? rubrics.find(r => r.id === latestEval.rubricId) : undefined;
                const overall = latestEval ? computeEvaluationOverall(latestEval, rubric) : 0;
                const rating = getEvaluationRating(overall);
                const isActive = teacher.username === analyticsTeacher?.username;
                return (
                  <button key={teacher.username} type="button" onClick={() => setSelectedAnalyticsTeacher(teacher.username)}
                    className={`w-full flex items-center gap-3 px-3 py-3 border-b border-gray-100 last:border-b-0 text-left transition-colors ${
                      isActive ? 'bg-[#185C20] text-white' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-[#EDCD1F]' : 'bg-[#185C20]/10'}`}>
                      <span className={`text-[10px] font-bold ${isActive ? 'text-[#185C20]' : 'text-[#185C20]'}`}>{teacher.name.split(' ').pop()?.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{teacher.name}</p>
                      <p className={`text-[10px] truncate ${isActive ? 'text-white/55' : 'text-gray-400'}`}>{teacher.department}</p>
                    </div>
                    {latestEval && <span className={`text-xs font-bold ${isActive ? 'text-[#EDCD1F]' : rating.color}`}>{overall.toFixed(0)}%</span>}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className={`rounded-lg border ${latestRating.border} ${latestRating.bg} p-4 lg:p-5`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Selected Teacher</p>
                    <h4 className="text-xl font-bold text-gray-900 mt-1">{analyticsTeacher?.name || 'No teacher selected'}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{analyticsTeacher?.department} Department</p>
                  </div>
                  {latestAnalyticsEvaluation ? (
                    <div className="text-left sm:text-right">
                      <p className={`text-4xl font-bold tabular-nums ${latestRating.color}`}>{latestOverall.toFixed(0)}%</p>
                      <p className={`text-xs font-bold ${latestRating.color}`}>{latestRating.label}</p>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-gray-400">No evaluation yet</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Latest Score', value: latestAnalyticsEvaluation ? `${latestOverall.toFixed(0)}%` : '--', icon: Award },
                  { label: 'Average Score', value: teacherEvaluations.length ? `${averageOverall.toFixed(0)}%` : '--', icon: BarChart3 },
                  { label: 'Evaluations', value: String(teacherEvaluations.length), icon: FileText },
                  { label: 'Trend', value: trendDelta === null ? '--' : `${trendDelta >= 0 ? '+' : ''}${trendDelta.toFixed(1)}%`, icon: TrendingUp },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-lg border border-gray-100 bg-white p-4">
                      <Icon size={16} className="text-[#185C20] mb-2" />
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{item.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.label}</p>
                    </div>
                  );
                })}
              </div>

              {latestAnalyticsEvaluation && latestRubric ? (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Target size={15} className="text-[#185C20]" />
                        <h4 className="text-xs font-bold text-gray-700">Criterion Breakdown</h4>
                      </div>
                      <div className="space-y-3">
                        {latestCriterionScores.map(({ criterion, score, pct }) => (
                          <div key={criterion.id}>
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <p className="text-xs font-semibold text-gray-700 truncate">{criterion.name}</p>
                              <span className="text-[10px] font-bold text-gray-500">{score}/{criterion.maxScore}</span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className="h-full rounded-full bg-[#185C20]" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-100 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={15} className="text-[#185C20]" />
                        <h4 className="text-xs font-bold text-gray-700">Principal Notes</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Latest Comments</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{latestAnalyticsEvaluation.comments || 'No comments recorded.'}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-lg bg-emerald-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Strength</p>
                            <p className="text-xs font-semibold text-emerald-700">{strongestCriterion?.criterion.name || '--'}</p>
                          </div>
                          <div className="rounded-lg bg-amber-50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">Focus Area</p>
                            <p className="text-xs font-semibold text-amber-700">{focusCriterion?.criterion.name || '--'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-white p-4">
                    <h4 className="text-xs font-bold text-gray-700 mb-3">Performance Over Time</h4>
                    <div className="flex items-end gap-3 min-h-[120px] overflow-x-auto pb-1">
                      {chronologicalEvaluations.map((evaluation) => {
                        const rubric = rubrics.find((item) => item.id === evaluation.rubricId);
                        const score = computeEvaluationOverall(evaluation, rubric);
                        return (
                          <div key={evaluation.id} className="flex flex-col items-center gap-2 min-w-[70px]">
                            <div className="h-24 flex items-end">
                              <div className="w-9 rounded-t bg-[#185C20]" style={{ height: `${Math.max(score, 8)}%` }} />
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] font-bold text-gray-700">{score.toFixed(0)}%</p>
                              <p className="text-[9px] text-gray-400">Q{evaluation.quarter}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
                  <ClipboardList size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-500">No principal evaluation yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create one from the New Evaluation tab to populate analytics.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  {rubric.criteria.map((criterion, i) => (
                    <tr key={criterion.id} className="border-b border-gray-50">
                      <td className="py-2 px-4 text-gray-300">{i + 1}</td>
                      <td className="py-2 px-4">
                        <p className="font-bold text-gray-700">{criterion.name}</p>
                        {criterion.description && <p className="text-[10px] text-gray-400 mt-0.5">{criterion.description}</p>}
                      </td>
                      <td className="py-2 px-4 text-center font-bold text-gray-600">{criterion.maxScore}</td>
                      <td className="py-2 px-4 text-center font-bold text-[#185C20]">{criterion.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {activeTab === 'evaluate' && (
        <div className="p-4 lg:p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Evaluate Teacher</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select value={evalTeacher} onChange={e => setEvalTeacher(e.target.value)} className="h-10 px-3 border border-gray-200 rounded text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#185C20]/15">
              <option value="">Select Teacher...</option>
              {teachers.map(t => <option key={t.username} value={t.username}>{t.name} ({t.department})</option>)}
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
              {selectedRubric.criteria.map(criterion => (
                <div key={criterion.id} className="p-3 bg-gray-50 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-gray-700">{criterion.name}</p>
                      <p className="text-[10px] text-gray-400">{criterion.description}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">{criterion.weight}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {Array.from({ length: criterion.maxScore }, (_, i) => i + 1).map(score => (
                      <button key={score} onClick={() => setEvalScores(prev => ({ ...prev, [criterion.id]: score }))}
                        className={`w-10 h-10 rounded text-sm font-bold transition-all ${
                          evalScores[criterion.id] === score ? 'bg-[#185C20] text-[#EDCD1F] shadow-md shadow-[#185C20]/20'
                          : (evalScores[criterion.id] || 0) >= score ? 'bg-[#185C20]/10 text-[#185C20]'
                          : 'bg-white border border-gray-200 text-gray-400 hover:border-[#185C20]/30'
                        }`}>
                        {score}
                      </button>
                    ))}
                    <span className="text-[10px] text-gray-400 ml-2">/ {criterion.maxScore}</span>
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
              {rubricCriteria.map((criterion, i) => (
                <div key={criterion.id} className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-100">
                  <span className="text-[10px] text-gray-400 mt-2.5 w-4 text-center">{i + 1}</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input value={criterion.name} onChange={e => setRubricCriteria(prev => prev.map(item => item.id === criterion.id ? { ...item, name: e.target.value } : item))}
                      placeholder="Criterion name" className="h-9 px-2.5 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#185C20]/20 sm:col-span-2" />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">Max:</span>
                      <input type="number" value={criterion.maxScore} onChange={e => setRubricCriteria(prev => prev.map(item => item.id === criterion.id ? { ...item, maxScore: Number(e.target.value) } : item))}
                        min={1} max={10} className="h-9 w-14 text-center text-xs border border-gray-200 rounded bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400">Wt:</span>
                      <input type="number" value={criterion.weight} onChange={e => setRubricCriteria(prev => prev.map(item => item.id === criterion.id ? { ...item, weight: Number(e.target.value) } : item))}
                        min={1} max={100} className="h-9 w-14 text-center text-xs border border-gray-200 rounded bg-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="text-[10px] text-gray-400">%</span>
                    </div>
                  </div>
                  <button onClick={() => setRubricCriteria(prev => prev.filter(item => item.id !== criterion.id))} className="text-gray-300 hover:text-red-400 mt-2 transition-colors"><Trash2 size={13} /></button>
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
