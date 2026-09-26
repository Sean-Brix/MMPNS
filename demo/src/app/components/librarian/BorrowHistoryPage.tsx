import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookMarked, ChevronRight, RefreshCw, RotateCcw, UserRound } from 'lucide-react';
import { readDatabaseOnline } from '../../../utils/database';
import {
  BooksDetailModal,
  CIRCULATION_TABLE,
  type CirculationRecord,
  type CirculationStore,
  StatusBadge,
  formatDateTime,
  isReturnedStatus,
  normalizeCirculationRecords,
} from './CirculationPage';

interface BorrowHistoryRecord extends CirculationRecord {
  latestReturnedAt: string;
  returnedBookCount: number;
}

const timestampOf = (iso?: string | null) => {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : 0;
};

const buildBorrowHistoryRecords = (records: CirculationRecord[]): BorrowHistoryRecord[] => {
  const grouped = new Map<string, BorrowHistoryRecord>();

  records.forEach((record) => {
    const returnedBooks = record.books.filter((book) => isReturnedStatus(book.status) && book.returnedAt);
    if (returnedBooks.length === 0) return;

    const studentKey = record.student.uid || record.student.systemId || record.student.displayName;
    const latestReturnedAt = returnedBooks
      .map((book) => book.returnedAt || '')
      .sort((a, b) => timestampOf(b) - timestampOf(a))[0] || record.returnedAt || record.updatedAt || record.borrowedAt;

    const existing = grouped.get(studentKey);
    if (!existing) {
      grouped.set(studentKey, {
        ...record,
        id: `history_${studentKey}`,
        status: returnedBooks.some((book) => book.status === 'late_returned') ? 'late_returned' : 'returned',
        returnedAt: latestReturnedAt,
        latestReturnedAt,
        returnedBookCount: returnedBooks.length,
        books: [...returnedBooks].sort((a, b) => timestampOf(b.returnedAt) - timestampOf(a.returnedAt)),
      });
      return;
    }

    const books = [...existing.books, ...returnedBooks]
      .sort((a, b) => timestampOf(b.returnedAt) - timestampOf(a.returnedAt));
    const nextLatest = timestampOf(latestReturnedAt) > timestampOf(existing.latestReturnedAt)
      ? latestReturnedAt
      : existing.latestReturnedAt;

    grouped.set(studentKey, {
      ...existing,
      status: existing.status === 'late_returned' || returnedBooks.some((book) => book.status === 'late_returned')
        ? 'late_returned'
        : 'returned',
      returnedAt: nextLatest,
      latestReturnedAt: nextLatest,
      returnedBookCount: books.length,
      books,
    });
  });

  return Array.from(grouped.values())
    .sort((a, b) => timestampOf(b.latestReturnedAt) - timestampOf(a.latestReturnedAt));
};

export const BorrowHistoryPage: React.FC = () => {
  const [records, setRecords] = useState<CirculationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailsRecord, setDetailsRecord] = useState<BorrowHistoryRecord | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await readDatabaseOnline<CirculationStore>(CIRCULATION_TABLE);
      setRecords(normalizeCirculationRecords(payload?.records));
    } catch (error) {
      console.error('Failed to load borrow history:', error);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const historyRecords = useMemo(() => buildBorrowHistoryRecords(records), [records]);
  const returnedBooks = useMemo(
    () => historyRecords.reduce((count, record) => count + record.returnedBookCount, 0),
    [historyRecords],
  );
  const lateReturnedBooks = useMemo(
    () => historyRecords.reduce((count, record) =>
      count + record.books.filter((book) => book.status === 'late_returned').length, 0),
    [historyRecords],
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Borrow History</h3>
          <p className="text-xs text-gray-500 mt-0.5">Returned books grouped by student.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-11 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
            <BookMarked className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{historyRecords.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Students</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-green-50 text-green-700 flex items-center justify-center mb-3">
            <RotateCcw className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{returnedBooks}</p>
          <p className="text-xs text-gray-500 mt-0.5">Returned Books</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center mb-3">
            <RotateCcw className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{lateReturnedBooks}</p>
          <p className="text-xs text-gray-500 mt-0.5">Late Returned</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm">Returned Borrowing Records</p>
            <p className="text-xs text-gray-400 mt-0.5">Each row is one student. Open the row to view returned books.</p>
          </div>
          <span className="text-xs text-gray-400">{historyRecords.length} student{historyRecords.length === 1 ? '' : 's'}</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading borrow history...</div>
        ) : historyRecords.length === 0 ? (
          <div className="p-10 text-center">
            <BookMarked className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No returned books yet.</p>
            <p className="text-xs text-gray-400 mt-1">Returned borrowing records will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Student</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Returned Books</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Latest Return</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historyRecords.map((record) => (
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
                    className="hover:bg-green-50/40 transition-colors cursor-pointer focus:outline-none focus:bg-green-50"
                  >
                    <td className="px-4 py-3 min-w-[220px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 text-green-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {record.student.photoUrl
                            ? <img src={record.student.photoUrl} alt={record.student.displayName} className="w-full h-full object-cover" />
                            : record.student.initials
                              ? <span className="text-xs font-bold">{record.student.initials}</span>
                              : <UserRound className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{record.student.displayName}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {record.student.gradeLevel || 'Student'}{record.student.section ? ` - ${record.student.section}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[240px]">
                      <p className="text-sm font-semibold text-gray-900">{record.returnedBookCount} returned book{record.returnedBookCount === 1 ? '' : 's'}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {record.books[0]?.title}{record.books.length > 1 ? ` +${record.books.length - 1} more` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell min-w-[170px]">
                      <p className="text-sm text-gray-700">{formatDateTime(record.latestReturnedAt)}</p>
                      <p className="text-xs text-gray-400">Most recent return</p>
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
                            setDetailsRecord(record);
                          }}
                          className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          View Status
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BooksDetailModal
        record={detailsRecord}
        title="Borrow History"
        description={detailsRecord ? `${detailsRecord.student.displayName} - ${detailsRecord.returnedBookCount} returned book${detailsRecord.returnedBookCount === 1 ? '' : 's'}` : undefined}
        showActions={false}
        onClose={() => setDetailsRecord(null)}
      />
    </div>
  );
};
