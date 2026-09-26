import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle, BookMarked, BookOpen, ChevronRight, IdCard, Loader2, Mail,
  Phone, RotateCcw, ScanLine, Search, UserRound, Clock, CheckCircle2, Layers,
} from 'lucide-react';
import { readDatabaseOnline } from '../../../utils/database';
import {
  BooksDetailModal,
  CIRCULATION_TABLE,
  type CirculationRecord,
  type CirculationStore,
  type CirculationStudent,
  StatusBadge,
  formatDateTime,
  getOpenBooks,
  isReturnedStatus,
  normalizeCirculationRecords,
  applyRecordLifecycle,
} from './CirculationPage';
import { resolveStudentByCode, studentIdentitySet } from './studentScan';
import { AnimatedStatCard, TONES } from './dashboardKit';

const timestampOf = (iso?: string | null) => {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : 0;
};

const recordMatchesStudent = (record: CirculationRecord, identity: Set<string>) => {
  const student = record.student;
  return [student.uid, student.systemId, student.studentId, student.lrn].some(
    (value) => value && identity.has(String(value).toLowerCase()),
  );
};

export const StudentLookup: React.FC = () => {
  const [allRecords, setAllRecords] = useState<CirculationRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [scanValue, setScanValue] = useState('');
  const [student, setStudent] = useState<CirculationStudent | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [searchedCode, setSearchedCode] = useState('');
  const [detailsRecord, setDetailsRecord] = useState<CirculationRecord | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const payload = await readDatabaseOnline<CirculationStore>(CIRCULATION_TABLE);
      setAllRecords(normalizeCirculationRecords(payload?.records));
    } catch (err) {
      console.error('Failed to load circulation data:', err);
      setError('Could not load library data. Refresh and try again.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const runLookup = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || isSearching) return;

    setIsSearching(true);
    setError('');
    setSearchedCode(code);
    try {
      const found = await resolveStudentByCode(code);
      if (!found) {
        setStudent(null);
        setError(`No student record matches "${code}".`);
      } else {
        setStudent(found);
        setError('');
      }
    } catch (err) {
      console.error('Student lookup failed:', err);
      setStudent(null);
      setError('Lookup failed. Check the connection and try again.');
    } finally {
      setIsSearching(false);
      setScanValue('');
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isSearching]);

  const clearStudent = () => {
    setStudent(null);
    setError('');
    setSearchedCode('');
    setScanValue('');
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  // Records that belong to the looked-up student, freshly lifecycle-applied.
  const studentRecords = useMemo(() => {
    if (!student) return [];
    const identity = studentIdentitySet(student);
    return allRecords
      .filter((record) => recordMatchesStudent(record, identity))
      .map((record) => applyRecordLifecycle(record))
      .sort((a, b) => timestampOf(b.borrowedAt) - timestampOf(a.borrowedAt));
  }, [allRecords, student]);

  const stats = useMemo(() => {
    let totalBooks = 0;
    let currentlyOut = 0;
    let overdue = 0;
    let returned = 0;
    let lateReturns = 0;

    studentRecords.forEach((record) => {
      record.books.forEach((book) => {
        totalBooks += 1;
        if (book.status === 'borrowed' || book.status === 'not_returned') currentlyOut += 1;
        if (book.status === 'not_returned') overdue += 1;
        if (isReturnedStatus(book.status)) returned += 1;
        if (book.status === 'late_returned') lateReturns += 1;
      });
    });

    return {
      loans: studentRecords.length,
      totalBooks,
      currentlyOut,
      overdue,
      returned,
      lateReturns,
    };
  }, [studentRecords]);

  return (
    <div className="space-y-4">
      {/* Scan bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <ScanLine className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Student Lookup</h3>
            <p className="text-xs text-gray-500">Scan a student QR/ID or type it to view their library record.</p>
          </div>
        </div>

        <form
          onSubmit={(event) => { event.preventDefault(); void runLookup(scanValue); }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="Scan or enter Student ID, LRN, or QR code…"
              className="w-full h-11 pl-9 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !scanValue.trim()}
            className="h-11 px-5 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Look up
          </button>
          {student && (
            <button
              type="button"
              onClick={clearStudent}
              className="h-11 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              New scan
            </button>
          )}
        </form>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Empty / prompt state */}
      {!student && !error && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-300 flex items-center justify-center mx-auto mb-3">
            <ScanLine className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Ready to scan</p>
          <p className="text-xs text-gray-400 mt-1">
            {isLoadingData ? 'Loading library data…' : 'Scan a student to see their profile, stats, and full borrowing history.'}
          </p>
        </div>
      )}

      {/* Result */}
      <AnimatePresence mode="wait">
        {student && (
          <motion.div
            key={student.uid + searchedCode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-4"
          >
            {/* Profile */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:text-center sm:w-44">
                  <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {student.photoUrl
                      ? <img src={student.photoUrl} alt={student.displayName} className="w-full h-full object-cover" />
                      : student.initials
                        ? <span className="text-xl font-bold text-amber-700">{student.initials}</span>
                        : <UserRound className="w-9 h-9 text-amber-300" />}
                  </div>
                  <div className="sm:mt-2">
                    <p className="text-base font-semibold text-gray-900">{student.displayName}</p>
                    <p className="text-xs text-gray-500">
                      {student.gradeLevel || 'Student'}{student.section ? ` - ${student.section}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoRow icon={IdCard} label="LRN" value={student.lrn || '—'} />
                  <InfoRow icon={IdCard} label="Login Code / ID" value={student.studentId || student.uid || '—'} />
                  <InfoRow icon={UserRound} label="Status" value={student.status ? student.status[0].toUpperCase() + student.status.slice(1) : 'Active'} />
                  <InfoRow icon={Phone} label="Emergency Contact" value={student.emergencyContactNumber || '—'} />
                  <InfoRow icon={UserRound} label="Guardian / Contact Name" value={student.guardianName || student.emergencyContactName || '—'} />
                  <InfoRow icon={Mail} label="Section" value={student.section || '—'} />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <AnimatedStatCard label="Total Loans"   value={stats.loans}        icon={BookMarked}   tone={TONES.amber}  index={0} />
              <AnimatedStatCard label="Books Borrowed" value={stats.totalBooks}  icon={BookOpen}     tone={TONES.blue}   index={1} />
              <AnimatedStatCard label="Currently Out"  value={stats.currentlyOut} icon={Layers}      tone={TONES.purple} index={2} />
              <AnimatedStatCard label="Overdue"        value={stats.overdue}     icon={Clock}        tone={TONES.red}    index={3} />
              <AnimatedStatCard label="Returned"       value={stats.returned}    icon={CheckCircle2} tone={TONES.green}  index={4} />
            </div>

            {/* History */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Borrowing History</p>
                  <p className="text-xs text-gray-400 mt-0.5">Every loan on record for this student. Open a row for details.</p>
                </div>
                <span className="text-xs text-gray-400">{studentRecords.length} loan{studentRecords.length === 1 ? '' : 's'}</span>
              </div>

              {studentRecords.length === 0 ? (
                <div className="p-10 text-center">
                  <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No borrowing records for this student.</p>
                  <p className="text-xs text-gray-400 mt-1">Loans created in Circulation will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Borrowed</th>
                        <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Books</th>
                        <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Return Date</th>
                        <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {studentRecords.map((record) => {
                        const open = getOpenBooks(record).length;
                        return (
                          <tr
                            key={record.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setDetailsRecord(record)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setDetailsRecord(record);
                              }
                            }}
                            className="hover:bg-amber-50/40 transition-colors cursor-pointer focus:outline-none focus:bg-amber-50"
                          >
                            <td className="px-4 py-3 min-w-[160px]">
                              <p className="text-sm text-gray-900">{formatDateTime(record.borrowedAt)}</p>
                            </td>
                            <td className="px-4 py-3 min-w-[220px]">
                              <p className="text-sm font-semibold text-gray-900">
                                {record.books.length} book{record.books.length === 1 ? '' : 's'}
                                {open > 0 && <span className="text-amber-700"> · {open} out</span>}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {record.books[0]?.title}{record.books.length > 1 ? ` +${record.books.length - 1} more` : ''}
                              </p>
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell min-w-[160px]">
                              <p className="text-sm text-gray-700">{formatDateTime(record.dueAt)}</p>
                            </td>
                            <td className="px-4 py-3 min-w-[130px]">
                              <StatusBadge status={record.status} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(event) => { event.stopPropagation(); setDetailsRecord(record); }}
                                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  View
                                </button>
                                <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BooksDetailModal
        record={detailsRecord}
        title="Loan Details"
        showActions={false}
        onClose={() => setDetailsRecord(null)}
      />
    </div>
  );
};

const InfoRow: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2">
    <Icon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 truncate">{value}</p>
    </div>
  </div>
);

export default StudentLookup;
