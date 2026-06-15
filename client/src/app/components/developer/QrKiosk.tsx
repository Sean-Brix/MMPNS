import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanLine, X, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { scanStudentBySystemId } from '../../../utils/apiClient';

// ─── Validation ───────────────────────────────────────────────────────────────
// Format: DD0DD0DD0DD0DD0DD (17 chars — 6 digit-pairs joined by "0")
const SYSTEM_ID_PATTERN = /^\d{2}0\d{2}0\d{2}0\d{2}0\d{2}0\d{2}$/;

const validateSystemId = (raw: string): { valid: boolean; reason?: string } => {
  const s = raw.trim();
  if (s.length !== 17) return { valid: false, reason: `Expected 17 characters, got ${s.length}.` };
  if (!SYSTEM_ID_PATTERN.test(s)) return { valid: false, reason: 'Pattern mismatch — expected zeros at positions 3, 6, 9, 12, 15.' };
  return { valid: true };
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
  studentCode?: string;
}

type KioskState = 'idle' | 'loading' | 'found' | 'not_found' | 'invalid';

// ─── Result Display ───────────────────────────────────────────────────────────

const StudentCard: React.FC<{ student: KioskStudent }> = ({ student }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }}
    className="flex flex-col items-center gap-6"
  >
    {/* Photo */}
    <div className="w-36 h-36 rounded-2xl overflow-hidden border-4 border-green-400/60 shadow-xl">
      {student.photoUrl ? (
        <img src={student.photoUrl} alt={student.displayName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-white/10 flex items-center justify-center">
          <span className="text-5xl font-black text-white/60">
            {(student.firstName?.[0] ?? '') + (student.lastName?.[0] ?? '')}
          </span>
        </div>
      )}
    </div>

    {/* Status badge */}
    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/20 border border-green-400/40">
      <CheckCircle2 className="w-4 h-4 text-green-400" />
      <span className="text-green-300 text-sm font-semibold">Student Found</span>
    </div>

    {/* Name */}
    <div className="text-center">
      <p className="text-3xl font-bold text-white">{student.displayName}</p>
      {student.status && (
        <span className={`text-sm font-medium mt-1 inline-block ${student.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
          {student.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      )}
    </div>

    {/* Details grid */}
    <div className="grid grid-cols-2 gap-3 w-full max-w-md">
      {[
        { label: 'LRN', value: student.lrn ?? '—' },
        { label: 'Registered', value: student.createdAt ? new Date(student.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
        { label: 'Province', value: student.province ?? '—' },
        { label: 'City / Municipality', value: student.city ?? '—' },
      ].map(({ label, value }) => (
        <div key={label} className="bg-white/10 rounded-xl p-3 border border-white/10">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  </motion.div>
);

// ─── Main Kiosk Component ─────────────────────────────────────────────────────

export const QrKiosk: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [kioskState, setKioskState] = useState<KioskState>('idle');
  const [inputValue, setInputValue] = useState('');
  const [student, setStudent] = useState<KioskStudent | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Keep input focused
  useEffect(() => {
    focusInput();
    const interval = setInterval(focusInput, 2000);
    return () => clearInterval(interval);
  }, [focusInput]);

  const reset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setKioskState('idle');
    setInputValue('');
    setStudent(null);
    setErrorMsg('');
    setCountdown(0);
    setTimeout(focusInput, 50);
  }, [focusInput]);

  // Auto-reset after 5 seconds — no button click needed
  useEffect(() => {
    if (kioskState === 'found' || kioskState === 'not_found' || kioskState === 'invalid') {
      setCountdown(5);
      const tick = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(tick); return 0; }
          return c - 1;
        });
      }, 1000);
      resetTimerRef.current = setTimeout(reset, 5000);
      return () => { clearInterval(tick); if (resetTimerRef.current) clearTimeout(resetTimerRef.current); };
    }
  }, [kioskState, reset]);

  const handleScan = useCallback(async (raw: string) => {
    // Strip whitespace, carriage returns, and any non-digit characters at edges
    const trimmed = raw.replace(/[\r\n\t\s]/g, '').trim();
    if (!trimmed) return;

    const { valid, reason } = validateSystemId(trimmed);
    if (!valid) {
      setErrorMsg(reason ?? 'Invalid QR code.');
      setKioskState('invalid');
      return;
    }

    setKioskState('loading');
    try {
      const res = await scanStudentBySystemId(trimmed);
      setStudent(res.student);
      setKioskState('found');
    } catch (err: any) {
      if (err?.status === 404) {
        setErrorMsg('No student found with this QR code.');
        setKioskState('not_found');
      } else {
        setErrorMsg('System error. Please try again.');
        setKioskState('invalid');
      }
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && kioskState === 'idle') {
      e.preventDefault();
      void handleScan(inputValue);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0f1e] flex flex-col"
      onClick={focusInput}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EDCD1F] flex items-center justify-center">
            <span className="text-[#185C20] font-black text-sm">M</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">MMPNS Attendance Kiosk</p>
            <p className="text-white/40 text-xs">QR Scanner Mode</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors"
        >
          <X size={14} />
          Exit Kiosk
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-8">
        <AnimatePresence mode="wait">
          {kioskState === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="w-24 h-24 rounded-3xl bg-white/5 border-2 border-white/20 flex items-center justify-center"
              >
                <ScanLine className="w-12 h-12 text-white/60" />
              </motion.div>
              <div>
                <p className="text-3xl font-bold text-white">Ready to Scan</p>
                <p className="text-white/50 mt-2">Point the QR scanner at a student ID card</p>
              </div>
            </motion.div>
          )}

          {kioskState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
              <p className="text-white/60">Looking up student...</p>
            </motion.div>
          )}

          {kioskState === 'found' && student && (
            <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StudentCard student={student} />
            </motion.div>
          )}

          {(kioskState === 'not_found' || kioskState === 'invalid') && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {kioskState === 'not_found' ? 'Student Not Found' : 'Invalid QR Code'}
                </p>
                <p className="text-white/50 mt-2 max-w-sm">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden scanner input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            if (kioskState === 'idle') setInputValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          className="opacity-0 absolute w-0 h-0 pointer-events-none"
          autoFocus
          tabIndex={0}
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/30 text-xs">
          <Wifi size={12} />
          <span>Scanner input active</span>
        </div>

        {(kioskState === 'found' || kioskState === 'not_found' || kioskState === 'invalid') && (
          <span className="text-white/40 text-sm">Ready to scan next in {countdown}s...</span>
        )}
      </div>
    </div>
  );
};
