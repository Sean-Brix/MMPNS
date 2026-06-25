import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Pencil,
  RefreshCw,
  RotateCcw,
  ScanLine,
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

interface CirculationBook {
  id: string;
  bookId: string;
  barcode: string;
  copyNumber: number;
  accession?: string;
  title: string;
  author?: string;
  callNo?: string;
  isbn?: string;
  status: CirculationStatus;
  borrowedAt?: string;
  dueAt?: string;
  returnedAt?: string | null;
  updatedAt?: string;
}

type CirculationStatus = 'borrowed' | 'returned' | 'late_returned' | 'not_returned';

interface CirculationRecord {
  id: string;
  status: CirculationStatus;
  borrowedAt: string;
  dueAt: string;
  approvedAt: string;
  approvedBy?: string;
  returnedAt?: string | null;
  updatedAt?: string;
  student: CirculationStudent;
  books: CirculationBook[];
}

interface CirculationStore {
  records?: unknown[];
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

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

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

const CIRCULATION_STATUSES: CirculationStatus[] = ['borrowed', 'returned', 'late_returned', 'not_returned'];

const isCirculationStatus = (value: unknown): value is CirculationStatus =>
  typeof value === 'string' && CIRCULATION_STATUSES.includes(value as CirculationStatus);

const isReturnedStatus = (status: CirculationStatus) =>
  status === 'returned' || status === 'late_returned';

const isActiveStatus = (status: CirculationStatus) =>
  status === 'borrowed' || status === 'not_returned';

const timestampOf = (iso?: string | null) => {
  if (!iso) return Number.NaN;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : Number.NaN;
};

const isPastDue = (dueAt: string, now = new Date()) => {
  const dueTime = timestampOf(dueAt);
  return Number.isFinite(dueTime) && dueTime < now.getTime();
};

const isLateReturn = (dueAt: string, returnedAt: string) => {
  const dueTime = timestampOf(dueAt);
  const returnedTime = timestampOf(returnedAt);
  return Number.isFinite(dueTime) && Number.isFinite(returnedTime) && returnedTime > dueTime;
};

const resolveActiveStatus = (dueAt: string, now = new Date()): CirculationStatus =>
  isPastDue(dueAt, now) ? 'not_returned' : 'borrowed';

const resolveReturnedStatus = (dueAt: string, returnedAt: string): CirculationStatus =>
  isLateReturn(dueAt, returnedAt) ? 'late_returned' : 'returned';

const statusLabel = (status: CirculationStatus) => {
  switch (status) {
    case 'late_returned':
      return 'Late Returned';
    case 'not_returned':
      return 'Not Returned';
    case 'returned':
      return 'Returned';
    default:
      return 'Borrowed';
  }
};

const STATUS_BADGE_CLASS: Record<CirculationStatus, string> = {
  borrowed: 'bg-blue-50 text-blue-700 border-blue-100',
  returned: 'bg-green-50 text-green-700 border-green-100',
  late_returned: 'bg-orange-50 text-orange-700 border-orange-100',
  not_returned: 'bg-red-50 text-red-700 border-red-100',
};

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

const toBookSnapshot = (draft: DraftBook): CirculationBook => ({
  id: draft.book.id,
  bookId: draft.book.bookId,
  barcode: draft.barcode,
  copyNumber: draft.copyNumber,
  accession: draft.accession,
  title: draft.book.title,
  author: draft.book.author,
  callNo: draft.book.callNo,
  isbn: draft.book.isbn,
  status: 'borrowed',
  returnedAt: null,
});

const normalizeBookSnapshot = (
  value: any,
  fallback: {
    borrowedAt: string;
    dueAt: string;
    status: CirculationStatus;
    returnedAt?: string | null;
    updatedAt?: string;
  },
): CirculationBook | null => {
  if (!value || typeof value !== 'object') return null;
  const barcode = String(value.barcode || value.bookId || '').toLowerCase();
  const title = String(value.title || '').trim();
  if (!barcode || !title) return null;

  const rawStatus = isCirculationStatus(value.status) ? value.status : fallback.status;
  const returnedAt = value.returnedAt || (isReturnedStatus(rawStatus) ? fallback.returnedAt || fallback.updatedAt || null : null);
  const status = returnedAt
    ? resolveReturnedStatus(fallback.dueAt, String(returnedAt))
    : resolveActiveStatus(fallback.dueAt);

  return {
    id: String(value.id || value.bookId || barcode),
    bookId: String(value.bookId || barcode),
    barcode,
    copyNumber: Math.max(1, Number(value.copyNumber || 1)),
    accession: value.accession,
    title,
    author: value.author,
    callNo: value.callNo,
    isbn: value.isbn,
    status,
    borrowedAt: value.borrowedAt || fallback.borrowedAt,
    dueAt: value.dueAt || fallback.dueAt,
    returnedAt,
    updatedAt: value.updatedAt,
  };
};

const latestReturnedAt = (books: CirculationBook[]) => {
  let latest: string | null = null;
  books.forEach((book) => {
    if (!book.returnedAt) return;
    if (!latest || timestampOf(book.returnedAt) > timestampOf(latest)) {
      latest = book.returnedAt;
    }
  });
  return latest;
};

const applyRecordLifecycle = (record: CirculationRecord, now = new Date()): CirculationRecord => {
  const books = record.books.map((book) => {
    const bookDueAt = book.dueAt || record.dueAt;
    const bookBorrowedAt = book.borrowedAt || record.borrowedAt;
    const status = book.returnedAt
      ? resolveReturnedStatus(bookDueAt, book.returnedAt)
      : resolveActiveStatus(bookDueAt, now);

    return {
      ...book,
      status,
      borrowedAt: bookBorrowedAt,
      dueAt: bookDueAt,
    };
  });

  const activeBooks = books.filter((book) => isActiveStatus(book.status));
  const status: CirculationStatus = activeBooks.length > 0
    ? (activeBooks.some((book) => book.status === 'not_returned') ? 'not_returned' : 'borrowed')
    : (books.some((book) => book.status === 'late_returned') ? 'late_returned' : 'returned');

  return {
    ...record,
    status,
    returnedAt: activeBooks.length === 0 ? latestReturnedAt(books) : null,
    books,
  };
};

const getOpenBooks = (record: CirculationRecord) =>
  record.books.filter((book) => isActiveStatus(book.status));

const markBookReturnedInRecord = (
  record: CirculationRecord,
  barcode: string,
  returnedAt: string,
) => applyRecordLifecycle({
  ...record,
  updatedAt: returnedAt,
  books: record.books.map((book) =>
    book.barcode.toLowerCase() === barcode.toLowerCase() && isActiveStatus(book.status)
      ? {
          ...book,
          status: resolveReturnedStatus(book.dueAt || record.dueAt, returnedAt),
          returnedAt,
          updatedAt: returnedAt,
        }
      : book,
  ),
}, new Date(returnedAt));

const markOpenBooksReturnedInRecord = (
  record: CirculationRecord,
  returnedAt: string,
) => applyRecordLifecycle({
  ...record,
  updatedAt: returnedAt,
  books: record.books.map((book) =>
    isActiveStatus(book.status)
      ? {
          ...book,
          status: resolveReturnedStatus(book.dueAt || record.dueAt, returnedAt),
          returnedAt,
          updatedAt: returnedAt,
        }
      : book,
  ),
}, new Date(returnedAt));

const normalizeCirculationRecord = (value: any): CirculationRecord | null => {
  if (!value || typeof value !== 'object' || !value.student) return null;

  const borrowedAt = String(value.borrowedAt || value.approvedAt || new Date().toISOString());
  const dueAt = String(value.dueAt || value.expectedReturnAt || value.returnDueAt || value.borrowedAt || borrowedAt);
  const rawStatus = isCirculationStatus(value.status) ? value.status : 'borrowed';
  const returnedAt = value.returnedAt || null;
  const rawBooks = Array.isArray(value.books) ? value.books : [value.book].filter(Boolean);
  const books = rawBooks
    .map((book) => normalizeBookSnapshot(book, {
      borrowedAt,
      dueAt,
      status: rawStatus,
      returnedAt,
      updatedAt: value.updatedAt,
    }))
    .filter((book): book is CirculationBook => Boolean(book));

  if (books.length === 0) return null;

  return applyRecordLifecycle({
    id: String(value.id || newRecordId()),
    status: rawStatus,
    borrowedAt,
    dueAt,
    approvedAt: String(value.approvedAt || borrowedAt),
    approvedBy: value.approvedBy,
    returnedAt,
    updatedAt: value.updatedAt,
    student: value.student,
    books,
  });
};

const normalizeCirculationRecords = (values?: unknown[]): CirculationRecord[] => {
  if (!Array.isArray(values)) return [];

  const grouped = new Map<string, CirculationRecord>();
  values.forEach((value) => {
    const record = normalizeCirculationRecord(value);
    if (!record) return;

    const groupKey = [
      record.status,
      record.student.uid,
      record.borrowedAt,
      record.dueAt,
      record.approvedAt,
      record.returnedAt || '',
    ].join('|');

    const existing = grouped.get(groupKey);
    if (!existing) {
      grouped.set(groupKey, { ...record, books: [...record.books] });
      return;
    }

    const existingBookKeys = new Set(existing.books.map((book) => book.barcode.toLowerCase()));
    record.books.forEach((book) => {
      if (!existingBookKeys.has(book.barcode.toLowerCase())) {
        existing.books.push(book);
        existingBookKeys.add(book.barcode.toLowerCase());
      }
    });
  });

  return Array.from(grouped.values()).map((record) => applyRecordLifecycle(record));
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

const StatusBadge: React.FC<{ status: CirculationStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_CLASS[status]}`}>
    {statusLabel(status)}
  </span>
);

const FutureDateTimePickerModal: React.FC<{
  open: boolean;
  title: string;
  description: string;
  initialValue?: string;
  confirmLabel: string;
  onConfirm: (iso: string) => void;
  onCancel: () => void;
}> = ({ open, title, description, initialValue, confirmLabel, onConfirm, onCancel }) => {
  const getInitialDate = useCallback(() => {
    const current = new Date();
    const fallback = addDays(current, 7);
    const candidate = initialValue ? new Date(initialValue) : fallback;
    if (Number.isNaN(candidate.getTime()) || candidate.getTime() <= current.getTime()) {
      return fallback;
    }
    return candidate;
  }, [initialValue]);

  const initialDate = getInitialDate();
  const [month, setMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(initialDate));
  const [hour, setHour] = useState(() => {
    const h = initialDate.getHours();
    return h % 12 === 0 ? 12 : h % 12;
  });
  const [minute, setMinute] = useState(() => Math.floor(initialDate.getMinutes() / 5) * 5);
  const [period, setPeriod] = useState<'AM' | 'PM'>(() => initialDate.getHours() >= 12 ? 'PM' : 'AM');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const safe = getInitialDate();
    setMonth(new Date(safe.getFullYear(), safe.getMonth(), 1));
    setSelectedDate(startOfDay(safe));
    setHour(safe.getHours() % 12 === 0 ? 12 : safe.getHours() % 12);
    setMinute(Math.floor(safe.getMinutes() / 5) * 5);
    setPeriod(safe.getHours() >= 12 ? 'PM' : 'AM');
    setError('');
  }, [getInitialDate, open]);

  const now = new Date();
  const today = startOfDay(now);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const selectedIsToday = sameDay(selectedDate, today);
  const canGoPrevMonth = month.getTime() > currentMonth.getTime();

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

    if (chosen.getTime() <= current.getTime()) {
      setError('Return date and time must be later than now.');
      return;
    }

    onConfirm(chosen.toISOString());
  };

  const setQuickDate = (daysFromToday: number) => {
    const current = new Date();
    const date = addDays(current, daysFromToday);
    setSelectedDate(startOfDay(date));
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setHour(date.getHours() % 12 === 0 ? 12 : date.getHours() % 12);
    setMinute(Math.floor(date.getMinutes() / 5) * 5);
    setPeriod(date.getHours() >= 12 ? 'PM' : 'AM');
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
              disabled={!canGoPrevMonth}
              className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              className="w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
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
              const disabled = day.getTime() < today.getTime();
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
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: '7 days', days: 7 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setQuickDate(item.days)}
                  className="h-11 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Selected Return Date</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatDateOnly(selectedDate)}</p>
            <p className="text-xs text-amber-800 mt-1">
              Past dates are disabled. If today is selected, the time must still be later than now.
            </p>
          </div>

          <div>
            <p className={labelClass}>Return Time</p>
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
            {selectedIsToday && (
              <p className="mt-2 text-xs text-amber-700">Today is allowed only when the return time is still in the future.</p>
            )}
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

const BooksDetailModal: React.FC<{
  record: CirculationRecord | null;
  onClose: () => void;
  onEditDueDate: (record: CirculationRecord) => void;
  onReturn: (record: CirculationRecord) => void;
}> = ({ record, onClose, onEditDueDate, onReturn }) => (
  <Modal open={!!record} onClose={onClose} maxW="max-w-4xl">
    {record && (
      <>
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Borrowing Details</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {record.student.displayName} - {getOpenBooks(record).length} of {record.books.length} book{record.books.length === 1 ? '' : 's'} still out
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-2xl bg-white border border-amber-100 flex items-center justify-center overflow-hidden">
                  {record.student.photoUrl
                    ? <img src={record.student.photoUrl} alt={record.student.displayName} className="w-full h-full object-cover" />
                    : <UserRound className="w-11 h-11 text-amber-200" />}
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">{record.student.displayName}</p>
                <p className="text-xs text-gray-500">
                  {record.student.gradeLevel || 'Student'}{record.student.section ? ` - ${record.student.section}` : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Borrowed</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatDateTime(record.borrowedAt)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Return Date</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatDateTime(record.dueAt)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Approved By</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{record.approvedBy || 'Librarian'}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</p>
                <div className="mt-2"><StatusBadge status={record.status} /></div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Book</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Copy</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Barcode</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {record.books.map((book) => (
                  <tr key={book.barcode}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{book.title}</p>
                      <p className="text-xs text-gray-400">{book.author || 'Unknown author'}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-gray-700">Copy {book.copyNumber}</p>
                      <p className="text-xs text-gray-400">{book.accession ? `Acc. ${book.accession}` : 'No accession'}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">{book.barcode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={book.status} />
                      {book.returnedAt && (
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(book.returnedAt)}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => onEditDueDate(record)}
            className="h-11 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white transition-colors flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit Return Date
          </button>
          <button
            type="button"
            onClick={() => onReturn(record)}
            className="h-11 px-4 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Mark All Returned
          </button>
        </div>
      </>
    )}
  </Modal>
);

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
  const [detailsRecord, setDetailsRecord] = useState<CirculationRecord | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [nowTick, setNowTick] = useState(() => Date.now());

  const scannerRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const lastScanRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  const currentRecords = useMemo(
    () => records.map((record) => applyRecordLifecycle(record, new Date(nowTick))),
    [nowTick, records],
  );

  const activeRecords = useMemo(
    () => currentRecords
      .filter((record) => getOpenBooks(record).length > 0)
      .sort((a, b) => new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime()),
    [currentRecords],
  );

  const activeBookBarcodes = useMemo(() => {
    const set = new Set<string>();
    activeRecords.forEach((record) => {
      getOpenBooks(record).forEach((book) => set.add(book.barcode.toLowerCase()));
    });
    return set;
  }, [activeRecords]);

  const booksOut = useMemo(
    () => activeRecords.reduce((sum, record) => sum + getOpenBooks(record).length, 0),
    [activeRecords],
  );

  const returnedToday = useMemo(() => {
    const todayKey = toDateKey(new Date());
    return currentRecords.reduce((count, record) => (
      count + record.books.filter((book) =>
        isReturnedStatus(book.status) &&
        book.returnedAt &&
        toDateKey(new Date(book.returnedAt)) === todayKey,
      ).length
    ), 0);
  }, [currentRecords]);

  const notReturnedBooks = useMemo(
    () => currentRecords.reduce((count, record) =>
      count + record.books.filter((book) => book.status === 'not_returned').length, 0),
    [currentRecords],
  );

  const overdueBooks = useMemo(
    () => currentRecords
      .flatMap((record) => record.books
        .filter((book) => book.status === 'not_returned')
        .map((book) => ({ record, book })))
      .sort((a, b) => timestampOf(a.book.dueAt || a.record.dueAt) - timestampOf(b.book.dueAt || b.record.dueAt)),
    [currentRecords],
  );

  const scannedMode: ScanMode = activeStudent ? 'book' : 'student';
  const scannerEnabled = !approving && !editRecord && !returnRecord && !detailsRecord;

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
      setRecords(normalizeCirculationRecords(circulationPayload?.records));
    } catch (error) {
      console.error('Failed to load circulation data:', error);
      setScanError('Could not load circulation data. Refresh and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    focusScanner();
  }, [activeStudent, draftBooks.length, focusScanner]);

  const persistRecords = useCallback((next: CirculationRecord[]) => {
    const nextRecords = next.map((record) => applyRecordLifecycle(record));
    setRecords(nextRecords);
    writeDatabase(CIRCULATION_TABLE, { records: nextRecords });
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

  const findActiveLoanByScan = useCallback((raw: string): { record: CirculationRecord; book: CirculationBook } | null => {
    const draft = findBookForScan(books, raw);
    const candidates = new Set<string>([normalizeBookBarcode(raw), parseBookScan(raw).code.toLowerCase()]);
    if (draft) {
      candidates.add(draft.key.toLowerCase());
    }

    for (const record of currentRecords) {
      for (const book of record.books) {
        if (isActiveStatus(book.status) && candidates.has(book.barcode.toLowerCase())) {
          return { record, book };
        }
      }
    }

    return null;
  }, [books, currentRecords]);

  const returnBorrowedBookScan = useCallback((raw: string) => {
    const match = findActiveLoanByScan(raw);
    if (!match) return false;

    const returnedAt = new Date().toISOString();
    const nextRecord = markBookReturnedInRecord(match.record, match.book.barcode, returnedAt);
    const nextBook = nextRecord.books.find((book) => book.barcode.toLowerCase() === match.book.barcode.toLowerCase()) || match.book;
    const nextRecords = currentRecords.map((record) =>
      record.id === match.record.id ? nextRecord : record,
    );

    persistRecords(nextRecords);
    setDraftBooks((prev) => prev.filter((draft) => draft.key.toLowerCase() !== match.book.barcode.toLowerCase()));
    setDetailsRecord((current) => current && current.id === match.record.id ? nextRecord : current);
    setScanError('');
    setScanMessage(`${match.book.title} copy ${match.book.copyNumber} marked as ${statusLabel(nextBook.status).toLowerCase()} for ${match.record.student.displayName}.`);
    flash(`${match.book.title} copy ${match.book.copyNumber} marked as ${statusLabel(nextBook.status).toLowerCase()}.`);
    return true;
  }, [currentRecords, findActiveLoanByScan, persistRecords]);

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

    if (activeBookBarcodes.has(draft.key.toLowerCase())) {
      const currentBorrower = activeRecords.find((record) =>
        record.books.some((book) => isActiveStatus(book.status) && book.barcode.toLowerCase() === draft.key.toLowerCase()),
      );
      setScanError(`${draft.book.title} copy ${draft.copyNumber} is already borrowed by ${currentBorrower?.student.displayName || 'another student'}.`);
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
      if (returnBorrowedBookScan(code)) {
        return;
      }

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
  }, [activeBookBarcodes, activeRecords, books, draftBooks, focusScanner, returnBorrowedBookScan, scannedMode]);

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

  const approveDraft = (dueAt: string) => {
    if (!activeStudent || draftBooks.length === 0) return;

    const nowIso = new Date().toISOString();
    const record: CirculationRecord = {
      id: newRecordId(),
      status: 'borrowed',
      borrowedAt: nowIso,
      dueAt,
      approvedAt: nowIso,
      approvedBy: user.displayName || user.username,
      returnedAt: null,
      student: activeStudent,
      books: draftBooks.map((draft) => ({
        ...toBookSnapshot(draft),
        status: 'borrowed',
        borrowedAt: nowIso,
        dueAt,
        returnedAt: null,
      })),
    };

    persistRecords([record, ...currentRecords]);
    flash(`${draftBooks.length} book${draftBooks.length === 1 ? '' : 's'} approved for ${activeStudent.displayName}.`);
    setApproving(false);
    resetStudentSession();
  };

  const updateDueDate = (dueAt: string) => {
    if (!editRecord) return;
    const updatedAt = new Date().toISOString();
    let updatedRecord: CirculationRecord | null = null;
    const next = currentRecords.map((record) => {
      if (record.id !== editRecord.id) return record;
      updatedRecord = applyRecordLifecycle({
        ...record,
        dueAt,
        updatedAt,
        books: record.books.map((book) => ({
          ...book,
          dueAt,
          updatedAt: isActiveStatus(book.status) ? updatedAt : book.updatedAt,
        })),
      });
      return updatedRecord;
    });
    persistRecords(next);
    flash('Return date and time updated.');
    setEditRecord(null);
    setDetailsRecord((current) => current && current.id === editRecord.id ? updatedRecord : current);
    focusScanner();
  };

  const markReturned = () => {
    if (!returnRecord) return;
    const returnedAt = new Date().toISOString();
    let returnedRecord: CirculationRecord | null = null;
    const next = currentRecords.map((record) => {
      if (record.id !== returnRecord.id) return record;
      returnedRecord = markOpenBooksReturnedInRecord(record, returnedAt);
      return returnedRecord;
    });
    const returnedCount = returnRecord.books.filter((book) => isActiveStatus(book.status)).length;
    persistRecords(next);
    flash(`${returnedCount} book${returnedCount === 1 ? '' : 's'} marked as returned for ${returnRecord.student.displayName}.`);
    setReturnRecord(null);
    setDetailsRecord((current) => current && current.id === returnRecord.id ? returnedRecord : current);
    focusScanner();
  };

  const openEditFromDetails = (record: CirculationRecord) => {
    setDetailsRecord(null);
    setEditRecord(record);
  };

  const openReturnFromDetails = (record: CirculationRecord) => {
    setDetailsRecord(null);
    setReturnRecord(record);
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
                Scan a student ID first, scan each book copy, then set the future return date.
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

      {overdueBooks.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-800">
                {overdueBooks.length} book{overdueBooks.length === 1 ? '' : 's'} not returned
              </p>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {overdueBooks.slice(0, 4).map(({ record, book }) => (
                  <div key={`${record.id}-${book.barcode}`} className="rounded-lg border border-red-100 bg-white/70 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{book.title}</p>
                    <p className="text-xs text-red-700">
                      {record.student.displayName} - due {formatDateTime(book.dueAt || record.dueAt)}
                    </p>
                  </div>
                ))}
              </div>
              {overdueBooks.length > 4 && (
                <p className="mt-2 text-xs font-medium text-red-700">+{overdueBooks.length - 4} more overdue book{overdueBooks.length - 4 === 1 ? '' : 's'}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Active Records" value={activeRecords.length} icon={BookMarked} tone="bg-blue-50 text-blue-700" />
        <Stat label="Books Out" value={booksOut} icon={BookOpen} tone="bg-amber-50 text-amber-700" />
        <Stat label="Not Returned" value={notReturnedBooks} icon={AlertCircle} tone="bg-red-50 text-red-700" />
        <Stat label="Returned Today" value={returnedToday} icon={RotateCcw} tone="bg-green-50 text-green-700" />
        <Stat label="Scanner Mode" value={scannedMode === 'student' ? 'Student' : 'Book'} icon={ScanLine} tone="bg-slate-50 text-slate-700" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">Active Borrowing Records</p>
            <p className="text-xs text-gray-400 mt-0.5">Each row is one student borrowing session. Click a row to see the books.</p>
          </div>
          <span className="text-xs text-gray-400">{activeRecords.length} active record{activeRecords.length === 1 ? '' : 's'}</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading circulation records...</div>
        ) : activeRecords.length === 0 ? (
          <div className="p-10 text-center">
            <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No active borrowing records.</p>
            <p className="text-xs text-gray-400 mt-1">Keep this page open and scan a student ID to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Student</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Books</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Borrowed</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Return Date</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeRecords.map((record) => {
                  const openBooks = getOpenBooks(record);
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
                      className="hover:bg-amber-50/30 transition-colors cursor-pointer focus:outline-none focus:bg-amber-50/50"
                    >
                      <td className="px-4 py-3 min-w-[210px]">
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
                      <td className="px-4 py-3 min-w-[190px]">
                        <p className="text-sm font-semibold text-gray-900">{openBooks.length} of {record.books.length} out</p>
                        <p className="text-xs text-gray-400 truncate">{openBooks[0]?.title || record.books[0]?.title}{openBooks.length > 1 ? ` +${openBooks.length - 1} more` : ''}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell min-w-[160px]">
                        <p className="text-sm text-gray-700">{formatDateTime(record.borrowedAt)}</p>
                        <p className="text-xs text-gray-400">Approved by {record.approvedBy || 'Librarian'}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <p className="text-sm font-medium text-gray-800">{formatDateTime(record.dueAt)}</p>
                        <p className="text-xs text-gray-400">Expected return</p>
                      </td>
                      <td className="px-4 py-3 min-w-[130px]">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditRecord(record);
                            }}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Edit return date and time"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setReturnRecord(record);
                            }}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                            title="Mark open books as returned"
                          >
                            <RotateCcw size={15} />
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

      <Modal open={!!activeStudent} onClose={resetStudentSession} maxW="max-w-6xl">
        {activeStudent && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Borrowing Approval</p>
                <p className="text-xs text-gray-400 mt-0.5">Scan book barcodes, then set the return date for this borrowing.</p>
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
                      All scanned books will be saved as one borrowing record for this student.
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
                    Set Return Date {draftBooks.length > 0 ? `(${draftBooks.length})` : ''}
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
      </Modal>

      <FutureDateTimePickerModal
        open={approving}
        title="Set Return Date"
        description="Choose when these books should be returned. Past dates are not accepted."
        confirmLabel="Record Borrowing"
        onConfirm={approveDraft}
        onCancel={() => {
          setApproving(false);
          focusScanner();
        }}
      />

      <FutureDateTimePickerModal
        open={!!editRecord}
        title="Edit Return Date"
        description="Choose a new future return date and time for this borrowing record."
        initialValue={editRecord?.dueAt}
        confirmLabel="Save Return Date"
        onConfirm={updateDueDate}
        onCancel={() => {
          setEditRecord(null);
          focusScanner();
        }}
      />

      <BooksDetailModal
        record={detailsRecord}
        onClose={() => {
          setDetailsRecord(null);
          focusScanner();
        }}
        onEditDueDate={openEditFromDetails}
        onReturn={openReturnFromDetails}
      />

      <ConfirmDialog
        open={!!returnRecord}
        title="Mark open books as returned"
        intent="primary"
        message={
          <>
            Mark <span className="font-medium text-gray-700">{returnRecord?.student.displayName}</span>'s borrowing record
            with {returnRecord ? getOpenBooks(returnRecord).length : 0} open book{returnRecord && getOpenBooks(returnRecord).length === 1 ? '' : 's'} as returned?
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
