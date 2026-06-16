import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  ScanLine,
  UserX,
  Users,
} from 'lucide-react';
import {
  getAttendanceSummary,
  type AttendanceSummary,
  type AttendanceScanMode,
} from '../../../utils/apiClient';
import { readDatabase, readDatabaseOnline, writeDatabase } from '../../../utils/database';
import { QrKiosk } from '../developer/QrKiosk';

export type SecuritySection = 'overview' | 'kiosk' | 'analytics' | 'attendance' | 'settings';

interface SecurityCenterProps {
  section?: SecuritySection;
}

interface SecurityKioskSettings {
  scanMode: AttendanceScanMode;
  autoSwitchEnabled: boolean;
  timeInAt: string;
  timeOutAt: string;
}

const DEFAULT_SECURITY_KIOSK_SETTINGS: SecurityKioskSettings = {
  scanMode: 'time_in',
  autoSwitchEnabled: false,
  timeInAt: '06:00',
  timeOutAt: '15:00',
};

const MODE_LABELS: Record<AttendanceScanMode, string> = {
  time_in: 'Time in',
  time_out: 'Time out',
};

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

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }) : '-';

const parseTimeToMinutes = (value: string) => {
  const [hourValue, minuteValue] = String(value || '').split(':').map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) {
    return 15 * 60;
  }
  return (hourValue * 60) + minuteValue;
};

const getManilaCurrentMinutes = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return (Number(values.hour || 0) * 60) + Number(values.minute || 0);
};

const getAutomaticScanMode = (settings: SecurityKioskSettings): AttendanceScanMode => {
  const currentMinutes = getManilaCurrentMinutes();
  const timeInMinutes = parseTimeToMinutes(settings.timeInAt);
  const timeOutMinutes = parseTimeToMinutes(settings.timeOutAt);

  if (timeInMinutes === timeOutMinutes) {
    return settings.scanMode;
  }

  if (timeInMinutes < timeOutMinutes) {
    return currentMinutes >= timeInMinutes && currentMinutes < timeOutMinutes ? 'time_in' : 'time_out';
  }

  return currentMinutes >= timeInMinutes || currentMinutes < timeOutMinutes ? 'time_in' : 'time_out';
};

const normalizeScanMode = (value: unknown): AttendanceScanMode =>
  value === 'time_out' ? 'time_out' : 'time_in';

const normalizeSettings = (value: any): SecurityKioskSettings => ({
  scanMode: normalizeScanMode(value?.scanMode),
  autoSwitchEnabled: Boolean(value?.autoSwitchEnabled),
  timeInAt: /^\d{2}:\d{2}$/.test(String(value?.timeInAt || ''))
    ? String(value.timeInAt)
    : DEFAULT_SECURITY_KIOSK_SETTINGS.timeInAt,
  timeOutAt: /^\d{2}:\d{2}$/.test(String(value?.timeOutAt || ''))
    ? String(value.timeOutAt)
    : DEFAULT_SECURITY_KIOSK_SETTINGS.timeOutAt,
});

const formatTimeOfDay = (value: string) => {
  const [hourValue, minuteValue] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hourValue, minuteValue, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="py-12 text-center">
    <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
    <p className="text-sm text-gray-500">{message}</p>
  </div>
);

export const SecurityCenter: React.FC<SecurityCenterProps> = ({ section = 'analytics' }) => {
  const [selectedDate, setSelectedDate] = useState(getManilaDate());
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [kioskOpen, setKioskOpen] = useState(false);
  const [kioskSettings, setKioskSettings] = useState<SecurityKioskSettings>(DEFAULT_SECURITY_KIOSK_SETTINGS);
  const [scanMode, setScanMode] = useState<AttendanceScanMode>(DEFAULT_SECURITY_KIOSK_SETTINGS.scanMode);
  const [settingsMessage, setSettingsMessage] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    void readDatabaseOnline<any>('settings')
      .then((settings) => {
        if (cancelled) return;
        const nextSettings = normalizeSettings(settings?.securityKiosk);
        setKioskSettings(nextSettings);
        setScanMode(nextSettings.autoSwitchEnabled ? getAutomaticScanMode(nextSettings) : nextSettings.scanMode);
      })
      .catch(() => {
        const settings = readDatabase<any>('settings');
        const nextSettings = normalizeSettings(settings?.securityKiosk);
        setKioskSettings(nextSettings);
        setScanMode(nextSettings.autoSwitchEnabled ? getAutomaticScanMode(nextSettings) : nextSettings.scanMode);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!kioskSettings.autoSwitchEnabled) return undefined;

    const syncMode = () => setScanMode(getAutomaticScanMode(kioskSettings));
    syncMode();
    const intervalId = window.setInterval(syncMode, 30000);
    return () => window.clearInterval(intervalId);
  }, [kioskSettings.autoSwitchEnabled, kioskSettings.timeInAt, kioskSettings.timeOutAt]);

  const persistKioskSettings = useCallback((nextSettings: SecurityKioskSettings, nextMode?: AttendanceScanMode) => {
    setKioskSettings(nextSettings);
    setScanMode(nextMode || (nextSettings.autoSwitchEnabled ? getAutomaticScanMode(nextSettings) : nextSettings.scanMode));
    const currentSettings = readDatabase<any>('settings') || {};
    writeDatabase('settings', {
      ...currentSettings,
      securityKiosk: nextSettings,
    });
    setSettingsMessage('Security settings saved.');
    window.setTimeout(() => setSettingsMessage(''), 2000);
  }, []);

  const handleScanModeChange = useCallback((mode: AttendanceScanMode) => {
    const nextSettings = {
      ...kioskSettings,
      scanMode: mode,
    };
    persistKioskSettings(nextSettings, mode);
  }, [kioskSettings, persistKioskSettings]);

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

  const renderScanModeControl = (tone: 'light' | 'dark' = 'light') => {
    const isDark = tone === 'dark';
    return (
      <div className={`inline-flex rounded-xl p-1 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
        {(['time_in', 'time_out'] as AttendanceScanMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleScanModeChange(mode)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              scanMode === mode
                ? isDark
                  ? 'bg-white text-cyan-950'
                  : 'bg-white text-gray-900 shadow-sm'
                : isDark
                  ? 'text-white/55 hover:text-white'
                  : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    );
  };

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
            Launch the full-screen scanner for student time in and time out.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {renderScanModeControl('dark')}
            <span className="text-xs font-semibold text-white/45">
              Current mode: {MODE_LABELS[scanMode]}
            </span>
          </div>
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
      <div className="mt-5 flex flex-col items-center gap-2">
        {renderScanModeControl()}
        {kioskSettings.autoSwitchEnabled && (
          <p className="text-xs text-gray-400">
            Automatic switch: {MODE_LABELS.time_in} at {formatTimeOfDay(kioskSettings.timeInAt)}
            {' / '}
            {MODE_LABELS.time_out} at {formatTimeOfDay(kioskSettings.timeOutAt)}
          </p>
        )}
      </div>
      <button
        onClick={() => setKioskOpen(true)}
        className="mt-6 px-6 py-3 rounded-xl bg-cyan-950 text-white text-sm font-semibold hover:bg-cyan-900"
      >
        Open Full-Screen Kiosk
      </button>
    </div>
  );

  const renderSettings = () => (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900">Kiosk Mode</h3>
        <p className="mt-1 text-xs text-gray-400">Current scan mode: {MODE_LABELS[scanMode]}</p>
        <div className="mt-4">
          {renderScanModeControl()}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Automatic Switch</h3>
            <p className="mt-1 text-xs text-gray-400">
              {kioskSettings.autoSwitchEnabled
                ? `${MODE_LABELS.time_in} ${formatTimeOfDay(kioskSettings.timeInAt)} / ${MODE_LABELS.time_out} ${formatTimeOfDay(kioskSettings.timeOutAt)}`
                : 'Manual mode only'}
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={kioskSettings.autoSwitchEnabled}
              onChange={(event) => persistKioskSettings({
                ...kioskSettings,
                autoSwitchEnabled: event.currentTarget.checked,
              })}
              className="h-4 w-4 rounded border-gray-300 text-cyan-900 focus:ring-cyan-900"
            />
            Enabled
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Time in starts</span>
            <input
              type="time"
              value={kioskSettings.timeInAt}
              onChange={(event) => persistKioskSettings({
                ...kioskSettings,
                timeInAt: event.currentTarget.value || DEFAULT_SECURITY_KIOSK_SETTINGS.timeInAt,
              })}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
            <span className="mt-2 block rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              {formatTimeOfDay(kioskSettings.timeInAt)}
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Time out starts</span>
            <input
              type="time"
              value={kioskSettings.timeOutAt}
              onChange={(event) => persistKioskSettings({
                ...kioskSettings,
                timeOutAt: event.currentTarget.value || DEFAULT_SECURITY_KIOSK_SETTINGS.timeOutAt,
              })}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
            />
            <span className="mt-2 block rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              {formatTimeOfDay(kioskSettings.timeOutAt)}
            </span>
          </label>
        </div>

        {settingsMessage && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
            {settingsMessage}
          </p>
        )}
      </div>
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
                {['Student', 'Grade & Section', 'Time In', 'Time Out', 'Scans', 'Status'].map((heading) => (
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
                  <td className="px-4 py-3 text-sm text-gray-600">{formatTime(record.timeOutAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.scanCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs ${
                      record.timeOutAt ? 'text-cyan-700' : 'text-green-700'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {record.timeOutAt ? 'Timed out' : 'Present'}
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

      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {section === 'overview' && renderOverview()}
      {section === 'kiosk' && renderKiosk()}
      {section === 'analytics' && renderAnalytics()}
      {section === 'attendance' && renderAttendance()}
      {section === 'settings' && renderSettings()}

      {kioskOpen && (
        <QrKiosk
          onClose={() => {
            setKioskOpen(false);
            void loadSummary();
          }}
          onRecorded={() => void loadSummary()}
          scanMode={scanMode}
          onScanModeChange={handleScanModeChange}
          autoSwitchEnabled={kioskSettings.autoSwitchEnabled}
          timeInAt={kioskSettings.timeInAt}
          timeOutAt={kioskSettings.timeOutAt}
        />
      )}
    </div>
  );
};
