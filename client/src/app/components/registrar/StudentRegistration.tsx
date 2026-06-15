import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus, X, Search, Users, QrCode, Download,
  RefreshCw, CheckCircle2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { getAccounts, createAccount } from '../../../utils/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentRecord {
  uid: string;
  role: string;
  displayName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  extension?: string;
  lrn?: string;
  province?: string;
  city?: string;
  noOfSiblings?: number;
  monthlyFamilyIncome?: number;
  systemId?: string;
  studentCode?: string;
  createdAt?: string;
  status?: string;
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}> = ({ open, onClose, children, maxW = 'max-w-lg' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          className={`bg-white rounded-xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Form Field Helpers ───────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all';
const labelClass = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

// ─── QR Dialog ───────────────────────────────────────────────────────────────

const QRDialog: React.FC<{ student: StudentRecord | null; onClose: () => void }> = ({
  student,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (!student?.systemId || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, student.systemId, {
      width: 240,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    }).then(() => {
      setDataUrl(canvasRef.current!.toDataURL('image/png'));
    });
  }, [student]);

  const handleDownload = () => {
    if (!dataUrl || !student) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${student.lastName ?? 'student'}-${student.firstName ?? ''}.png`.replace(/\s+/g, '-').toLowerCase();
    a.click();
  };

  return (
    <Modal open={!!student} onClose={onClose} maxW="max-w-sm">
      {student && (
        <>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Student QR Code</p>
              <p className="text-xs text-gray-400 mt-0.5">{student.displayName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 p-6">
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
              <canvas ref={canvasRef} className="block" />
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-400">
                This QR contains the student's internal system ID.
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                LRN: <span className="font-mono text-gray-600">{student.lrn ?? '—'}</span>
              </p>
            </div>

            <button
              onClick={handleDownload}
              disabled={!dataUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 disabled:opacity-50 transition-colors"
            >
              <Download size={15} />
              Download QR
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

// ─── Registration Form ────────────────────────────────────────────────────────

const BLANK_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  extension: '',
  noOfSiblings: '',
  monthlyFamilyIncome: '',
  province: '',
  city: '',
  lrn: '',
  password: '',
};

const RegisterForm: React.FC<{
  onCreated: (student: StudentRecord) => void;
  onCancel: () => void;
}> = ({ onCreated, onCancel }) => {
  const [form, setForm] = useState(BLANK_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<StudentRecord | null>(null);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const payload: Record<string, any> = {
        role: 'student',
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password,
        lrn: form.lrn.trim(),
        noOfSiblings: Number(form.noOfSiblings) || 0,
        monthlyFamilyIncome: Number(form.monthlyFamilyIncome) || 0,
        province: form.province.trim(),
        city: form.city.trim(),
      };
      if (form.middleName.trim()) payload.middleName = form.middleName.trim();
      if (form.extension.trim()) payload.extension = form.extension.trim();

      const res = await createAccount(payload);
      setSuccess(res.user);
      onCreated(res.user);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to register student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-6 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Student Registered</p>
          <p className="text-sm text-gray-500 mt-1">{success.displayName} has been added.</p>
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
            <p className="text-xs font-medium text-amber-800 mb-1">Student Login Code</p>
            <p className="font-mono text-base font-bold text-amber-900 tracking-widest">
              {success.studentCode}
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Share this code with the student — it is their login identifier.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={() => { setSuccess(null); setForm(BLANK_FORM); }}
            className="px-4 py-2 rounded-lg bg-purple-700 text-white text-sm hover:bg-purple-800"
          >
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
      <div className="p-5 space-y-5">
        {/* Name */}
        <section>
          <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">
            Name
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>First Name *</label>
              <input value={form.firstName} onChange={set('firstName')} className={inputClass} placeholder="Juan" required />
            </div>
            <div>
              <label className={labelClass}>Middle Name</label>
              <input value={form.middleName} onChange={set('middleName')} className={inputClass} placeholder="(optional)" />
            </div>
            <div>
              <label className={labelClass}>Last Name *</label>
              <input value={form.lastName} onChange={set('lastName')} className={inputClass} placeholder="Dela Cruz" required />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelClass}>Extension (Jr., III, etc.)</label>
            <input value={form.extension} onChange={set('extension')} className={inputClass} placeholder="(optional)" />
          </div>
        </section>

        {/* Academic */}
        <section>
          <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">
            Academic Info
          </p>
          <div>
            <label className={labelClass}>LRN (Learner Reference Number) *</label>
            <input
              value={form.lrn}
              onChange={set('lrn')}
              className={`${inputClass} font-mono`}
              placeholder="12-digit LRN"
              maxLength={12}
              required
            />
          </div>
        </section>

        {/* Family Info */}
        <section>
          <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">
            Family Info
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>No. of Siblings *</label>
              <input type="number" value={form.noOfSiblings} onChange={set('noOfSiblings')} className={inputClass} min="0" required />
            </div>
            <div>
              <label className={labelClass}>Monthly Family Income *</label>
              <input type="number" value={form.monthlyFamilyIncome} onChange={set('monthlyFamilyIncome')} className={inputClass} min="0" required />
            </div>
          </div>
        </section>

        {/* Address */}
        <section>
          <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">
            Address
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Province *</label>
              <input value={form.province} onChange={set('province')} className={inputClass} placeholder="e.g. Laguna" required />
            </div>
            <div>
              <label className={labelClass}>City / Municipality *</label>
              <input value={form.city} onChange={set('city')} className={inputClass} placeholder="e.g. San Pablo City" required />
            </div>
          </div>
        </section>

        {/* Credentials */}
        <section>
          <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">
            Login Credentials
          </p>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-3">
            <p className="text-xs text-blue-700">
              The student's <strong>login code</strong> and <strong>system ID</strong> will be auto-generated after registration.
            </p>
          </div>
          <div>
            <label className={labelClass}>Initial Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              className={inputClass}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </section>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Registering...
            </>
          ) : (
            <>
              <UserPlus size={14} />
              Register Student
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const StudentRegistration: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [qrStudent, setQrStudent] = useState<StudentRecord | null>(null);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAccounts();
      const all: StudentRecord[] = (res.users ?? []) as StudentRecord[];
      setStudents(all.filter((u) => u.role === 'student'));
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const filtered = students.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.displayName?.toLowerCase().includes(q) ||
      s.lrn?.includes(q) ||
      s.province?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Student Registration</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Register new students. Student IDs and login codes are auto-generated by the system.
          </p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors"
        >
          <UserPlus size={15} />
          Register Student
        </button>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Search + refresh */}
        <div className="p-4 border-b border-gray-100 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, LRN, province, city..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <button
            onClick={loadStudents}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading students...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No students registered yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    LRN
                  </th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Province
                  </th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    City / Municipality
                  </th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    Registered
                  </th>
                  <th className="px-4 py-3 w-20 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">
                    QR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.uid} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-purple-700">
                            {(s.firstName?.[0] ?? '') + (s.lastName?.[0] ?? '')}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.displayName}</p>
                          {s.extension && (
                            <p className="text-xs text-gray-400">{s.extension}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono text-xs text-gray-600">{s.lrn ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{s.province ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{s.city ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-400">
                        {s.createdAt
                          ? new Date(s.createdAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setQrStudent(s)}
                        disabled={!s.systemId}
                        title={s.systemId ? 'Generate QR Code' : 'No system ID'}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-purple-600 hover:bg-purple-50 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                      >
                        <QrCode size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register modal */}
      <Modal open={showRegister} onClose={() => setShowRegister(false)} maxW="max-w-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">New Student Registration</p>
            <p className="text-xs text-gray-400 mt-0.5">
              System ID and login code are auto-generated
            </p>
          </div>
          <button
            onClick={() => setShowRegister(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <RegisterForm
          onCreated={(student) => {
            setStudents((prev) => [student, ...prev]);
            setShowRegister(false);
          }}
          onCancel={() => setShowRegister(false)}
        />
      </Modal>

      {/* QR modal */}
      <QRDialog student={qrStudent} onClose={() => setQrStudent(null)} />
    </div>
  );
};
