import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Clock3, Hash, ScanLine, UserRound, Wifi, X } from 'lucide-react';
import {
  recordAttendanceScan,
  type AttendanceRecord,
  type AttendanceScanMode,
} from '../../../utils/apiClient';

const SCHOOL_LOGO_SRC = '/images/brand/logo.png';
const KIOSK_BACKGROUND_SRC = '/images/homepage/hero1.png';

const SYSTEM_ID_PATTERN = /^\d{2}0\d{2}0\d{2}0\d{2}0\d{2}0\d{2}$/;

const validateSystemId = (raw: string) => {
  const s = raw.trim();
  if (s.length !== 17) return { valid: false, reason: `Expected 17 digits, got ${s.length}.` };
  if (!SYSTEM_ID_PATTERN.test(s)) return { valid: false, reason: 'Format mismatch - check QR code.' };
  return { valid: true, reason: undefined };
};

interface KioskStudent {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  lrn?: string;
  photoUrl?: string;
}

type KioskState = 'welcome' | 'loading' | 'found' | 'not_found' | 'invalid';

const MODE_LABELS: Record<AttendanceScanMode, string> = {
  time_in: 'Time in',
  time_out: 'Time out',
};

const formatTimeOfDay = (value?: string) => {
  const [hourValue, minuteValue] = String(value || '15:00').split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hourValue) ? hourValue : 15, Number.isFinite(minuteValue) ? minuteValue : 0, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

const formatScanTime = (attendance: AttendanceRecord, scanMode: AttendanceScanMode) => {
  const recordedAt = scanMode === 'time_out'
    ? attendance.timeOutAt || attendance.lastScanAt
    : attendance.firstScanAt || attendance.lastScanAt;
  if (!recordedAt) return '-';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(recordedAt));
};

const WelcomeView: React.FC = () => (
  <motion.div
    key="welcome"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, scale: 0.96 }}
    transition={{ duration: 0.3 }}
    className="flex h-full w-full flex-col items-center justify-center gap-10 px-8 text-center"
  >
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white p-2 shadow-2xl shadow-black/25">
        <img src={SCHOOL_LOGO_SRC} alt="MMPNS logo" className="h-full w-full object-contain" />
      </div>
      <div>
        <p className="text-xl font-semibold tracking-wide text-white/85">Madre Maria Pia Notari School</p>
        <p className="mt-1 text-sm uppercase tracking-widest text-white/40">Student Attendance System</p>
      </div>
    </div>

    <motion.div
      animate={{ opacity: [0.45, 1, 0.45], scale: [0.97, 1.03, 0.97] }}
      transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
      className="relative flex h-52 w-52 items-center justify-center"
    >
      {[
        'left-0 top-0 rounded-tl-2xl border-l-4 border-t-4',
        'right-0 top-0 rounded-tr-2xl border-r-4 border-t-4',
        'bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4',
        'bottom-0 right-0 rounded-br-2xl border-b-4 border-r-4',
      ].map((cls) => (
        <span key={cls} className={`absolute h-10 w-10 border-white/55 ${cls}`} />
      ))}
      <ScanLine className="h-24 w-24 text-white/50" />
    </motion.div>

    <div className="space-y-3">
      <p className="font-black tracking-tight text-white" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
        SCAN YOUR STUDENT ID
      </p>
      <p className="text-xl text-white/55">Hold the QR code in front of the scanner</p>
    </div>
  </motion.div>
);

const LoadingView: React.FC = () => (
  <motion.div
    key="loading"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex flex-col items-center gap-6"
  >
    <div className="h-20 w-20 animate-spin rounded-full border-4 border-white/10 border-t-white/80" />
    <p className="text-xl text-white/60">Verifying student...</p>
  </motion.div>
);

const FoundView: React.FC<{
  student: KioskStudent;
  attendance: AttendanceRecord;
  isFirstScan: boolean;
  scanMode: AttendanceScanMode;
}> = ({ student, attendance, isFirstScan, scanMode }) => {
  const initials = `${student.firstName?.[0] ?? ''}${student.lastName?.[0] ?? ''}`.toUpperCase();
  const fullName = student.displayName || [student.firstName, student.lastName].filter(Boolean).join(' ') || '-';
  const recordedAt = formatScanTime(attendance, scanMode);
  const modeLabel = MODE_LABELS[scanMode];
  const scanCount = scanMode === 'time_out'
    ? attendance.timeOutScanCount || attendance.scanCount
    : attendance.timeInScanCount || attendance.scanCount;

  return (
    <motion.div
      key="found"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
      className="flex h-full w-full items-center justify-center px-6 py-8 md:px-12 lg:px-20"
    >
      <div className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/20 bg-white/92 shadow-2xl shadow-black/35">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#185C20]/10 px-6 py-5 md:px-8">
          <div className="flex items-center gap-4">
            <img src={SCHOOL_LOGO_SRC} alt="MMPNS logo" className="h-14 w-14 rounded-full bg-white object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#185C20]/50">Student ID Scan</p>
              <p className="text-xl font-black text-[#185C20] md:text-2xl">Attendance Recorded</p>
            </div>
          </div>
          <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
            {isFirstScan ? `${modeLabel} saved` : `${modeLabel} saved - scan ${scanCount}`}
          </span>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 p-6 md:p-8 lg:grid-cols-[minmax(220px,320px)_1fr]">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#185C20]/45">Photo</p>
            <div
              className="mx-auto overflow-hidden rounded-3xl border border-[#185C20]/15 bg-[#185C20]/5 shadow-xl shadow-[#185C20]/10 lg:mx-0"
              style={{ width: 'min(100%, 320px)', aspectRatio: '1 / 1' }}
            >
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-[#185C20]/35">
                  <UserRound className="h-20 w-20" />
                  <span className="text-5xl font-black">{initials || '-'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-[#185C20]/10 bg-[#185C20]/[0.03] p-5">
              <div className="mb-2 flex items-center gap-2 text-[#185C20]/45">
                <UserRound size={16} />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">Full Name</p>
              </div>
              <p className="break-words font-black leading-tight text-[#185C20]" style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)' }}>
                {fullName}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#185C20]/10 bg-white p-5">
                <div className="mb-2 flex items-center gap-2 text-[#185C20]/45">
                  <Clock3 size={16} />
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">{modeLabel}</p>
                </div>
                <p className="text-2xl font-black leading-snug text-[#185C20]">{recordedAt}</p>
              </div>

              <div className="rounded-2xl border border-[#185C20]/10 bg-white p-5">
                <div className="mb-2 flex items-center gap-2 text-[#185C20]/45">
                  <Hash size={16} />
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">LRN</p>
                </div>
                <p className="break-all font-mono text-3xl font-black leading-tight text-[#185C20]">
                  {student.lrn || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ErrorView: React.FC<{ type: 'not_found' | 'invalid'; message: string }> = ({ type, message }) => (
  <motion.div
    key="error"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0 }}
    transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
    className="flex flex-col items-center gap-8 px-8 text-center"
  >
    <div className="flex h-36 w-36 items-center justify-center rounded-full border-2 border-red-400/30 bg-red-500/10">
      <AlertCircle className="h-16 w-16 text-red-400" />
    </div>
    <div className="space-y-3">
      <p className="font-black text-white" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
        {type === 'not_found' ? 'Student Not Found' : 'Invalid QR Code'}
      </p>
      <p className="max-w-lg text-xl text-white/50">{message}</p>
    </div>
    <p className="animate-pulse text-lg text-white/30">Scan next student ID...</p>
  </motion.div>
);

export const QrKiosk: React.FC<{
  onClose: () => void;
  onRecorded?: () => void;
  scanMode: AttendanceScanMode;
  onScanModeChange?: (mode: AttendanceScanMode) => void;
  autoSwitchEnabled?: boolean;
  timeInAt?: string;
  timeOutAt?: string;
}> = ({
  onClose,
  onRecorded,
  scanMode,
  onScanModeChange,
  autoSwitchEnabled = false,
  timeInAt = '06:00',
  timeOutAt = '15:00',
}) => {
  const [kioskState, setKioskState] = useState<KioskState>('welcome');
  const [inputValue, setInputValue] = useState('');
  const [student, setStudent] = useState<KioskStudent | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [isFirstScan, setIsFirstScan] = useState(false);
  const [recordedMode, setRecordedMode] = useState<AttendanceScanMode>(scanMode);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scanIdRef = useRef(0);

  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    focus();
    const id = setInterval(focus, 1000);
    return () => clearInterval(id);
  }, []);

  const handleScan = useCallback(async (raw: string) => {
    const trimmed = raw.replace(/[\r\n\t\s]/g, '').trim();
    if (!trimmed) return;

    const { valid, reason } = validateSystemId(trimmed);
    if (!valid) {
      setErrorMsg(reason ?? 'Invalid QR code.');
      setKioskState('invalid');
      return;
    }

    const thisScan = ++scanIdRef.current;
    const modeForScan = scanMode;
    setKioskState('loading');

    try {
      const res = await recordAttendanceScan(trimmed, modeForScan);
      if (thisScan !== scanIdRef.current) return;
      setStudent(res.student);
      setAttendance(res.attendance);
      setIsFirstScan(res.isFirstScan);
      setRecordedMode(res.scanMode || modeForScan);
      setKioskState('found');
      onRecorded?.();
    } catch (err: any) {
      if (thisScan !== scanIdRef.current) return;
      if (err?.status === 404) {
        setErrorMsg('No student found with this QR code.');
        setKioskState('not_found');
      } else {
        setErrorMsg('Connection error. Try again.');
        setKioskState('invalid');
      }
    }
  }, [onRecorded, scanMode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = inputValue;
      setInputValue('');
      void handleScan(val);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex select-none flex-col bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `linear-gradient(rgba(7, 9, 26, 0.72), rgba(7, 9, 26, 0.78)), url(${KIOSK_BACKGROUND_SRC})` }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/20 px-8 py-5 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <img src={SCHOOL_LOGO_SRC} alt="MMPNS logo" className="h-12 w-12 rounded-full bg-white object-contain p-1.5 shadow-lg" />
          <div>
            <p className="text-base font-bold leading-tight text-white">MMPNS Attendance Kiosk</p>
            <p className="text-xs tracking-wide text-white/40">Scan student ID to record attendance</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex rounded-2xl border border-white/15 bg-white/10 p-1">
            {(['time_in', 'time_out'] as AttendanceScanMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onScanModeChange?.(mode);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  scanMode === mode
                    ? 'bg-white text-[#185C20] shadow-lg shadow-black/20'
                    : 'text-white/55 hover:bg-white/10 hover:text-white'
                }`}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
          {autoSwitchEnabled && (
            <span className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/45">
              Auto {MODE_LABELS.time_in} {formatTimeOfDay(timeInAt)}
              {' / '}
              {MODE_LABELS.time_out} {formatTimeOfDay(timeOutAt)}
            </span>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            <X size={15} />
            Exit Kiosk
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {kioskState === 'welcome' && <div className="absolute inset-0 flex items-center justify-center"><WelcomeView /></div>}
          {kioskState === 'loading' && <div className="absolute inset-0 flex items-center justify-center"><LoadingView /></div>}
          {kioskState === 'found' && student && attendance && (
            <div className="absolute inset-0 flex items-center">
              <FoundView
                student={student}
                attendance={attendance}
                isFirstScan={isFirstScan}
                scanMode={recordedMode}
              />
            </div>
          )}
          {(kioskState === 'not_found' || kioskState === 'invalid') && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ErrorView type={kioskState as 'not_found' | 'invalid'} message={errorMsg} />
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-shrink-0 items-center justify-between border-t border-white/10 bg-black/20 px-8 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 text-sm text-white/35">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <Wifi size={13} />
          <span>Scanner active - scan anytime</span>
        </div>
        {kioskState !== 'welcome' && kioskState !== 'loading' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-white/30"
          >
            Scan next student ID at any time
          </motion.p>
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pointer-events-none fixed h-px w-px opacity-0"
        autoFocus
        tabIndex={0}
        aria-hidden="true"
      />
    </div>
  );
};
