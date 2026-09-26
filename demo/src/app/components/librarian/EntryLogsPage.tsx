import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import { readDatabaseOnline, writeDatabase } from '../../../utils/database';
import type { UserProfile } from '../../../utils/auth';
import type { CirculationStudent } from './CirculationPage';
import { resolveStudentByCode, studentIdentitySet } from './studentScan';
import { Pagination } from '../registrar/shared';

export const LIBRARY_ENTRY_LOGS_TABLE = 'library_entry_logs' as const;

type EntryStatusFilter = 'all' | 'inside' | 'timed_out';
type EntryAction = 'time_in' | 'time_out';

export interface LibraryEntryLog {
  id: string;
  date: string;
  student: CirculationStudent;
  timeInAt: string;
  timeOutAt: string | null;
  status: 'inside' | 'timed_out';
  scanCount: number;
  lastScanAt: string;
  createdAt: string;
  updatedAt: string;
  timeInBy?: string;
  timeOutBy?: string;
}

interface LibraryEntryLogsStore {
  logs?: unknown[];
  lastUpdated?: string;
}

interface LastScanResult {
  action: EntryAction;
  studentName: string;
  time: string;
}

const PAGE_SIZE = 10;

const newLogId = () =>
  `libentry_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const timestampOf = (iso?: string | null) => {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : 0;
};

const isValidDateString = (value?: string | null) =>
  Boolean(value) && Number.isFinite(new Date(String(value)).getTime());

const getManilaDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));

const formatTime = (iso?: string | null) =>
  iso ? new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso)) : '-';

const formatDuration = (startIso: string, endIso?: string | null) => {
  if (!endIso) return 'In progress';

  const minutes = Math.max(0, Math.round((timestampOf(endIso) - timestampOf(startIso)) / 60000));
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
};

const studentSearchText = (student: CirculationStudent) =>
  [
    student.displayName,
    student.systemId,
    student.studentId,
    student.uid,
    student.lrn,
    student.gradeLevel,
    student.section,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const normalizeStudent = (value: any): CirculationStudent | null => {
  if (!value || typeof value !== 'object') return null;

  const displayName = String(value.displayName || value.name || '').trim();
  const uid = String(value.uid || value.studentId || value.systemId || '').trim();
  const systemId = String(value.systemId || value.studentId || value.uid || '').trim();
  if (!displayName || (!uid && !systemId)) return null;

  return {
    uid: uid || systemId,
    systemId: systemId || uid,
    studentId: value.studentId,
    displayName,
    initials: String(value.initials || displayName.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2) || 'ST').toUpperCase(),
    firstName: value.firstName,
    middleName: value.middleName,
    lastName: value.lastName,
    lrn: value.lrn,
    gradeLevel: value.gradeLevel,
    section: value.section,
    status: value.status,
    photoUrl: value.photoUrl,
    guardianName: value.guardianName,
    emergencyContactName: value.emergencyContactName,
    emergencyContactNumber: value.emergencyContactNumber,
  };
};

const normalizeEntryLog = (value: any): LibraryEntryLog | null => {
  if (!value || typeof value !== 'object') return null;

  const student = normalizeStudent(value.student);
  const timeInAt = String(value.timeInAt || '').trim();
  if (!student || !timeInAt || !isValidDateString(timeInAt)) {
    return null;
  }

  const rawTimeOutAt = value.timeOutAt ? String(value.timeOutAt) : null;
  const timeOutAt = rawTimeOutAt && isValidDateString(rawTimeOutAt) ? rawTimeOutAt : null;
  const lastScanAt = String(value.lastScanAt || timeOutAt || timeInAt);
  const scanCount = Math.max(Number(value.scanCount || (timeOutAt ? 2 : 1)), timeOutAt ? 2 : 1);

  return {
    id: String(value.id || newLogId()),
    date: String(value.date || getManilaDateKey(new Date(timeInAt))),
    student,
    timeInAt,
    timeOutAt,
    status: timeOutAt ? 'timed_out' : 'inside',
    scanCount,
    lastScanAt,
    createdAt: String(value.createdAt || timeInAt),
    updatedAt: String(value.updatedAt || lastScanAt),
    timeInBy: value.timeInBy,
    timeOutBy: value.timeOutBy,
  };
};

const normalizeEntryLogs = (values?: unknown[]) => {
  if (!Array.isArray(values)) return [];
  return values
    .map(normalizeEntryLog)
    .filter((log): log is LibraryEntryLog => Boolean(log))
    .sort((a, b) => timestampOf(b.lastScanAt) - timestampOf(a.lastScanAt));
};

const logMatchesStudent = (log: LibraryEntryLog, identity: Set<string>) =>
  [log.student.uid, log.student.systemId, log.student.studentId, log.student.lrn].some(
    (value) => value && identity.has(String(value).toLowerCase()),
  );

const EntryStatusBadge: React.FC<{ log: LibraryEntryLog }> = ({ log }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
      log.timeOutAt
        ? 'border-blue-100 bg-blue-50 text-blue-700'
        : 'border-green-100 bg-green-50 text-green-700'
    }`}
  >
    {log.timeOutAt ? <LogOut className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
    {log.timeOutAt ? 'Timed out' : 'Inside'}
  </span>
);

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = ({ label, value, icon: Icon, tone }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${tone}`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

export const EntryLogsPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [logs, setLogs] = useState<LibraryEntryLog[]>([]);
  const [scanValue, setScanValue] = useState('');
  const [scanError, setScanError] = useState('');
  const [lastScan, setLastScan] = useState<LastScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(getManilaDateKey());
  const [statusFilter, setStatusFilter] = useState<EntryStatusFilter>('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const scannerRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  const focusScanner = useCallback(() => {
    window.setTimeout(() => scannerRef.current?.focus(), 40);
  }, []);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setScanError('');
    try {
      const payload = await readDatabaseOnline<LibraryEntryLogsStore>(LIBRARY_ENTRY_LOGS_TABLE);
      setLogs(normalizeEntryLogs(payload?.logs));
    } catch (error) {
      console.error('Failed to load library entry logs:', error);
      setScanError('Could not load entry logs. Check the connection and refresh.');
    } finally {
      setIsLoading(false);
      focusScanner();
    }
  }, [focusScanner]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateFilter, statusFilter, gradeFilter]);

  const processScan = useCallback(async (rawValue: string) => {
    const code = rawValue.trim();
    if (!code || isScanning) return;

    const scanKey = code.toLowerCase();
    const nowMs = Date.now();
    if (lastScanRef.current.key === scanKey && nowMs - lastScanRef.current.at < 700) {
      setScanValue('');
      focusScanner();
      return;
    }
    lastScanRef.current = { key: scanKey, at: nowMs };

    setIsScanning(true);
    setScanError('');
    setLastScan(null);

    try {
      const student = await resolveStudentByCode(code);
      if (!student) {
        setScanError(`No student record matches "${code}".`);
        return;
      }
      if (student.status && student.status.toLowerCase() !== 'active') {
        setScanError(`${student.displayName} is not an active student account.`);
        return;
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const currentPayload = await readDatabaseOnline<LibraryEntryLogsStore>(LIBRARY_ENTRY_LOGS_TABLE);
      const currentLogs = normalizeEntryLogs(currentPayload?.logs);
      const identity = studentIdentitySet(student);
      const latestForStudent = currentLogs
        .filter((log) => logMatchesStudent(log, identity))
        .sort((a, b) => timestampOf(b.lastScanAt) - timestampOf(a.lastScanAt))[0];
      const operator = user.displayName || user.username || 'Librarian';

      let action: EntryAction = 'time_in';
      let nextLogs: LibraryEntryLog[];

      if (latestForStudent && !latestForStudent.timeOutAt) {
        action = 'time_out';
        nextLogs = currentLogs.map((log) =>
          log.id === latestForStudent.id
            ? {
                ...log,
                timeOutAt: nowIso,
                status: 'timed_out',
                scanCount: Math.max(Number(log.scanCount || 1) + 1, 2),
                lastScanAt: nowIso,
                updatedAt: nowIso,
                timeOutBy: operator,
              }
            : log,
        );
      } else {
        const created: LibraryEntryLog = {
          id: newLogId(),
          date: getManilaDateKey(now),
          student,
          timeInAt: nowIso,
          timeOutAt: null,
          status: 'inside',
          scanCount: 1,
          lastScanAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
          timeInBy: operator,
        };
        nextLogs = [created, ...currentLogs];
      }

      const normalized = normalizeEntryLogs(nextLogs);
      if (!writeDatabase(LIBRARY_ENTRY_LOGS_TABLE, { logs: normalized, lastUpdated: nowIso })) {
        setScanError('The scan was processed but could not be saved locally.');
        return;
      }

      setLogs(normalized);
      setLastScan({
        action,
        studentName: student.displayName,
        time: nowIso,
      });
    } catch (error) {
      console.error('Library entry scan failed:', error);
      setScanError('Scan failed. Check the connection and try again.');
    } finally {
      setIsScanning(false);
      setScanValue('');
      focusScanner();
    }
  }, [focusScanner, isScanning, user.displayName, user.username]);

  const handleScannerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void processScan(scanValue);
  };

  const todayKey = getManilaDateKey();
  const todayLogs = useMemo(
    () => logs.filter((log) => log.date === todayKey),
    [logs, todayKey],
  );
  const insideNow = useMemo(
    () => logs.filter((log) => !log.timeOutAt).length,
    [logs],
  );
  const uniqueVisitorsToday = useMemo(() => {
    const keys = new Set<string>();
    todayLogs.forEach((log) => {
      keys.add(log.student.uid || log.student.systemId || log.student.displayName);
    });
    return keys.size;
  }, [todayLogs]);

  const gradeOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.student.gradeLevel).filter(Boolean) as string[])).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      if (dateFilter && log.date !== dateFilter) return false;
      if (statusFilter === 'inside' && log.timeOutAt) return false;
      if (statusFilter === 'timed_out' && !log.timeOutAt) return false;
      if (gradeFilter !== 'all' && log.student.gradeLevel !== gradeFilter) return false;
      if (query && !studentSearchText(log.student).includes(query)) return false;
      return true;
    });
  }, [dateFilter, gradeFilter, logs, searchTerm, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedLogs = filteredLogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Entry Logs</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Library-only time in and time out logs. Scan once to enter, scan again to exit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadLogs()}
            disabled={isLoading}
            className="h-10 px-3 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <ScanLine className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={scannerRef}
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              onKeyDown={handleScannerKeyDown}
              placeholder="Scan or type a student ID, system ID, or LRN"
              className="w-full h-11 pl-9 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              autoComplete="off"
              spellCheck={false}
              disabled={isScanning}
            />
          </div>
          <button
            type="button"
            onClick={() => void processScan(scanValue)}
            disabled={isScanning || !scanValue.trim()}
            className="h-11 px-5 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
          >
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Record Scan
          </button>
        </div>

        {(scanError || lastScan) && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              scanError
                ? 'border-red-200 bg-red-50 text-red-700'
                : lastScan?.action === 'time_in'
                  ? 'border-green-100 bg-green-50 text-green-700'
                  : 'border-blue-100 bg-blue-50 text-blue-700'
            }`}
          >
            {scanError ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : lastScan?.action === 'time_in' ? (
              <LogIn className="w-4 h-4 flex-shrink-0" />
            ) : (
              <LogOut className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="font-medium leading-5">
              {scanError || `${lastScan?.studentName} ${lastScan?.action === 'time_in' ? 'timed in' : 'timed out'} at ${formatTime(lastScan?.time)}.`}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Inside Now" value={insideNow} icon={Users} tone="bg-green-50 text-green-700" />
        <StatCard label="Visits Today" value={todayLogs.length} icon={LogIn} tone="bg-amber-50 text-amber-700" />
        <StatCard label="Timed Out Today" value={todayLogs.filter((log) => log.timeOutAt).length} icon={LogOut} tone="bg-blue-50 text-blue-700" />
        <StatCard label="Students Today" value={uniqueVisitorsToday} icon={CalendarDays} tone="bg-slate-50 text-slate-700" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Library Visit Records</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Each row is one library entry session with a paired time in and time out.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 lg:min-w-[760px]">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Search</span>
                <div className="relative mt-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Name, ID, LRN"
                    className="w-full h-10 pl-9 pr-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as EntryStatusFilter)}
                  className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                >
                  <option value="all">All statuses</option>
                  <option value="inside">Inside only</option>
                  <option value="timed_out">Timed out</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Grade</span>
                <select
                  value={gradeFilter}
                  onChange={(event) => setGradeFilter(event.target.value)}
                  className="mt-1 w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                >
                  <option value="all">All grades</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDateFilter(todayKey)}
              className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              All dates
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDateFilter(todayKey);
                setStatusFilter('all');
                setGradeFilter('all');
              }}
              className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400">Loading entry logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No entry logs found.</p>
            <p className="text-xs text-gray-400 mt-1">Scan a student ID to create the first library visit record.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Student', 'Grade & Section', 'Date', 'Time In', 'Time Out', 'Duration', 'Status'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {log.student.photoUrl ? (
                              <img src={log.student.photoUrl} alt={log.student.displayName} className="w-full h-full object-cover" />
                            ) : log.student.initials ? (
                              <span className="text-xs font-bold">{log.student.initials}</span>
                            ) : (
                              <UserRound className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{log.student.displayName}</p>
                            <p className="text-xs text-gray-400 truncate">
                              {log.student.studentId || log.student.systemId || log.student.uid}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[150px] text-sm text-gray-600">
                        {[log.student.gradeLevel, log.student.section].filter(Boolean).join(' - ') || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 min-w-[130px] text-sm text-gray-600">{formatDate(log.timeInAt)}</td>
                      <td className="px-4 py-3 min-w-[120px] text-sm font-medium text-gray-800">{formatTime(log.timeInAt)}</td>
                      <td className="px-4 py-3 min-w-[120px] text-sm text-gray-600">{formatTime(log.timeOutAt)}</td>
                      <td className="px-4 py-3 min-w-[130px] text-sm text-gray-600">{formatDuration(log.timeInAt, log.timeOutAt)}</td>
                      <td className="px-4 py-3 min-w-[120px]"><EntryStatusBadge log={log} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={safePage}
              pageCount={pageCount}
              totalItems={filteredLogs.length}
              pageSize={PAGE_SIZE}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default EntryLogsPage;
