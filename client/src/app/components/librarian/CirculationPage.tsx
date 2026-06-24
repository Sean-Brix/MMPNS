import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Pencil,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { ApiError, scanStudentBySystemId } from '../../../utils/apiClient';
import { readDatabaseOnline, writeDatabase } from '../../../utils/database';
import { getAllStudents } from '../../../utils/studentData';
import { copyBarcodeValue } from '../../../utils/bookBarcode';
import type { BookRecord } from '../../../utils/books';
import type { UserProfile } from '../../../utils/auth';
import { ConfirmDialog } from '../common/BulkActions';
import { Modal, inputClass, labelClass } from './shared';

interface CirculationStudent {
  uid: string;
  systemId: string;
  studentId?: string;
  displayName: string;
  initials: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  lrn?: string;
  gradeLevel?: string;
  section?: string;
  status?: string;
  photoUrl?: string;
  guardianName?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
}

interface DraftBook {
  key: string;
  barcode: string;
  book: BookRecord;
  copyNumber: number;
  accession?: string;
}

interface CirculationRecord {
  id: string;
  status: 'borrowed' | 'returned';
  borrowedAt: string;
  approvedAt: string;
  approvedBy?: string;
  returnedAt?: string | null;
  updatedAt?: string;
  student: CirculationStudent;
  book: {
    id: string;
    bookId: string;
    barcode: string;
    copyNumber: number;
    accession?: string;
    title: string;
    author?: string;
    callNo?: string;
    isbn?: string;
  };
}

interface CirculationStore {
  records?: CirculationRecord[];
  lastUpdated?: string;
}

type ScanMode = 'student' | 'book';

const CIRCULATION_TABLE = 'library_circulation' as const;
const STUDENT_SYSTEM_ID_PATTERN = /^\d{2}0\d{2}0\d{2}0\d{2}0\d{2}0\d{2}$/;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (value: number) => String(value).padStart(2, '0');

const newRecordId = () =>
  `circ_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const formatDateOnly = (date: Date) =>
  new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'ST';

const normalizeScan = (value: string) =>
  value.trim().replace(/\s+/g, '');

const normalizeBookBarcode = (value: string) =>
  normalizeScan(value).toLowerCase();

const toStudentProfile = (student: any, fallbackCode: string): CirculationStudent => {
  const displayName = student.displayName ||
    [student.firstName, student.middleName ? `${student.middleName[0]}.` : null, student.lastName]
      .filter(Boolean)
      .join(' ') ||
    student.name ||
    'Student';

  return {
    uid: String(student.uid || student.id || student.studentId || fallbackCode),
    systemId: String(student.systemId || fallbackCode),
    studentId: student.studentId,
    displayName,
    initials: student.initials || initialsFor(displayName),
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    lrn: student.lrn,
    gradeLevel: student.gradeLevel,
    section: student.section,
    status: student.status,
    photoUrl: student.photoUrl,
    guardianName: student.guardianName,
    emergencyContactName: student.emergencyContactName,
    emergencyContactNumber: student.emergencyContactNumber,
  };
};

const parseBookScan = (raw: string) => {
  const code = normalizeBookBarcode(raw);
  const match = code.match(/^(\d{8})(?:c(\d+))?$/i);
  if (!match) {
    return { code, bookId: code, copyNumber: 1, hasCopySuffix: false };
  }
  return {
    code,
    bookId: match[1],
    copyNumber: Math.max(1, Number(match[2] || '1')),
    hasCopySuffix: Boolean(match[2]),
  };
};

const findBookForScan = (books: BookRecord[], raw: string): DraftBook | null => {
  const parsed = parseBookScan(raw);
  let book = books.find((item) => item.bookId.toLowerCase() === parsed.bookId.toLowerCase());
  let copyNumber = parsed.copyNumber;
  let barcode = parsed.code;

  if (!book) {
    const rawCode = normalizeScan(raw).toLowerCase();
    book = books.find((item) =>
      item.isbn.toLowerCase() === rawCode ||
      item.accessions.some((accession) => accession.toLowerCase() === rawCode),
    );

    if (!book) return null;

    const accessionIndex = book.accessions.findIndex((accession) => accession.toLowerCase() === rawCode);
    copyNumber = accessionIndex >= 0 ? accessionIndex + 1 : 1;
    barcode = copyBarcodeValue(book.bookId, copyNumber).toLowerCase();
  } else if (!parsed.hasCopySuffix && book.copies > 1) {
    copyNumber = 1;
    barcode = copyBarcodeValue(book.bookId, copyNumber).toLowerCase();
  }

  const resolvedCopy = Math.min(Math.max(copyNumber, 1), Math.max(book.copies || 1, 1));
  const resolvedBarcode = copyBarcodeValue(book.bookId, resolvedCopy).toLowerCase();

  return {
    key: resolvedBarcode,
    barcode: resolvedBarcode,
    book,
    copyNumber: resolvedCopy,
    accession: book.accessions[resolvedCopy - 1],
  };
};

const Stat: React.FC<{
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = ({ label, value, icon: Icon, tone }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${tone}`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

const DateTimePickerModal: React.FC<{
  open: boolean;
  title: string;
  description: string;
  initialValue?: string;
  confirmLabel: string;
  onConfirm: (iso: string) => void;
  onCancel: () => void;
}> = ({ open, title, description, initialValue, confirmLabel, onConfirm, onCancel }) => {
  const now = new Date();
  const initialDate = initialValue ? new Date(initialValue) : now;
  const safeInitial = Number.isNaN(initialDate.getTime()) ? now : initialDate;
  const [month, setMonth] = useState(() => new Date(safeInitial.getFullYear(), safeInitial.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(safeInitial));
  const [hour, setHour] = useState(() => {
    const h = safeInitial.getHours();
    return h % 12 === 0 ? 12 : h % 12;
  });
  const [minute, setMinute] = useState(() => Math.floor(safeInitial.getMinutes() / 5) * 5);
  const [period, setPeriod] = useState<'AM' | 'PM'>(() => safeInitial.getHours() >= 12 ? 'PM' : 'AM');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const nextInitial = initialValue ? new Date(initialValue) : new Date();
    const safe = Number.isNaN(nextInitial.getTime()) ? new Date() : nextInitial;
    setMonth(new Date(safe.getFullYear(), safe.getMonth(), 1));
    setSelectedDate(startOfDay(safe));
    setHour(safe.getHours() % 12 === 0 ? 12 : safe.getHours() % 12);
    setMinute(Math.floor(safe.getMinutes() / 5) * 5);
    setPeriod(safe.getHours() >= 12 ? 'PM' : 'AM');
    setError('');
  }, [initialValue, open]);

  const today = startOfDay(now);
  const selectedIsToday = sameDay(selectedDate, today);
  const selectedIsFuture = selectedDate.getTime() > today.getTime();
  const canGoNextMonth =
    month.getFullYear() < today.getFullYear() ||
    (month.getFullYear() === today.getFullYear() && month.getMonth() < today.getMonth());

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = first.getDay();
    const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from({ length: startOffset }, () => null);
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const resolveDateTime = () => {
    const hour24 = period === 'AM'
      ? (hour === 12 ? 0 : hour)
      : (hour === 12 ? 12 : hour + 12);
    return new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hour24,
      minute,
      0,
      0,
    );
  };

  const confirm = () => {
    const chosen = resolveDateTime();
    const current = new Date();

    if (selectedIsFuture) {
      setError('Choose today or an earlier date.');
      return;
    }

    if (chosen.getTime() > current.getTime()) {
      setError('The selected time cannot be later than now.');
      return;
    }

    onConfirm(chosen.toISOString());
  };

  const setQuickDate = (offset: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    setSelectedDate(startOfDay(date));
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setError('');
  };

  return (
    <Modal open={open} onClose={onCancel} maxW="max-w-3xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5 overflow-y-auto">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Previous month"
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <p className="text-sm font-semibold text-gray-900">
              {new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric' }).format(month)}
            </p>
            <button
              type="button"
              onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              disabled={!canGoNextMonth}
              className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next month"
            >
              <span aria-hidden="true">&gt;</span>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 p-3">
            {DAYS.map((day) => (
              <div key={day} className="h-8 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {day}
              </div>
            ))}
            {days.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="h-11" />;
              const disabled = day.getTime() > today.getTime();
              const isSelected = sameDay(day, selectedDate);
              return (
                <button
                  key={toDateKey(day)}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setSelectedDate(startOfDay(day));
                    setError('');
                  }}
                  className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-sm'
                      : disabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-amber-50'
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className={labelClass}>Quick Select</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Today', offset: 0 },
                { label: 'Yesterday', offset: 1 },
                { label: '2 days ago', offset: 2 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setQuickDate(item.offset)}
                  className="h-11 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Selected Date</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatDateOnly(selectedDate)}</p>
            <p className="text-xs text-amber-800 mt-1">
              Future dates are disabled. If today is selected, choose the exact scan approval time.
            </p>
          </div>

          <div>
            <p className={labelClass}>Time</p>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <input
                type="number"
                min={1}
                max={12}
                value={hour}
                onChange={(event) => setHour(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
                className={`${inputClass} text-center font-semibold tabular-nums`}
                aria-label="Hour"
              />
              <span className="text-gray-400 font-bold">:</span>
              <select
                value={minute}
                onChange={(event) => setMinute(Number(event.target.value))}
                className={`${inputClass} text-center font-semibold tabular-nums`}
                aria-label="Minute"
              >
                {Array.from({ length: 12 }, (_, index) => index * 5).map((value) => (
                  <option key={value} value={value}>{pad2(value)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(['AM', 'PM'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`h-10 rounded-lg border text-xs font-bold transition-colors ${
                    period === value
                      ? 'border-amber-700 bg-amber-700 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          className="h-11 px-5 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export const CirculationPage: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [records, setRecords] = useState<CirculationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scannerValue, setScannerValue] = useState('');
  const [scanMessage, setScanMessage] = useState('Ready for student scan.');
  const [scanError, setScanError] = useState('');
  const [activeStudent, setActiveStudent] = useState<CirculationStudent | null>(null);
  const [draftBooks, setDraftBooks] = useState<DraftBook[]>([]);
  const [approving, setApproving] = useState(false);
  const [editRecord, setEditRecord] = useState<CirculationRecord | null>(null);
  const [returnRecord, setReturnRecord] = useState<CirculationRecord | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const scannerRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const lastScanRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  const activeRecords = useMemo(
    () => records
      .filter((record) => record.status === 'borrowed' && !record.returnedAt)
      .sort((a, b) => new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime()),
    [records],
  );

  const returnedToday = useMemo(() => {
    const todayKey = toDateKey(new Date());
    return records.filter((record) =>
      record.status === 'returned' &&
      record.returnedAt &&
      toDateKey(new Date(record.returnedAt)) === todayKey,
    ).length;
  }, [records]);

  const scannedMode: ScanMode = activeStudent ? 'book' : 'student';
  const scannerEnabled = !approving && !editRecord && !returnRecord;

  const focusScanner = useCallback(() => {
    if (!scannerEnabled) return;
    window.setTimeout(() => scannerRef.current?.focus(), 40);
  }, [scannerEnabled]);

  const flash = (message: string) => {
    setActionMsg(message);
    window.setTimeout(() => setActionMsg(''), 4000);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bookPayload, circulationPayload] = await Promise.all([
        readDatabaseOnline<{ books?: BookRecord[] }>('books'),
        readDatabaseOnline<CirculationStore>(CIRCULATION_TABLE),
      ]);
      setBooks(Array.isArray(bookPayload?.books) ? bookPayload.books : []);
      setRecords(Array.isArray(circulationPayload?.records) ? circulationPayload.records : []);
    } catch (error) {
      console.error('Failed to load circulation data:', error);
      setScanError('Could not load circulation data. Refresh and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    focusScanner();
  }, [activeStudent, draftBooks.length, focusScanner]);

  const persistRecords = useCallback((next: CirculationRecord[]) => {
    setRecords(next);
    writeDatabase(CIRCULATION_TABLE, { records: next });
  }, []);

  const findLocalStudent = (code: string): CirculationStudent | null => {
    const q = code.toLowerCase();
    const match = getAllStudents().find((student) =>
      student.studentId.toLowerCase() === q ||
      student.id.toLowerCase() === q ||
      student.lrn.toLowerCase() === q,
    );

    return match ? toStudentProfile(match, code) : null;
  };

  const findStudent = async (code: string): Promise<CirculationStudent | null> => {
    const localFirst = findLocalStudent(code);
    if (localFirst && !STUDENT_SYSTEM_ID_PATTERN.test(code)) {
      return localFirst;
    }

    if (!STUDENT_SYSTEM_ID_PATTERN.test(code)) {
      return localFirst;
    }

    try {
      const result = await scanStudentBySystemId(code);
      return toStudentProfile(result.student, code);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 400 || error.status === 403 || error.status === 404)) {
        return localFirst;
      }
      throw error;
    }
  };

  const openStudent = (student: CirculationStudent) => {
    setActiveStudent(student);
    setDraftBooks([]);
    setScanError('');
    setScanMessage(`Student found. Scan books for ${student.displayName}.`);
  };

  const addBookScan = (raw: string) => {
    const draft = findBookForScan(books, raw);
    if (!draft) {
      setScanError(`No book matches ${raw}.`);
      setScanMessage('Scan another book barcode.');
      return;
    }

    if (draftBooks.some((item) => item.key === draft.key)) {
      setScanError(`${draft.book.title} copy ${draft.copyNumber} is already in this approval list.`);
      return;
    }

    const existingBorrow = activeRecords.find((record) => record.book.barcode.toLowerCase() === draft.key);
    if (existingBorrow) {
      setScanError(`${draft.book.title} copy ${draft.copyNumber} is already borrowed by ${existingBorrow.student.displayName}.`);
      return;
    }

    setDraftBooks((prev) => [...prev, draft]);
    setScanError('');
    setScanMessage(`${draft.book.title} copy ${draft.copyNumber} added.`);
  };

  const processScan = useCallback(async (raw: string) => {
    const code = normalizeScan(raw);
    if (!code || processingRef.current) return;

    const scanKey = `${scannedMode}:${code.toLowerCase()}`;
    const nowMs = Date.now();
    if (lastScanRef.current.key === scanKey && nowMs - lastScanRef.current.at < 700) {
      setScannerValue('');
      return;
    }
    lastScanRef.current = { key: scanKey, at: nowMs };

    processingRef.current = true;
    setScannerValue('');
    setScanError('');

    try {
      if (scannedMode === 'student') {
        setScanMessage(`Looking for student ${code}...`);
        const student = await findStudent(code);
        if (!student) {
          setScanMessage('Ready for student scan.');
          setScanError(`No student record matches ${code}.`);
          return;
        }
        openStudent(student);
        return;
      }

      addBookScan(code);
    } catch (error) {
      console.error('Scan failed:', error);
      setScanMessage(scannedMode === 'student' ? 'Ready for student scan.' : 'Scan another book barcode.');
      setScanError('Scan lookup failed. Check the connection and try again.');
    } finally {
      processingRef.current = false;
      focusScanner();
    }
  }, [activeRecords, books, draftBooks, focusScanner, scannedMode]);

  const handleScannerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setScannerValue(value);
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      void processScan(value);
    }, 180);
  };

  const handleScannerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void processScan(scannerValue);
  };

  const resetStudentSession = () => {
    setActiveStudent(null);
    setDraftBooks([]);
    setScanError('');
    setScanMessage('Ready for student scan.');
    focusScanner();
  };

  const approveDraft = (borrowedAt: string) => {
    if (!activeStudent || draftBooks.length === 0) return;

    const nowIso = new Date().toISOString();
    const nextRecords: CirculationRecord[] = [
      ...draftBooks.map((draft) => ({
        id: newRecordId(),
        status: 'borrowed' as const,
        borrowedAt,
        approvedAt: nowIso,
        approvedBy: user.displayName || user.username,
        returnedAt: null,
        student: activeStudent,
        book: {
          id: draft.book.id,
          bookId: draft.book.bookId,
          barcode: draft.barcode,
          copyNumber: draft.copyNumber,
          accession: draft.accession,
          title: draft.book.title,
          author: draft.book.author,
          callNo: draft.book.callNo,
          isbn: draft.book.isbn,
        },
      })),
      ...records,
    ];

    persistRecords(nextRecords);
    flash(`${draftBooks.length} book${draftBooks.length === 1 ? '' : 's'} approved for ${activeStudent.displayName}.`);
    setApproving(false);
    resetStudentSession();
  };

  const updateBorrowedDate = (borrowedAt: string) => {
    if (!editRecord) return;
    const next = records.map((record) =>
      record.id === editRecord.id
        ? { ...record, borrowedAt, updatedAt: new Date().toISOString() }
        : record,
    );
    persistRecords(next);
    flash('Borrow date and time updated.');
    setEditRecord(null);
    focusScanner();
  };

  const markReturned = () => {
    if (!returnRecord) return;
    const returnedAt = new Date().toISOString();
    const next = records.map((record) =>
      record.id === returnRecord.id
        ? { ...record, status: 'returned' as const, returnedAt, updatedAt: returnedAt }
        : record,
    );
    persistRecords(next);
    flash(`${returnRecord.book.title} marked as returned.`);
    setReturnRecord(null);
    focusScanner();
  };

  return (
    <div className="space-y-4" onMouseDown={focusScanner}>
      <input
        ref={scannerRef}
        value={scannerValue}
        onChange={handleScannerChange}
        onKeyDown={handleScannerKeyDown}
        disabled={!scannerEnabled}
        autoComplete="off"
        aria-label={scannedMode === 'student' ? 'Hidden student scanner input' : 'Hidden book scanner input'}
        className="fixed left-[-1000px] top-[-1000px] h-px w-px opacity-0"
      />

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ScanLine className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900">Circulation</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Scan a student ID first, then scan each book copy for approval.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className={`min-h-11 px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${
            scanError ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-100 bg-amber-50 text-amber-800'
          }`}>
            {scanError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <ScanLine className="w-4 h-4 flex-shrink-0" />}
            <span className="font-medium">{scanError || scanMessage}</span>
          </div>
          <button
            type="button"
            onClick={load}
            className="h-11 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">{actionMsg}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Currently Borrowed" value={activeRecords.length} icon={BookMarked} tone="bg-blue-50 text-blue-700" />
        <Stat label="Returned Today" value={returnedToday} icon={RotateCcw} tone="bg-green-50 text-green-700" />
        <Stat label="Catalog Titles" value={books.length} icon={BookOpen} tone="bg-amber-50 text-amber-700" />
        <Stat label="Scanner Mode" value={scannedMode === 'student' ? 'Student' : 'Book'} icon={ScanLine} tone="bg-slate-50 text-slate-700" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">Currently Borrowed</p>
            <p className="text-xs text-gray-400 mt-0.5">Edit the borrow date/time, or remove a row to mark it as returned.</p>
          </div>
          <span className="text-xs text-gray-400">{activeRecords.length} active record{activeRecords.length === 1 ? '' : 's'}</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading circulation records...</div>
        ) : activeRecords.length === 0 ? (
          <div className="p-10 text-center">
            <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No books are currently borrowed.</p>
            <p className="text-xs text-gray-400 mt-1">Keep this page open and scan a student ID to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Student</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Book / Copy</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Barcode</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Borrowed</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 min-w-[190px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {record.student.photoUrl
                            ? <img src={record.student.photoUrl} alt={record.student.displayName} className="w-full h-full object-cover" />
                            : <span className="text-xs font-bold">{record.student.initials}</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{record.student.displayName}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {record.student.gradeLevel || 'Student'}{record.student.section ? ` - ${record.student.section}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[220px]">
                      <p className="text-sm font-medium text-gray-900">{record.book.title}</p>
                      <p className="text-xs text-gray-400">
                        Copy {record.book.copyNumber}{record.book.accession ? ` - Acc. ${record.book.accession}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="font-mono text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">{record.book.barcode}</span>
                    </td>
                    <td className="px-4 py-3 min-w-[160px]">
                      <p className="text-sm text-gray-700">{formatDateTime(record.borrowedAt)}</p>
                      <p className="text-xs text-gray-400">Approved by {record.approvedBy || 'Librarian'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditRecord(record)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Edit borrow date and time"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReturnRecord(record)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Mark as returned"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!activeStudent} onClose={resetStudentSession} maxW="max-w-6xl">
        {activeStudent && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Borrowing Approval</p>
                <p className="text-xs text-gray-400 mt-0.5">Scan book barcodes, then approve the full list.</p>
              </div>
              <button
                type="button"
                onClick={resetStudentSession}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-[520px] overflow-y-auto">
              <aside className="border-b lg:border-b-0 lg:border-r border-gray-100 p-5 bg-amber-50/35">
                <div className="flex flex-col items-center text-center">
                  <div className="w-32 h-32 rounded-2xl bg-white border border-amber-100 shadow-sm flex items-center justify-center overflow-hidden">
                    {activeStudent.photoUrl
                      ? <img src={activeStudent.photoUrl} alt={activeStudent.displayName} className="w-full h-full object-cover" />
                      : <UserRound className="w-14 h-14 text-amber-200" />}
                  </div>
                  <p className="mt-4 text-lg font-semibold text-gray-900">{activeStudent.displayName}</p>
                  <p className="text-sm text-gray-500">
                    {activeStudent.gradeLevel || 'Student'}{activeStudent.section ? ` - ${activeStudent.section}` : ''}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    ['System ID', activeStudent.systemId],
                    ['Student ID', activeStudent.studentId],
                    ['LRN', activeStudent.lrn],
                    ['Status', activeStudent.status || 'active'],
                    ['Emergency Contact', activeStudent.emergencyContactName || activeStudent.guardianName],
                    ['Contact No.', activeStudent.emergencyContactNumber],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white border border-amber-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                      <p className="text-sm text-gray-800 mt-0.5 break-words">{value || '-'}</p>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="p-5 flex flex-col min-h-[520px]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Books to Borrow</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Scanner mode is set to books until this approval is closed.
                    </p>
                  </div>
                  <div className="px-3 py-2 rounded-lg border border-amber-100 bg-amber-50 text-amber-800 text-sm font-medium flex items-center gap-2">
                    <ScanLine className="w-4 h-4" />
                    Waiting for book scan
                  </div>
                </div>

                <div className="flex-1 py-4">
                  {draftBooks.length === 0 ? (
                    <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center border border-dashed border-gray-200 rounded-xl">
                      <BookOpen className="w-12 h-12 text-gray-200 mb-3" />
                      <p className="text-sm font-medium text-gray-600">No books scanned yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Scan a book barcode to add it to this student's list.</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Book</th>
                            <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Copy</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {draftBooks.map((draft) => (
                            <tr key={draft.key}>
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-gray-900">{draft.book.title}</p>
                                <p className="text-xs text-gray-400">
                                  {draft.book.author || 'Unknown author'} - <span className="font-mono">{draft.barcode}</span>
                                </p>
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <p className="text-sm text-gray-700">Copy {draft.copyNumber}</p>
                                <p className="text-xs text-gray-400">{draft.accession ? `Acc. ${draft.accession}` : 'No accession'}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setDraftBooks((prev) => prev.filter((item) => item.key !== draft.key))}
                                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Remove from approval list"
                                >
                                  <X size={15} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={resetStudentSession}
                    className="h-11 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setApproving(true)}
                    disabled={draftBooks.length === 0}
                    className="h-11 px-5 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve {draftBooks.length > 0 ? `(${draftBooks.length})` : ''}
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </Modal>

      <DateTimePickerModal
        open={approving}
        title="Approve Borrowing"
        description="Choose the recorded borrow date. Today requires an exact time."
        confirmLabel="Record Borrowing"
        onConfirm={approveDraft}
        onCancel={() => {
          setApproving(false);
          focusScanner();
        }}
      />

      <DateTimePickerModal
        open={!!editRecord}
        title="Edit Borrow Date"
        description="Adjust the saved date and time for this borrowed book."
        initialValue={editRecord?.borrowedAt}
        confirmLabel="Save Date"
        onConfirm={updateBorrowedDate}
        onCancel={() => {
          setEditRecord(null);
          focusScanner();
        }}
      />

      <ConfirmDialog
        open={!!returnRecord}
        title="Mark as returned"
        intent="danger"
        message={
          <>
            Remove <span className="font-medium text-gray-700">{returnRecord?.book.title}</span> from the active borrowed list?
            The record will be kept and marked as returned.
          </>
        }
        confirmLabel="Mark Returned"
        onConfirm={markReturned}
        onCancel={() => {
          setReturnRecord(null);
          focusScanner();
        }}
      />
    </div>
  );
};
