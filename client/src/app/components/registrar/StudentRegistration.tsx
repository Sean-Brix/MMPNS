import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus, X, Search, Users, QrCode, Download,
  RefreshCw, CheckCircle2, Camera, Pencil, Trash2, AlertTriangle, FileDown,
} from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import {
  getAccounts, createAccount, deleteAccount,
  updateAccountProfile, uploadStudentPhoto,
} from '../../../utils/apiClient';
import {
  downloadStudentCodeDocument,
  type StudentCodeType,
} from '../../../utils/studentCodeDocument';

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
  photoUrl?: string;
  gradeLevel?: string;
  section?: string;
}

// ─── Modal Shell ──────────────────────────────────────────────────────────────

const Modal: React.FC<{
  open: boolean; onClose: () => void;
  children: React.ReactNode; maxW?: string;
}> = ({ open, onClose, children, maxW = 'max-w-lg' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all';
const labelClass = 'block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1';

const PhotoPicker: React.FC<{
  preview: string;
  onFile: (f: File) => void;
  onRemove: () => void;
}> = ({ preview, onFile, onRemove }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <div
        onClick={() => ref.current?.click()}
        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-purple-400 overflow-hidden flex-shrink-0 transition-colors"
      >
        {preview
          ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
          : <Camera size={22} className="text-gray-300" />}
      </div>
      <div>
        <button type="button" onClick={() => ref.current?.click()} className="text-sm text-purple-700 font-medium hover:underline">
          {preview ? 'Change photo' : 'Upload photo'}
        </button>
        <p className="text-xs text-gray-400 mt-0.5">JPG or PNG, max 10 MB</p>
        {preview && (
          <button type="button" onClick={onRemove} className="text-xs text-red-500 hover:underline mt-1 block">Remove</button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
};

// ─── Code Dialog (QR + Barcode) ───────────────────────────────────────────────

const CodeDialog: React.FC<{ student: StudentRecord | null; onClose: () => void }> = ({
  student, onClose,
}) => {
  const [tab, setTab] = useState<'qr' | 'bar'>('qr');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [barDataUrl, setBarDataUrl] = useState('');

  useEffect(() => {
    if (!student?.systemId) return;
    setQrDataUrl('');
    setBarDataUrl('');

    if (qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, student.systemId, {
        width: 220, margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      }).then(() => setQrDataUrl(qrCanvasRef.current!.toDataURL('image/png')));
    }
  }, [student]);

  useEffect(() => {
    if (!student?.systemId || !barCanvasRef.current) return;
    try {
      JsBarcode(barCanvasRef.current, student.systemId, {
        format: 'CODE128',
        lineColor: '#1a1a1a',
        width: 2,
        height: 72,
        displayValue: true,
        fontSize: 12,
        margin: 12,
        background: '#ffffff',
      });
      setBarDataUrl(barCanvasRef.current.toDataURL('image/png'));
    } catch { /* invalid barcode */ }
  }, [student, tab]);

  const handleDownload = () => {
    const url = tab === 'qr' ? qrDataUrl : barDataUrl;
    if (!url || !student) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab === 'qr' ? 'qr' : 'barcode'}-${student.lastName ?? 'student'}-${student.firstName ?? ''}.png`
      .replace(/\s+/g, '-').toLowerCase();
    a.click();
  };

  return (
    <Modal open={!!student} onClose={onClose} maxW="max-w-sm">
      {student && (
        <>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Student ID Code</p>
              <p className="text-xs text-gray-400 mt-0.5">{student.displayName}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(['qr', 'bar'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t ? 'text-purple-700 border-b-2 border-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t === 'qr' ? 'QR Code' : 'Barcode'}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4 p-6">
            {/* QR canvas — always rendered, hidden when on barcode tab */}
            <div className={`p-3 bg-gray-50 border border-gray-100 rounded-xl ${tab === 'qr' ? 'block' : 'hidden'}`}>
              <canvas ref={qrCanvasRef} className="block" />
            </div>

            {/* Barcode canvas — always rendered, hidden when on QR tab */}
            <div className={`p-2 bg-white border border-gray-100 rounded-xl ${tab === 'bar' ? 'block' : 'hidden'}`}>
              <canvas ref={barCanvasRef} className="block" />
            </div>

            <p className="text-xs text-gray-400 text-center">
              {tab === 'qr' ? 'QR contains the student system ID' : 'Code 128 barcode — scannable with any barcode reader'}
            </p>

            <button
              onClick={handleDownload}
              disabled={tab === 'qr' ? !qrDataUrl : !barDataUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 disabled:opacity-50 transition-colors"
            >
              <Download size={15} />
              Download {tab === 'qr' ? 'QR' : 'Barcode'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

// ─── Delete Confirm ───────────────────────────────────────────────────────────

const DeleteConfirmDialog: React.FC<{
  student: StudentRecord | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}> = ({ student, onConfirm, onCancel }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };
  return (
    <Modal open={!!student} onClose={onCancel} maxW="max-w-sm">
      {student && (
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <p className="font-semibold text-gray-900">Delete Student Account?</p>
          <p className="text-sm text-gray-500 mt-1.5">
            <span className="font-medium text-gray-700">{student.displayName}</span> will be permanently removed. This cannot be undone.
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// ─── Shared Form Fields ───────────────────────────────────────────────────────

const StudentFormFields: React.FC<{
  form: Record<string, string>;
  set: (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  passwordRequired?: boolean;
}> = ({ form, set, passwordRequired = false }) => (
  <div className="p-5 space-y-5">
    {/* Name */}
    <section>
      <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">Name</p>
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
        <label className={labelClass}>Extension (Jr., III…)</label>
        <input value={form.extension} onChange={set('extension')} className={inputClass} placeholder="(optional)" />
      </div>
    </section>

    {/* Academic */}
    <section>
      <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">Academic Info</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Grade Level *</label>
          <input value={form.gradeLevel} onChange={set('gradeLevel')} className={inputClass}
            placeholder="e.g. Grade 7" required />
        </div>
        <div>
          <label className={labelClass}>Section *</label>
          <input value={form.section} onChange={set('section')} className={inputClass}
            placeholder="e.g. St. Anne" required />
        </div>
      </div>
      <div className="mt-3">
        <label className={labelClass}>LRN (Learner Reference Number) *</label>
        <input value={form.lrn} onChange={set('lrn')} className={`${inputClass} font-mono`}
          placeholder="12-digit LRN" maxLength={12} required />
      </div>
    </section>

    {/* Family */}
    <section>
      <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">Family Info</p>
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
      <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">Address</p>
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

    {/* Password */}
    <section>
      <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">
        {passwordRequired ? 'Login Credentials' : 'Change Password (optional)'}
      </p>
      {passwordRequired && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-3">
          <p className="text-xs text-blue-700">Student login code and system ID are auto-generated after registration.</p>
        </div>
      )}
      <div>
        <label className={labelClass}>{passwordRequired ? 'Initial Password *' : 'New Password'}</label>
        <input
          type="password"
          value={form.password}
          onChange={set('password')}
          className={inputClass}
          placeholder={passwordRequired ? 'Minimum 6 characters' : 'Leave blank to keep current'}
          required={passwordRequired}
          minLength={6}
          autoComplete="new-password"
        />
      </div>
    </section>
  </div>
);

// ─── Register Form ────────────────────────────────────────────────────────────

const BLANK_FORM = {
  firstName: '', middleName: '', lastName: '', extension: '',
  noOfSiblings: '', monthlyFamilyIncome: '', province: '', city: '', lrn: '', password: '',
  gradeLevel: '', section: '',
};

const RegisterForm: React.FC<{
  onCreated: (student: StudentRecord) => void;
  onCancel: () => void;
}> = ({ onCreated, onCancel }) => {
  const [form, setForm] = useState(BLANK_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<StudentRecord | null>(null);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const payload: Record<string, any> = {
        role: 'student',
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
        password: form.password, lrn: form.lrn.trim(),
        gradeLevel: form.gradeLevel.trim(), section: form.section.trim(),
        noOfSiblings: Number(form.noOfSiblings) || 0,
        monthlyFamilyIncome: Number(form.monthlyFamilyIncome) || 0,
        province: form.province.trim(), city: form.city.trim(),
      };
      if (form.middleName.trim()) payload.middleName = form.middleName.trim();
      if (form.extension.trim()) payload.extension = form.extension.trim();

      const res = await createAccount(payload);
      let student: StudentRecord = res.user;

      if (photoFile && student.uid) {
        try {
          const photoUrl = await uploadStudentPhoto(student.uid, photoFile);
          student = { ...student, photoUrl };
        } catch { /* non-fatal */ }
      }

      setSuccess(student);
      onCreated(student);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to register student.');
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
            <p className="font-mono text-base font-bold text-amber-900 tracking-widest">{success.studentCode}</p>
            <p className="text-xs text-amber-700 mt-1">Share this code with the student — it is their login identifier.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">Close</button>
          <button onClick={() => { setSuccess(null); setForm(BLANK_FORM); setPhotoFile(null); setPhotoPreview(''); }}
            className="px-4 py-2 rounded-lg bg-purple-700 text-white text-sm hover:bg-purple-800">
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
      <div className="p-5 pb-0">
        <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">Student Photo (optional)</p>
        <PhotoPicker
          preview={photoPreview}
          onFile={(f) => { setPhotoFile(f); const r = new FileReader(); r.onload = (ev) => setPhotoPreview(ev.target?.result as string); r.readAsDataURL(f); }}
          onRemove={() => { setPhotoFile(null); setPhotoPreview(''); }}
        />
      </div>
      <StudentFormFields form={form} set={set} passwordRequired />
      {error && <div className="mx-5 mb-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{error}</div>}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {isLoading ? <><RefreshCw size={14} className="animate-spin" />Registering...</> : <><UserPlus size={14} />Register Student</>}
        </button>
      </div>
    </form>
  );
};

// ─── Edit Form ────────────────────────────────────────────────────────────────

const EditForm: React.FC<{
  student: StudentRecord;
  onUpdated: (student: StudentRecord) => void;
  onCancel: () => void;
}> = ({ student, onUpdated, onCancel }) => {
  const [form, setForm] = useState({
    firstName: student.firstName ?? '',
    middleName: student.middleName ?? '',
    lastName: student.lastName ?? '',
    extension: student.extension ?? '',
    noOfSiblings: String(student.noOfSiblings ?? ''),
    monthlyFamilyIncome: String(student.monthlyFamilyIncome ?? ''),
    province: student.province ?? '',
    city: student.city ?? '',
    lrn: student.lrn ?? '',
    gradeLevel: student.gradeLevel ?? '',
    section: student.section ?? '',
    password: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(student.photoUrl ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      const payload: Record<string, any> = {
        firstName: form.firstName.trim(), middleName: form.middleName.trim(),
        lastName: form.lastName.trim(), extension: form.extension.trim(),
        lrn: form.lrn.trim(),
        gradeLevel: form.gradeLevel.trim(), section: form.section.trim(),
        noOfSiblings: Number(form.noOfSiblings) || 0,
        monthlyFamilyIncome: Number(form.monthlyFamilyIncome) || 0,
        province: form.province.trim(), city: form.city.trim(),
      };
      if (form.password) payload.password = form.password;

      const res = await updateAccountProfile(student.uid, payload);
      let updated: StudentRecord = { ...student, ...res.user };

      if (photoFile) {
        try {
          const photoUrl = await uploadStudentPhoto(student.uid, photoFile);
          updated = { ...updated, photoUrl };
        } catch { /* non-fatal */ }
      } else if (!photoPreview && student.photoUrl) {
        updated = { ...updated, photoUrl: undefined };
      }

      onUpdated(updated);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update student.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
      <div className="p-5 pb-0">
        <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-3">Student Photo</p>
        <PhotoPicker
          preview={photoPreview}
          onFile={(f) => { setPhotoFile(f); const r = new FileReader(); r.onload = (ev) => setPhotoPreview(ev.target?.result as string); r.readAsDataURL(f); }}
          onRemove={() => { setPhotoFile(null); setPhotoPreview(''); }}
        />
      </div>
      <StudentFormFields form={form} set={set} />
      {error && <div className="mx-5 mb-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{error}</div>}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {isLoading ? <><RefreshCw size={14} className="animate-spin" />Saving...</> : <><CheckCircle2 size={14} />Save Changes</>}
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
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [exportType, setExportType] = useState<StudentCodeType>('qr');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [codeStudent, setCodeStudent] = useState<StudentRecord | null>(null);
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<StudentRecord | null>(null);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAccounts();
      setStudents(((res.users ?? []) as StudentRecord[]).filter((u) => u.role === 'student'));
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const gradeLevels = Array.from(new Set(students.map((student) => student.gradeLevel).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sections = Array.from(new Set(
    students
      .filter((student) => !gradeFilter || student.gradeLevel === gradeFilter)
      .map((student) => student.section)
      .filter(Boolean) as string[],
  )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filtered = students.filter((s) => {
    if (gradeFilter && s.gradeLevel !== gradeFilter) return false;
    if (sectionFilter && s.section !== sectionFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.displayName?.toLowerCase().includes(q) ||
      s.lrn?.includes(q) ||
      s.gradeLevel?.toLowerCase().includes(q) ||
      s.section?.toLowerCase().includes(q) ||
      s.province?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q)
    );
  });

  const handleMassExport = async () => {
    if (isExporting) return;
    setExportError('');
    setIsExporting(true);
    try {
      await downloadStudentCodeDocument({
        students: filtered,
        codeType: exportType,
        gradeLevel: gradeFilter || undefined,
        section: sectionFilter || undefined,
      });
    } catch (err: any) {
      setExportError(err?.message || 'The DOCX file could not be generated.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleted = async () => {
    if (!deleteStudent) return;
    await deleteAccount(deleteStudent.uid);
    setStudents((p) => p.filter((s) => s.uid !== deleteStudent.uid));
    setDeleteStudent(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Student Registration</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage student accounts. IDs and login codes are auto-generated.
          </p>
        </div>
        <button onClick={() => setShowRegister(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors">
          <UserPlus size={15} />Register Student
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-3">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Mass Export ID Codes</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Creates a compact Word document with each student's name beside the selected code.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 flex-[2]">
            <div>
              <label className={labelClass}>Grade Level</label>
              <select
                value={gradeFilter}
                onChange={(event) => {
                  setGradeFilter(event.target.value);
                  setSectionFilter('');
                }}
                className={inputClass}
              >
                <option value="">All grade levels</option>
                {gradeLevels.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Section</label>
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className={inputClass}
              >
                <option value="">All sections</option>
                {sections.map((section) => <option key={section} value={section}>{section}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Code Format</label>
              <select
                value={exportType}
                onChange={(event) => setExportType(event.target.value as StudentCodeType)}
                className={inputClass}
              >
                <option value="qr">QR Code</option>
                <option value="barcode">Code 128 Barcode</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleMassExport}
            disabled={isExporting || filtered.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 disabled:opacity-50"
          >
            <FileDown size={15} />
            {isExporting ? 'Generating DOCX...' : `Export ${filtered.length} to DOCX`}
          </button>
        </div>
        {exportError && <p className="mt-3 text-sm text-red-600">{exportError}</p>}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, LRN, grade level, section..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
          </div>
          <button onClick={loadStudents} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
        </div>

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
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">LRN</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Grade Level</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Section</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Registered</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Code</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.uid} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.photoUrl
                            ? <img src={s.photoUrl} alt={s.displayName} className="w-full h-full object-cover" />
                            : <span className="text-xs font-bold text-purple-700">{(s.firstName?.[0] ?? '') + (s.lastName?.[0] ?? '')}</span>}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.displayName}</p>
                          {s.extension && <p className="text-xs text-gray-400">{s.extension}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono text-xs text-gray-600">{s.lrn ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{s.gradeLevel ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{s.section ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-gray-400">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setCodeStudent(s)} disabled={!s.systemId}
                        title={s.systemId ? 'QR / Barcode' : 'No system ID'}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-purple-600 hover:bg-purple-50 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors">
                        <QrCode size={15} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditStudent(s)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteStudent(s)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 size={14} />
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

      {/* Register modal */}
      <Modal open={showRegister} onClose={() => setShowRegister(false)} maxW="max-w-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">New Student Registration</p>
            <p className="text-xs text-gray-400 mt-0.5">System ID and login code are auto-generated</p>
          </div>
          <button onClick={() => setShowRegister(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <RegisterForm
          onCreated={(s) => { setStudents((p) => [s, ...p]); setShowRegister(false); }}
          onCancel={() => setShowRegister(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editStudent} onClose={() => setEditStudent(null)} maxW="max-w-xl">
        {editStudent && (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Edit Student</p>
                <p className="text-xs text-gray-400 mt-0.5">{editStudent.displayName}</p>
              </div>
              <button onClick={() => setEditStudent(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <EditForm
              student={editStudent}
              onUpdated={(updated) => {
                setStudents((p) => p.map((s) => s.uid === updated.uid ? updated : s));
                setEditStudent(null);
              }}
              onCancel={() => setEditStudent(null)}
            />
          </>
        )}
      </Modal>

      {/* QR / Barcode modal */}
      <CodeDialog student={codeStudent} onClose={() => setCodeStudent(null)} />

      {/* Delete confirm */}
      <DeleteConfirmDialog
        student={deleteStudent}
        onConfirm={handleDeleted}
        onCancel={() => setDeleteStudent(null)}
      />
    </div>
  );
};
