import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
  AlertCircle, BookCopy, BookMarked, BookOpen, CheckCircle2, Clock,
  Layers, RefreshCw, TrendingUp, Users,
} from 'lucide-react';
import { readDatabaseOnline } from '../../../utils/database';
import type { BookRecord } from '../../../utils/books';
import type { UserProfile } from '../../../utils/auth';
import {
  CIRCULATION_TABLE,
  type CirculationRecord,
  type CirculationStatus,
  type CirculationStore,
  applyRecordLifecycle,
  formatDateTime,
  getOpenBooks,
  isReturnedStatus,
  normalizeCirculationRecords,
} from './CirculationPage';
import { AnimatedCard, AnimatedStatCard, TONES } from './dashboardKit';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const STATUS_COLORS: Record<CirculationStatus, string> = {
  borrowed: '#2563eb',
  returned: '#16a34a',
  late_returned: '#ea580c',
  not_returned: '#dc2626',
};

const STATUS_NAMES: Record<CirculationStatus, string> = {
  borrowed: 'Borrowed',
  returned: 'Returned',
  late_returned: 'Late Returned',
  not_returned: 'Not Returned',
};

export const LibrarianDashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [records, setRecords] = useState<CirculationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bookPayload, circulationPayload] = await Promise.all([
        readDatabaseOnline<{ books?: BookRecord[] }>('books'),
        readDatabaseOnline<CirculationStore>(CIRCULATION_TABLE),
      ]);
      setBooks(Array.isArray(bookPayload?.books) ? bookPayload.books : []);
      setRecords(
        normalizeCirculationRecords(circulationPayload?.records).map((record) => applyRecordLifecycle(record)),
      );
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalTitles = books.length;
    const totalCopies = books.reduce((sum, book) => sum + (Number(book.copies) || 1), 0);
    const todayKey = dateKey(new Date());

    let currentlyBorrowed = 0;
    let overdue = 0;
    let returnedToday = 0;
    const activeBorrowers = new Set<string>();

    records.forEach((record) => {
      const open = getOpenBooks(record);
      if (open.length > 0) {
        activeBorrowers.add(record.student.uid || record.student.systemId || record.student.displayName);
      }
      record.books.forEach((book) => {
        if (book.status === 'borrowed' || book.status === 'not_returned') currentlyBorrowed += 1;
        if (book.status === 'not_returned') overdue += 1;
        if (isReturnedStatus(book.status) && book.returnedAt && dateKey(new Date(book.returnedAt)) === todayKey) {
          returnedToday += 1;
        }
      });
    });

    return { totalTitles, totalCopies, currentlyBorrowed, overdue, returnedToday, activeBorrowers: activeBorrowers.size };
  }, [books, records]);

  // ─── Activity: last 7 days ──────────────────────────────────────────────────
  const activity = useMemo(() => {
    const today = new Date();
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
      return { key: dateKey(day), label: WEEKDAYS[day.getDay()], borrowed: 0, returned: 0 };
    });
    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    records.forEach((record) => {
      record.books.forEach((book) => {
        const borrowedAt = book.borrowedAt || record.borrowedAt;
        if (borrowedAt) {
          const bucket = byKey.get(dateKey(new Date(borrowedAt)));
          if (bucket) bucket.borrowed += 1;
        }
        if (book.returnedAt) {
          const bucket = byKey.get(dateKey(new Date(book.returnedAt)));
          if (bucket) bucket.returned += 1;
        }
      });
    });

    return buckets;
  }, [records]);

  // ─── Status distribution ────────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const counts: Record<CirculationStatus, number> = {
      borrowed: 0, returned: 0, late_returned: 0, not_returned: 0,
    };
    records.forEach((record) => record.books.forEach((book) => { counts[book.status] += 1; }));
    return (Object.keys(counts) as CirculationStatus[])
      .map((status) => ({ name: STATUS_NAMES[status], value: counts[status], color: STATUS_COLORS[status] }))
      .filter((entry) => entry.value > 0);
  }, [records]);

  // ─── Top borrowed books ─────────────────────────────────────────────────────
  const topBooks = useMemo(() => {
    const counts = new Map<string, number>();
    records.forEach((record) => record.books.forEach((book) => {
      counts.set(book.title, (counts.get(book.title) || 0) + 1);
    }));
    return Array.from(counts.entries())
      .map(([title, count]) => ({ title: title.length > 22 ? `${title.slice(0, 21)}…` : title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [records]);

  // ─── Recent loans ───────────────────────────────────────────────────────────
  const recentLoans = useMemo(
    () => [...records]
      .sort((a, b) => new Date(b.borrowedAt).getTime() - new Date(a.borrowedAt).getTime())
      .slice(0, 6),
    [records],
  );

  const hasActivity = records.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Welcome, {user.displayName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Library Management Dashboard</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <AnimatedStatCard label="Book Titles"        value={stats.totalTitles}      icon={BookCopy}     tone={TONES.amber}  index={0} hint={`${stats.totalCopies.toLocaleString()} copies`} />
        <AnimatedStatCard label="Currently Borrowed" value={stats.currentlyBorrowed} icon={BookMarked}  tone={TONES.blue}   index={1} />
        <AnimatedStatCard label="Overdue Books"      value={stats.overdue}          icon={AlertCircle}  tone={TONES.red}    index={2} />
        <AnimatedStatCard label="Returned Today"     value={stats.returnedToday}    icon={CheckCircle2} tone={TONES.green}  index={3} />
        <AnimatedStatCard label="Active Borrowers"   value={stats.activeBorrowers}  icon={Users}        tone={TONES.purple} index={4} />
        <AnimatedStatCard label="Total Copies"       value={stats.totalCopies}      icon={Layers}       tone={TONES.orange} index={5} />
      </div>

      {/* Activity + status charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AnimatedCard className="lg:col-span-2 p-4" index={0}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Borrowing Activity</h3>
            <span className="text-xs text-gray-400 ml-auto">Last 7 days</span>
          </div>
          {hasActivity ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={activity} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBorrowed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gReturned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                  cursor={{ stroke: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="borrowed" name="Borrowed" stroke="#2563eb" strokeWidth={2.5} fill="url(#gBorrowed)" animationDuration={900} />
                <Area type="monotone" dataKey="returned" name="Returned" stroke="#16a34a" strokeWidth={2.5} fill="url(#gReturned)" animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty icon={TrendingUp} text="Borrowing activity will appear here." />
          )}
        </AnimatedCard>

        <AnimatedCard className="p-4" index={1}>
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Book Status</h3>
          </div>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    animationDuration={900}
                  >
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {statusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-gray-600">{entry.name}</span>
                    <span className="text-xs font-semibold text-gray-900 ml-auto tabular-nums">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ChartEmpty icon={Layers} text="No circulation records yet." />
          )}
        </AnimatedCard>
      </div>

      {/* Top books + recent loans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatedCard className="p-4" index={0}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Top Borrowed Books</h3>
          </div>
          {topBooks.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(160, topBooks.length * 46)}>
              <BarChart data={topBooks} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="title" width={140} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ fill: '#fef3c7', opacity: 0.4 }} />
                <Bar dataKey="count" name="Times borrowed" fill="#d97706" radius={[0, 6, 6, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty icon={BookOpen} text="No books have been borrowed yet." />
          )}
        </AnimatedCard>

        <AnimatedCard className="p-4" index={1}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Loans</h3>
          </div>
          {recentLoans.length > 0 ? (
            <div className="space-y-2">
              {recentLoans.map((record) => {
                const open = getOpenBooks(record).length;
                return (
                  <div key={record.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {record.student.photoUrl
                        ? <img src={record.student.photoUrl} alt={record.student.displayName} className="w-full h-full object-cover" />
                        : <span className="text-[11px] font-bold">{record.student.initials || 'ST'}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{record.student.displayName}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {record.books.length} book{record.books.length === 1 ? '' : 's'}
                        {open > 0 ? ` · ${open} out` : ' · all returned'}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-400 flex-shrink-0 hidden sm:block">{formatDateTime(record.borrowedAt)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <ChartEmpty icon={Clock} text="No recent loans." />
          )}
        </AnimatedCard>
      </div>
    </div>
  );
};

const ChartEmpty: React.FC<{ icon: React.ComponentType<{ className?: string }>; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Icon className="w-10 h-10 text-gray-200 mb-2" />
    <p className="text-sm text-gray-400">{text}</p>
  </div>
);

export default LibrarianDashboard;
