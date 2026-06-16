import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle,
  Loader2, Download, ArrowRight, RotateCcw,
} from 'lucide-react';
import { createAccount } from '../../../utils/apiClient';
import { parseCsvToObjects } from '../../../utils/csv';
import { Modal } from './shared';
import type { StudentRecord } from './StudentRegistration';

const HEADER_MAP: Record<string, string> = {
  'first name': 'firstName',
  'middle name': 'middleName',
  'last name': 'lastName',
  'extension': 'extension',
  'no of siblings': 'noOfSiblings',
  'monthly family income': 'monthlyFamilyIncome',
  'province': 'province',
  'city/municipality': 'city',
  'city': 'city',
  'lrn': 'lrn',
  'grade level': 'gradeLevel',
  'section': 'section',
  'emergency contact name': 'emergencyContactName',
  'emergency contact number': 'emergencyContactNumber',
};

interface ParsedRow {
  firstName: string; middleName: string; lastName: string; extension: string;
  noOfSiblings: string; monthlyFamilyIncome: string; province: string; city: string;
  lrn: string; gradeLevel: string; section: string;
  emergencyContactName: string; emergencyContactNumber: string;
}

interface ImportResult {
  row: ParsedRow;
  rowNumber: number;
  status: 'success' | 'duplicate' | 'failed';
  message?: string;
  password?: string;
  student?: StudentRecord;
}

type Stage = 'pick' | 'preview' | 'importing' | 'summary';

const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generateTempPassword = () => {
  let pw = '';
  for (let i = 0; i < 10; i++) pw += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  return pw;
};

const rowName = (row: ParsedRow) =>
  [row.firstName, row.middleName, row.lastName, row.extension].filter(Boolean).join(' ').trim() || '(unnamed)';

interface BulkStudentImportProps {
  open: boolean;
  onClose: () => void;
  existingStudents: StudentRecord[];
  onImported: (created: StudentRecord[]) => void;
}

export const BulkStudentImport: React.FC<BulkStudentImportProps> = ({
  open, onClose, existingStudents, onImported,
}) => {
  const [stage, setStage] = useState<Stage>('pick');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage('pick');
    setFileName('');
    setParseError('');
    setRows([]);
    setCurrentIndex(0);
    setResults([]);
  };

  const handleClose = () => {
    if (stage === 'importing') return;
    reset();
    onClose();
  };

  const handleFile = (file: File) => {
    setParseError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      const parsed = parseCsvToObjects(text, HEADER_MAP) as unknown as ParsedRow[];
      const usable = parsed.filter((r) => r.firstName || r.lastName);
      if (usable.length === 0) {
        setParseError('No usable student rows were found in this CSV. Check that the header row matches the expected format.');
        return;
      }
      setRows(usable);
      setStage('preview');
    };
    reader.onerror = () => setParseError('Could not read this file.');
    reader.readAsText(file);
  };

  const startImport = async () => {
    setStage('importing');
    setCurrentIndex(0);
    const existingLrns = new Set(existingStudents.map((s) => s.lrn).filter(Boolean));
    const seenLrns = new Set<string>();
    const collected: ImportResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setCurrentIndex(i);
      const lrn = row.lrn?.trim();

      if (!row.firstName?.trim() || !row.lastName?.trim() || !row.gradeLevel?.trim() || !row.section?.trim() || !lrn) {
        collected.push({ row, rowNumber: i + 2, status: 'failed', message: 'Missing a required field (name, grade level, section, or LRN).' });
        setResults([...collected]);
        continue;
      }

      if (existingLrns.has(lrn) || seenLrns.has(lrn)) {
        collected.push({ row, rowNumber: i + 2, status: 'duplicate', message: `LRN ${lrn} is already registered.` });
        setResults([...collected]);
        continue;
      }

      const password = generateTempPassword();
      try {
        const payload: Record<string, any> = {
          role: 'student',
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          password,
          lrn,
          gradeLevel: row.gradeLevel.trim(),
          section: row.section.trim(),
          noOfSiblings: Number(row.noOfSiblings) || 0,
          monthlyFamilyIncome: Number(row.monthlyFamilyIncome) || 0,
          province: row.province?.trim() || '',
          city: row.city?.trim() || '',
          emergencyContactName: row.emergencyContactName?.trim() || '',
          emergencyContactNumber: row.emergencyContactNumber?.trim() || '',
        };
        if (row.middleName?.trim()) payload.middleName = row.middleName.trim();
        if (row.extension?.trim()) payload.extension = row.extension.trim();

        const res = await createAccount(payload);
        seenLrns.add(lrn);
        collected.push({ row, rowNumber: i + 2, status: 'success', password, student: res.user });
      } catch (err: any) {
        collected.push({ row, rowNumber: i + 2, status: 'failed', message: err?.message || 'Registration failed.' });
      }
      setResults([...collected]);
    }

    setCurrentIndex(rows.length);
    const successStudents = collected.filter((r) => r.status === 'success' && r.student).map((r) => r.student!);
    if (successStudents.length > 0) onImported(successStudents);
    setStage('summary');
  };

  const downloadCredentials = () => {
    const successes = results.filter((r) => r.status === 'success');
    if (successes.length === 0) return;
    const lines = [
      'Name,Grade Level,Section,Login Code,Temporary Password',
      ...successes.map((r) =>
        [rowName(r.row), r.row.gradeLevel, r.row.section, r.student?.studentCode ?? '', r.password ?? '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-import-credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results.filter((r) => r.status === 'success').length;
  const duplicateCount = results.filter((r) => r.status === 'duplicate').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const progressPct = rows.length > 0 ? Math.round((results.length / rows.length) * 100) : 0;

  return (
    <Modal open={open} onClose={handleClose} maxW="max-w-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900">Bulk Student Import</p>
          <p className="text-xs text-gray-400 mt-0.5">Upload a CSV to register many students at once.</p>
        </div>
        <button onClick={handleClose} disabled={stage === 'importing'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {stage === 'pick' && (
            <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-colors"
              >
                <Upload size={28} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-700">Click to choose a CSV file, or drag it here</p>
                <p className="text-xs text-gray-400">First row must be the header — it will not be registered.</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
              {parseError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />{parseError}
                </div>
              )}
            </motion.div>
          )}

          {stage === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet size={16} className="text-purple-600" />
                <p className="text-sm font-medium text-gray-900">{fileName}</p>
                <span className="text-xs text-gray-400">{rows.length} student{rows.length !== 1 ? 's' : ''} found</span>
              </div>
              <div className="border border-gray-100 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Name</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Grade</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Section</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">LRN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700">{rowName(row)}</td>
                        <td className="px-3 py-2 text-gray-500">{row.gradeLevel || '—'}</td>
                        <td className="px-3 py-2 text-gray-500">{row.section || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 font-mono text-xs">{row.lrn || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Each student gets a unique login code and an auto-generated temporary password. Duplicate LRNs (against existing students or within this file) will be skipped.
              </p>
            </motion.div>
          )}

          {stage === 'importing' && (
            <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin text-purple-600" />
                  Registering students…
                </p>
                <span className="text-xs text-gray-400">{Math.min(currentIndex + 1, rows.length)} / {rows.length}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-purple-600 rounded-full"
                  animate={{ width: `${progressPct}%` }}
                  transition={{ ease: 'easeOut', duration: 0.25 }}
                />
              </div>
              {currentIndex < rows.length && (
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-gray-500 mb-4"
                >
                  Currently registering: <span className="font-medium text-gray-700">{rowName(rows[currentIndex])}</span>
                </motion.p>
              )}
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                <AnimatePresence initial={false}>
                  {results.slice().reverse().map((r) => (
                    <motion.div
                      key={r.rowNumber}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                        r.status === 'success' ? 'bg-green-50 text-green-700'
                          : r.status === 'duplicate' ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {r.status === 'success' && <CheckCircle2 size={13} className="flex-shrink-0" />}
                      {r.status === 'duplicate' && <AlertCircle size={13} className="flex-shrink-0" />}
                      {r.status === 'failed' && <XCircle size={13} className="flex-shrink-0" />}
                      <span className="font-medium">{rowName(r.row)}</span>
                      <span className="text-[11px] opacity-75">
                        {r.status === 'success' ? 'registered' : r.message}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {stage === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-700">{successCount}</p>
                  <p className="text-[11px] text-green-600">Registered</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-amber-700">{duplicateCount}</p>
                  <p className="text-[11px] text-amber-600">Duplicate</p>
                </div>
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
                  <p className="text-xl font-bold text-red-700">{failedCount}</p>
                  <p className="text-[11px] text-red-600">Failed</p>
                </div>
              </div>

              {successCount > 0 && (
                <button onClick={downloadCredentials}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition-colors">
                  <Download size={15} />Download Login Credentials (CSV)
                </button>
              )}

              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {results.map((r) => (
                  <div key={r.rowNumber}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs ${
                      r.status === 'success' ? 'bg-green-50 text-green-700'
                        : r.status === 'duplicate' ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {r.status === 'success' && <CheckCircle2 size={13} className="flex-shrink-0" />}
                      {r.status === 'duplicate' && <AlertCircle size={13} className="flex-shrink-0" />}
                      {r.status === 'failed' && <XCircle size={13} className="flex-shrink-0" />}
                      <span className="font-medium truncate">{rowName(r.row)}</span>
                    </div>
                    <span className="text-[11px] opacity-75 flex-shrink-0">
                      {r.status === 'success' ? `Code: ${r.student?.studentCode ?? '—'}` : r.message}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        {stage === 'pick' && (
          <button onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
            Cancel
          </button>
        )}
        {stage === 'preview' && (
          <>
            <button onClick={reset} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
              Choose Different File
            </button>
            <button onClick={startImport}
              className="flex-1 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition-colors flex items-center justify-center gap-2">
              Register {rows.length} Student{rows.length !== 1 ? 's' : ''}<ArrowRight size={14} />
            </button>
          </>
        )}
        {stage === 'summary' && (
          <>
            <button onClick={reset} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors flex items-center justify-center gap-2">
              <RotateCcw size={14} />Import Another File
            </button>
            <button onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 transition-colors">
              Done
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};
