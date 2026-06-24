import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, UserPlus, Plus, Trash2, Pencil, CheckCircle2, XCircle, AlertCircle,
  Loader2, Download, ArrowRight, RotateCcw, Users, Ban,
} from 'lucide-react';
import { createAccount } from '../../../utils/apiClient';
import { Modal, Pagination } from './shared';
import { ConfirmDialog } from '../common/BulkActions';
import { StudentFormFields, BLANK_FORM, type StudentRecord } from './StudentRegistration';

type Draft = typeof BLANK_FORM & { _id: string };

interface BatchResult {
  name: string;
  gradeLevel: string;
  section: string;
  status: 'success' | 'failed';
  message?: string;
  studentCode?: string;
  password?: string;
}

type Stage = 'build' | 'registering' | 'summary';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generateTempPassword = () => {
  let pw = '';
  for (let i = 0; i < 10; i++) pw += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  return pw;
};

const draftName = (d: { firstName: string; middleName: string; lastName: string; extension: string }) =>
  [d.firstName, d.middleName, d.lastName, d.extension].map((s) => s.trim()).filter(Boolean).join(' ') || '(unnamed)';

const newDraftId = () => `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

const BATCH_PAGE_SIZE = 6;

interface BatchStudentRegistrationProps {
  open: boolean;
  onClose: () => void;
  existingStudents: StudentRecord[];
  onRegistered: (created: StudentRecord[]) => void;
}

export const BatchStudentRegistration: React.FC<BatchStudentRegistrationProps> = ({
  open, onClose, existingStudents, onRegistered,
}) => {
  const [stage, setStage] = useState<Stage>('build');
  const [batch, setBatch] = useState<Draft[]>([]);
  const [draft, setDraft] = useState<Draft>(() => ({ ...BLANK_FORM, _id: newDraftId() }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [batchPage, setBatchPage] = useState(1);

  // Registration progress
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [processed, setProcessed] = useState(0);
  const cancelRef = useRef(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((p) => ({ ...p, [key]: e.target.value }));

  const resetDraft = () => { setDraft({ ...BLANK_FORM, _id: newDraftId() }); setEditingId(null); };

  const existingLrns = new Set(existingStudents.map((s) => s.lrn).filter(Boolean) as string[]);

  const addOrUpdateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const lrn = draft.lrn.trim();

    // LRN must be unique against the catalog and within this batch.
    if (lrn && existingLrns.has(lrn)) {
      setFormError(`LRN ${lrn} is already registered.`);
      return;
    }
    const lrnClash = batch.some((b) => b.lrn.trim() === lrn && b._id !== editingId);
    if (lrn && lrnClash) {
      setFormError(`LRN ${lrn} is already in this batch.`);
      return;
    }

    if (editingId) {
      setBatch((prev) => prev.map((b) => (b._id === editingId ? { ...draft, _id: editingId } : b)));
    } else {
      setBatch((prev) => [...prev, { ...draft, _id: newDraftId() }]);
    }
    // Keep grade level + section to speed up entering a whole class.
    setDraft({ ...BLANK_FORM, gradeLevel: draft.gradeLevel, section: draft.section, _id: newDraftId() });
    setEditingId(null);
  };

  const editEntry = (entry: Draft) => { setDraft({ ...entry }); setEditingId(entry._id); setFormError(''); };
  const removeEntry = (id: string) => {
    setBatch((prev) => prev.filter((b) => b._id !== id));
    if (editingId === id) resetDraft();
  };

  const startRegistration = async () => {
    if (batch.length === 0) return;
    setStage('registering');
    cancelRef.current = false;
    setProgress(0);
    setProcessed(0);
    const collected: BatchResult[] = [];
    const created: StudentRecord[] = [];

    for (let i = 0; i < batch.length; i++) {
      if (cancelRef.current) break;
      setProgress(i);
      const entry = batch[i];
      const password = generateTempPassword();
      const base: BatchResult = { name: draftName(entry), gradeLevel: entry.gradeLevel.trim(), section: entry.section.trim(), status: 'failed' };

      try {
        const payload: Record<string, any> = {
          role: 'student',
          firstName: entry.firstName.trim(), lastName: entry.lastName.trim(),
          password, lrn: entry.lrn.trim(),
          gradeLevel: entry.gradeLevel.trim(), section: entry.section.trim(),
          noOfSiblings: Number(entry.noOfSiblings) || 0,
          monthlyFamilyIncome: Number(entry.monthlyFamilyIncome) || 0,
          province: entry.province.trim(), city: entry.city.trim(),
          emergencyContactName: entry.emergencyContactName.trim(),
          emergencyContactNumber: entry.emergencyContactNumber.trim(),
        };
        if (entry.middleName.trim()) payload.middleName = entry.middleName.trim();
        if (entry.extension.trim()) payload.extension = entry.extension.trim();

        const res = await createAccount(payload);
        created.push(res.user);
        collected.push({ ...base, status: 'success', studentCode: res.user.studentCode, password });
      } catch (err: any) {
        collected.push({ ...base, status: 'failed', message: err?.message || 'Registration failed.' });
      }
      setProcessed(collected.length);
      setResults([...collected]);
    }

    setProgress(batch.length);
    if (created.length > 0) onRegistered(created);
    setStage('summary');
  };

  const confirmCancelRegistration = () => {
    cancelRef.current = true;
    setConfirmCancel(false);
  };

  const downloadCredentials = () => {
    const successes = results.filter((r) => r.status === 'success');
    if (successes.length === 0) return;
    const lines = [
      'Name,Grade Level,Section,Login Code,Temporary Password',
      ...successes.map((r) =>
        [r.name, r.gradeLevel, r.section, r.studentCode ?? '', r.password ?? '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-registration-credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fullReset = () => {
    setStage('build');
    setBatch([]);
    resetDraft();
    setResults([]);
    setProcessed(0);
    setProgress(0);
    setBatchPage(1);
    setFormError('');
    cancelRef.current = false;
  };

  // Closing rules: confirm if a built batch would be discarded; route the X during
  // an active run to the cancel-registration confirmation.
  const requestClose = () => {
    if (stage === 'registering') { setConfirmCancel(true); return; }
    if (stage === 'build' && batch.length > 0) { setConfirmClose(true); return; }
    fullReset();
    onClose();
  };

  const finishAndClose = () => { fullReset(); onClose(); };

  const successCount = results.filter((r) => r.status === 'success').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const cancelledCount = stage === 'summary' ? batch.length - processed : 0;
  const progressPct = batch.length > 0 ? Math.round((processed / batch.length) * 100) : 0;

  const batchPageCount = Math.max(1, Math.ceil(batch.length / BATCH_PAGE_SIZE));
  const safeBatchPage = Math.min(batchPage, batchPageCount);
  const pagedBatch = batch.slice((safeBatchPage - 1) * BATCH_PAGE_SIZE, safeBatchPage * BATCH_PAGE_SIZE);

  return (
    <Modal open={open} onClose={requestClose} maxW="max-w-3xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900">Batch Student Registration</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {stage === 'build' && 'Add students to the batch, then register them all at once.'}
            {stage === 'registering' && 'Registering students…'}
            {stage === 'summary' && 'Registration summary.'}
          </p>
        </div>
        <button onClick={requestClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ─── Build ─── */}
          {stage === 'build' && (
            <motion.div key="build" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <form onSubmit={addOrUpdateDraft}>
                <div className="px-5 pt-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{editingId ? 'Edit entry' : 'Add a student'}</p>
                  {editingId && (
                    <button type="button" onClick={resetDraft} className="text-xs text-gray-500 hover:text-gray-700">Cancel edit</button>
                  )}
                </div>
                <StudentFormFields form={draft} set={set} hidePassword />
                {formError && (
                  <div className="mx-5 mb-2 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0" />{formError}
                  </div>
                )}
                <div className="px-5 pb-4">
                  <button type="submit"
                    className="w-full px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition-colors flex items-center justify-center gap-2">
                    {editingId ? <><Pencil size={14} />Update entry</> : <><Plus size={14} />Add to batch</>}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2 text-center">
                    Login codes and temporary passwords are generated automatically when you register the batch.
                  </p>
                </div>
              </form>

              {/* Batch list */}
              <div className="border-t border-gray-100">
                <div className="px-5 py-3 flex items-center gap-2">
                  <Users size={15} className="text-purple-600" />
                  <p className="text-sm font-semibold text-gray-900">Batch</p>
                  <span className="text-xs text-gray-400">{batch.length} student{batch.length !== 1 ? 's' : ''}</span>
                </div>
                {batch.length === 0 ? (
                  <div className="px-5 pb-6 text-center text-sm text-gray-400">No students added yet. Fill the form above and click “Add to batch”.</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-2">Name</th>
                            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Grade / Section</th>
                            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2 hidden sm:table-cell">LRN</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pagedBatch.map((b) => (
                            <tr key={b._id} className={editingId === b._id ? 'bg-purple-50/60' : ''}>
                              <td className="px-5 py-2 text-gray-800">{draftName(b)}</td>
                              <td className="px-3 py-2 text-gray-500">{[b.gradeLevel, b.section].filter(Boolean).join(' / ') || '—'}</td>
                              <td className="px-3 py-2 text-gray-500 font-mono text-xs hidden sm:table-cell">{b.lrn || '—'}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <button type="button" onClick={() => editEntry(b)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
                                    <Pencil size={13} />
                                  </button>
                                  <button type="button" onClick={() => removeEntry(b._id)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Remove">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      page={safeBatchPage}
                      pageCount={batchPageCount}
                      totalItems={batch.length}
                      pageSize={BATCH_PAGE_SIZE}
                      onChange={setBatchPage}
                    />
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── Registering ─── */}
          {stage === 'registering' && (
            <motion.div key="registering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin text-purple-600" />
                  {cancelRef.current ? 'Stopping…' : 'Registering students…'}
                </p>
                <span className="text-xs text-gray-400">{processed} / {batch.length}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <motion.div className="h-full bg-purple-600 rounded-full" animate={{ width: `${progressPct}%` }} transition={{ ease: 'easeOut', duration: 0.25 }} />
              </div>
              {progress < batch.length && !cancelRef.current && (
                <motion.p key={progress} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-gray-500 mb-4">
                  Currently registering: <span className="font-medium text-gray-700">{draftName(batch[progress])}</span>
                </motion.p>
              )}
              <div className="max-h-56 overflow-y-auto space-y-1.5 mb-4">
                <AnimatePresence initial={false}>
                  {results.slice().reverse().map((r, idx) => (
                    <motion.div key={`${r.name}-${idx}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${r.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {r.status === 'success' ? <CheckCircle2 size={13} className="flex-shrink-0" /> : <XCircle size={13} className="flex-shrink-0" />}
                      <span className="font-medium">{r.name}</span>
                      <span className="text-[11px] opacity-75">{r.status === 'success' ? `code ${r.studentCode}` : r.message}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                disabled={cancelRef.current}
                className="w-full px-4 py-2.5 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Ban size={14} />{cancelRef.current ? 'Stopping after current…' : 'Cancel registration'}
              </button>
            </motion.div>
          )}

          {/* ─── Summary ─── */}
          {stage === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-700">{successCount}</p>
                  <p className="text-[11px] text-green-600">Registered</p>
                </div>
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-red-700">{failedCount}</p>
                  <p className="text-[11px] text-red-600">Failed</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-amber-700">{cancelledCount}</p>
                  <p className="text-[11px] text-amber-600">Not processed</p>
                </div>
              </div>

              {successCount > 0 && (
                <button onClick={downloadCredentials}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition-colors">
                  <Download size={15} />Download Login Credentials (CSV)
                </button>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {results.map((r, idx) => (
                  <div key={`${r.name}-${idx}`}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs ${r.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === 'success' ? <CheckCircle2 size={13} className="flex-shrink-0" /> : <XCircle size={13} className="flex-shrink-0" />}
                      <span className="font-medium truncate">{r.name}</span>
                    </div>
                    <span className="text-[11px] opacity-75 flex-shrink-0">{r.status === 'success' ? `Code: ${r.studentCode ?? '—'}` : r.message}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        {stage === 'build' && (
          <>
            <button onClick={requestClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
              Cancel
            </button>
            <button onClick={startRegistration} disabled={batch.length === 0}
              className="flex-1 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <UserPlus size={14} />Register {batch.length} Student{batch.length !== 1 ? 's' : ''}<ArrowRight size={14} />
            </button>
          </>
        )}
        {stage === 'summary' && (
          <>
            <button onClick={fullReset} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors flex items-center justify-center gap-2">
              <RotateCcw size={14} />New Batch
            </button>
            <button onClick={finishAndClose} className="flex-1 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition-colors">
              Done
            </button>
          </>
        )}
      </div>

      {/* Cancel-registration confirmation */}
      <ConfirmDialog
        open={confirmCancel}
        title="Cancel registration?"
        intent="danger"
        message="Stop registering the rest of the batch? Students already registered will stay registered; the remaining ones will be skipped."
        confirmLabel="Stop registration"
        cancelLabel="Keep going"
        onConfirm={confirmCancelRegistration}
        onCancel={() => setConfirmCancel(false)}
      />

      {/* Discard-batch confirmation */}
      <ConfirmDialog
        open={confirmClose}
        title="Discard batch?"
        intent="danger"
        message={`You have ${batch.length} unregistered student${batch.length !== 1 ? 's' : ''} in this batch. Closing will discard them.`}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => { setConfirmClose(false); finishAndClose(); }}
        onCancel={() => setConfirmClose(false)}
      />
    </Modal>
  );
};
