import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  UserX,
  Users,
} from 'lucide-react';
import {
  getAttendanceSummary,
  type AttendanceSummary,
} from '../../../utils/apiClient';
import { QrKiosk } from '../developer/QrKiosk';

type SecurityTab = 'overview' | 'kiosk' | 'analytics' | 'attendance';

const getManilaDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  });

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="py-12 text-center">
    <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

export const SecurityCenter: React.FC = () => {
  const [tab, setTab] = useState<SecurityTab>('overview');
  const [selectedDate, setSelectedDate] = useState(getManilaDate());
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [kioskOpen, setKioskOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setSummary(await getAttendanceSummary(selectedDate));
    } catch (err: any) {
      setError(err?.message || 'Attendance data could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const gradeRows = useMemo(
    () => Object.entries(summary?.byGrade || {}).sort(([a], [b]) => a.localeCompare(b)),
    [summary],
  );
  const maxGradeCount = Math.max(...gradeRows.map(([, count]) => count), 1);

  const stats = [
    {
      label: 'Active Students',
      value: summary?.totalStudents ?? 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Present',
      value: summary?.present ?? 0,
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Absent',
      value: summary?.absent ?? 0,
      icon: UserX,
      color: 'bg-red-50 text-red-700',
    },
    {
      label: 'Attendance Rate',
      value: `${summary?.attendanceRate ?? 0}%`,
      icon: BarChart3,
      color: 'bg-cyan-50 text-cyan-800',
    },
  ];

  const tabItems: { id: SecurityTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'kiosk', label: 'ID Scanning Kiosk', icon: ScanLine },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance Log', icon: CalendarDays },
  ];

  const renderStats = () => (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{isLoading ? '...' : value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-4">
      {renderStats()}
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <div className="bg-gradient-to-br from-cyan-950 to-slate-900 rounded-xl p-6 text-white">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-4">
            <ScanLine className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold">Student ID Scanning Kiosk</h3>
          <p className="text-sm text-white/60 mt-1 max-w-xl">
            Launch the full-screen scanner. Every valid scan records the student as present for the selected school day.
          </p>
          <button
            onClick={() => setKioskOpen(true)}
            className="mt-5 px-5 py-2.5 rounded-lg bg-white text-cyan-950 text-sm font-semibold hover:bg-cyan-50"
          >
            Launch Kiosk
          </button>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900">Recent Scans</h3>
          <div className="mt-3 divide-y divide-gray-100">
            {(summary?.records || []).slice(0, 5).map((record) => (
              <div key={record.id} className="py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-50 text-green-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{record.displayName}</p>
                  <p className="text-xs text-gray-400">
                    {[record.gradeLevel, record.section].filter(Boolean).join(' - ') || 'Unassigned'}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{formatTime(record.lastScanAt)}</span>
              </div>
            ))}
            {!isLoading && !summary?.records.length && <EmptyState message="No attendance scans yet." />}
          </div>
        </div>
      </div>
    </div>
  );

  const renderKiosk = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-cyan-50 text-cyan-900 flex items-center justify-center mx-auto">
        <ScanLine className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mt-5">Attendance Kiosk</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">
        Supports QR and Code 128 barcode scanners that type the student system ID and press Enter.
      </p>
      <button
        onClick={() => setKioskOpen(true)}
        className="mt-6 px-6 py-3 rounded-xl bg-cyan-950 text-white text-sm font-semibold hover:bg-cyan-900"
      >
        Open Full-Screen Kiosk
      </button>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-4">
      {renderStats()}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900">Present Students by Grade Level</h3>
        <div className="mt-5 space-y-4">
          {gradeRows.map(([grade, count]) => (
            <div key={grade}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-gray-700">{grade}</span>
                <span className="text-gray-500">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-700"
                  style={{ width: `${(count / maxGradeCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {!isLoading && gradeRows.length === 0 && <EmptyState message="No attendance data for this date." />}
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Daily Attendance Records</h3>
          <p className="text-xs text-gray-400 mt-0.5">{summary?.present ?? 0} student(s) present</p>
        </div>
        <button
          onClick={loadSummary}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          title="Refresh attendance"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {isLoading ? (
        <div className="p-12 text-center text-sm text-gray-400">Loading attendance...</div>
      ) : !summary?.records.length ? (
        <EmptyState message="No attendance records for this date." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Student', 'Grade & Section', 'First Scan', 'Last Scan', 'Scans', 'Status'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-gray-400">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.displayName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {[record.gradeLevel, record.section].filter(Boolean).join(' - ') || 'Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatTime(record.firstScanAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatTime(record.lastScanAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.scanCount}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Present
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">Security & Attendance</h2>
          <p className="text-sm text-gray-500 mt-0.5">Student ID scanning, daily attendance, and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500" htmlFor="attendance-date">School day</label>
          <input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {tab === 'overview' && renderOverview()}
      {tab === 'kiosk' && renderKiosk()}
      {tab === 'analytics' && renderAnalytics()}
      {tab === 'attendance' && renderAttendance()}

      {kioskOpen && (
        <QrKiosk
          onClose={() => {
            setKioskOpen(false);
            void loadSummary();
          }}
          onRecorded={() => void loadSummary()}
        />
      )}
    </div>
  );
};
