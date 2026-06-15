import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanLine, X, CheckCircle2, AlertCircle, Wifi, MapPin, Hash, Calendar, Clock3 } from 'lucide-react';
import {
  recordAttendanceScan,
  type AttendanceRecord,
} from '../../../utils/apiClient';

// ─── Validation ───────────────────────────────────────────────────────────────
const SYSTEM_ID_PATTERN = /^\d{2}0\d{2}0\d{2}0\d{2}0\d{2}0\d{2}$/;

const validateSystemId = (raw: string) => {
  const s = raw.trim();
  if (s.length !== 17) return { valid: false, reason: `Expected 17 digits, got ${s.length}.` };
  if (!SYSTEM_ID_PATTERN.test(s)) return { valid: false, reason: 'Format mismatch — check QR code.' };
  return { valid: true, reason: undefined };
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface KioskStudent {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  lrn?: string;
  province?: string;
  city?: string;
  photoUrl?: string;
  status?: string;
  createdAt?: string;
  gradeLevel?: string;
  section?: string;
}

type KioskState = 'welcome' | 'loading' | 'found' | 'not_found' | 'invalid';

// ─── Sub-views ────────────────────────────────────────────────────────────────

const WelcomeView: React.FC = () => (
  <motion.div
    key="welcome"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, scale: 0.96 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center justify-center gap-10 w-full h-full text-center px-8"
  >
    {/* School branding */}
    <div className="flex flex-col items-center gap-4">
      <div className="w-20 h-20 rounded-2xl bg-[#EDCD1F] flex items-center justify-center shadow-2xl shadow-yellow-400/20">
        <span className="text-[#185C20] font-black text-4xl">M</span>
      </div>
      <div>
        <p className="text-white/80 text-xl font-semibold tracking-wide">Madre Maria Pia Notari School</p>
        <p className="text-white/30 text-sm mt-1 tracking-widest uppercase">Student Attendance System</p>
      </div>
    </div>

    {/* Scan icon */}
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4], scale: [0.97, 1.03, 0.97] }}
      transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
      className="relative w-52 h-52 flex items-center justify-center"
    >
      {/* Corner brackets */}
      {[
        'top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl',
        'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl',
        'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl',
        'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl',
      ].map((cls, i) => (
        <span key={i} className={`absolute w-10 h-10 border-white/50 ${cls}`} />
      ))}
      <ScanLine className="w-24 h-24 text-white/40" />
    </motion.div>

    {/* Instruction */}
    <div className="space-y-3">
      <p className="text-white font-black tracking-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
        SCAN YOUR STUDENT ID
      </p>
      <p className="text-white/40 text-xl">
        Hold the QR code in front of the scanner
      </p>
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
    <div className="w-20 h-20 rounded-full border-4 border-white/10 border-t-white/80 animate-spin" />
    <p className="text-white/50 text-xl">Verifying student...</p>
  </motion.div>
);

const FoundView: React.FC<{
  student: KioskStudent;
  attendance: AttendanceRecord;
  isFirstScan: boolean;
}> = ({ student, attendance, isFirstScan }) => {
  const initials = (student.firstName?.[0] ?? '') + (student.lastName?.[0] ?? '');
  const regDate = student.createdAt
    ? new Date(student.createdAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <motion.div
      key="found"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
      className="flex items-center gap-16 w-full h-full px-16"
    >
      {/* Photo — left side */}
      <div className="flex-shrink-0 flex flex-col items-center gap-6">
        <div
          className="rounded-3xl overflow-hidden border-4 border-green-400/60 shadow-2xl shadow-green-500/20"
          style={{ width: 'clamp(180px, 22vw, 320px)', height: 'clamp(180px, 22vw, 320px)' }}
        >
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <span className="font-black text-white/30" style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}>
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2.5 px-6 py-2.5 rounded-full border font-semibold text-lg ${
          student.status === 'active'
            ? 'bg-green-500/15 border-green-400/30 text-green-300'
            : 'bg-red-500/15 border-red-400/30 text-red-300'
        }`}>
          <CheckCircle2 size={20} />
          {student.status === 'active' ? 'Active Student' : 'Inactive'}
        </div>
      </div>

      {/* Info — right side */}
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        {/* Name */}
        <div>
          <p className="text-white/40 uppercase tracking-widest text-sm mb-2">Student</p>
          <p className="text-white font-black leading-tight break-words"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)' }}>
            {student.displayName}
          </p>
          <p className="text-white/40 text-lg mt-2">
            {[student.gradeLevel, student.section].filter(Boolean).join(' - ') || 'Grade and section not assigned'}
          </p>
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: Hash, label: 'LRN', value: student.lrn ?? '—' },
            { icon: Calendar, label: 'Registered', value: regDate },
            { icon: MapPin, label: 'Province', value: student.province ?? '—' },
            { icon: MapPin, label: 'City / Municipality', value: student.city ?? '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/6 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-white/30 mb-2">
                <Icon size={14} />
                <p className="text-xs uppercase tracking-widest">{label}</p>
              </div>
              <p className="text-white font-bold text-xl truncate">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-green-400/20 bg-green-400/10 p-5">
          <div className="w-12 h-12 rounded-full bg-green-400/15 flex items-center justify-center">
            <Clock3 className="w-6 h-6 text-green-300" />
          </div>
          <div>
            <p className="text-green-200 font-semibold">
              {isFirstScan ? 'Attendance recorded' : 'Attendance scan updated'}
            </p>
            <p className="text-green-100/50 text-sm mt-0.5">
              {new Date(attendance.lastScanAt).toLocaleTimeString('en-PH', {
                timeZone: 'Asia/Manila',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {attendance.scanCount > 1 ? ` - scan ${attendance.scanCount}` : ''}
            </p>
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
    className="flex flex-col items-center gap-8 text-center px-8"
  >
    <div className="w-36 h-36 rounded-full bg-red-500/10 border-2 border-red-400/30 flex items-center justify-center">
      <AlertCircle className="w-16 h-16 text-red-400" />
    </div>
    <div className="space-y-3">
      <p className="text-white font-black" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)' }}>
        {type === 'not_found' ? 'Student Not Found' : 'Invalid QR Code'}
      </p>
      <p className="text-white/40 text-xl max-w-lg">{message}</p>
    </div>
    <p className="text-white/20 text-lg animate-pulse">Scan next student ID...</p>
  </motion.div>
);

// ─── Main Kiosk ───────────────────────────────────────────────────────────────

export const QrKiosk: React.FC<{
  onClose: () => void;
  onRecorded?: () => void;
}> = ({ onClose, onRecorded }) => {
  const [kioskState, setKioskState] = useState<KioskState>('welcome');
  const [inputValue, setInputValue] = useState('');
  const [student, setStudent] = useState<KioskStudent | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [isFirstScan, setIsFirstScan] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scanIdRef = useRef(0);

  // Always keep focus on the hidden input
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

    // Track scan generation — if a newer scan arrives, discard this result
    const thisScan = ++scanIdRef.current;
    setKioskState('loading');

    try {
      const res = await recordAttendanceScan(trimmed);
      if (thisScan !== scanIdRef.current) return;
      setStudent(res.student);
      setAttendance(res.attendance);
      setIsFirstScan(res.isFirstScan);
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
  }, [onRecorded]);

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
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: '#07091a' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-white/8">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#EDCD1F] flex items-center justify-center shadow-lg">
            <span className="text-[#185C20] font-black text-xl">M</span>
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">MMPNS Attendance Kiosk</p>
            <p className="text-white/30 text-xs tracking-wide">Scan student ID to record attendance</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-white/50 hover:text-white hover:border-white/30 text-sm transition-colors"
        >
          <X size={15} />
          Exit Kiosk
        </button>
      </div>

      {/* ── Main content — fills all remaining space ── */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {kioskState === 'welcome' && <div className="absolute inset-0 flex items-center justify-center"><WelcomeView /></div>}
          {kioskState === 'loading' && <div className="absolute inset-0 flex items-center justify-center"><LoadingView /></div>}
          {kioskState === 'found' && student && attendance && (
            <div className="absolute inset-0 flex items-center">
              <FoundView student={student} attendance={attendance} isFirstScan={isFirstScan} />
            </div>
          )}
          {(kioskState === 'not_found' || kioskState === 'invalid') && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ErrorView type={kioskState as 'not_found' | 'invalid'} message={errorMsg} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-t border-white/8">
        <div className="flex items-center gap-2.5 text-white/25 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <Wifi size={13} />
          <span>Scanner active — scan anytime</span>
        </div>
        {kioskState !== 'welcome' && kioskState !== 'loading' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-white/20 text-sm"
          >
            Scan next student ID at any time
          </motion.p>
        )}
      </div>

      {/* Hidden input — always capturing scanner wedge input */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="fixed opacity-0 pointer-events-none w-px h-px"
        autoFocus
        tabIndex={0}
        aria-hidden="true"
      />
    </div>
  );
};
