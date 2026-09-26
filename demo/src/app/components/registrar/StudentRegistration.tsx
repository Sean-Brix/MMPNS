import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  UserPlus, X, Search, Users, QrCode, Download,
  RefreshCw, CheckCircle2, Camera, Pencil, Trash2, AlertTriangle,
  Upload, FileDown, Save,
} from 'lucide-react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import {
  getAccounts, deleteAccount,
  updateAccountProfile, uploadStudentPhoto,
} from '../../../utils/apiClient';
import { Modal, Pagination, inputClass, labelClass } from './shared';
import { BatchStudentRegistration } from './BatchStudentRegistration';
import {
  useRowSelection, SelectCheckbox, BulkEditField, ConfirmDialog,
  runBulk, summarizeBulk,
} from '../common/BulkActions';
import { BulkStudentImport } from './BulkStudentImport';
import { ExportIdCodesModal } from './ExportIdCodesModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentRecord {
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
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  systemId?: string;
  studentCode?: string;
  createdAt?: string;
  status?: string;
  photoUrl?: string;
  gradeLevel?: string;
  section?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-[#185C20]/40 overflow-hidden flex-shrink-0 transition-colors"
      >
        {preview
          ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
          : <Camera size={22} className="text-gray-300" />}
      </div>
      <div>
        <button type="button" onClick={() => ref.current?.click()} className="text-sm text-[#185C20] font-medium hover:underline">
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
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t ? 'text-[#185C20] border-b-2 border-[#185C20]' : 'text-gray-400 hover:text-gray-600'}`}
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
              className="flex items-center gap-2 px-5 py-2.5 bg-[#185C20] text-white rounded-lg text-sm font-medium hover:bg-[#1a6925] disabled:opacity-50 transition-colors"
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

export const StudentFormFields: React.FC<{
  form: Record<string, string>;
  set: (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  passwordRequired?: boolean;
  hidePassword?: boolean;
}> = ({ form, set, passwordRequired = false, hidePassword = false }) => (
  <div className="p-5 space-y-5">
    {/* Name */}
    <section>
      <p className="text-[10px] font-bold text-[#185C20] uppercase tracking-wider mb-3">Name</p>
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
      <p className="text-[10px] font-bold text-[#185C20] uppercase tracking-wider mb-3">Academic Info</p>
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
      <p className="text-[10px] font-bold text-[#185C20] uppercase tracking-wider mb-3">Family Info</p>
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
      <p className="text-[10px] font-bold text-[#185C20] uppercase tracking-wider mb-3">Address</p>
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

    {/* Emergency Contact */}
    <section>
      <p className="text-[10px] font-bold text-[#185C20] uppercase tracking-wider mb-3">Emergency Contact</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Contact Name *</label>
          <input value={form.emergencyContactName} onChange={set('emergencyContactName')} className={inputClass} placeholder="e.g. Maria Santos" required />
        </div>
        <div>
          <label className={labelClass}>Contact Number *</label>
          <input value={form.emergencyContactNumber} onChange={set('emergencyContactNumber')} className={`${inputClass} font-mono`} placeholder="e.g. 09171234567" required />
        </div>
      </div>
    </section>

    {/* Password */}
    {!hidePassword && (
      <section>
        <p className="text-[10px] font-bold text-[#185C20] uppercase tracking-wider mb-3">
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
    )}
  </div>
);

// Shared blank student draft — reused by the batch registration entry form.
export const BLANK_FORM = {
  firstName: '', middleName: '', lastName: '', extension: '',
  noOfSiblings: '', monthlyFamilyIncome: '', province: '', city: '', lrn: '', password: '',
  gradeLevel: '', section: '', emergencyContactName: '', emergencyContactNumber: '',
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
    emergencyContactName: student.emergencyContactName ?? '',
    emergencyContactNumber: student.emergencyContactNumber ?? '',
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
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactNumber: form.emergencyContactNumber.trim(),
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
        <p className="text-[10px] font-bold text-[#185C20] uppercase tracking-wider mb-3">Student Photo</p>
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
          className="flex-1 px-4 py-2.5 rounded-lg bg-[#185C20] text-white text-sm font-medium hover:bg-[#1a6925] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
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
  const [showBatch, setShowBatch] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [totalStudents, setTotalStudents] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [codeStudent, setCodeStudent] = useState<StudentRecord | null>(null);
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<StudentRecord | null>(null);

  // Bulk selection / editing
  const selection = useRowSelection<string>();
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const [bulkEnabled, setBulkEnabled] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<null | 'edit' | 'delete'>(null);
  const [bulkMsg, setBulkMsg] = useState('');

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAccounts({
        role: 'student',
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery,
        gradeLevel: gradeFilter,
        section: sectionFilter,
      });
      setStudents((res.users ?? []) as StudentRecord[]);
      setTotalStudents(res.total ?? res.users?.length ?? 0);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, gradeFilter, sectionFilter]);

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
      s.studentCode?.toLowerCase().includes(q) ||
      s.systemId?.toLowerCase().includes(q) ||
      s.lrn?.includes(q) ||
      s.gradeLevel?.toLowerCase().includes(q) ||
      s.section?.toLowerCase().includes(q) ||
      s.province?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q)
    );
  });

  // ─── Pagination ───────────────────────────────────────────────────────────────
  useEffect(() => { setPage(1); }, [searchQuery, gradeFilter, sectionFilter]);
  const pageCount = Math.max(1, Math.ceil(totalStudents / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered;

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const handleDeleted = async () => {
    if (!deleteStudent) return;
    await deleteAccount(deleteStudent.uid);
    setStudents((p) => p.filter((s) => s.uid !== deleteStudent.uid));
    setTotalStudents((p) => Math.max(0, p - 1));
    setDeleteStudent(null);
    void loadStudents();
  };

  // ─── Bulk selection / editing ─────────────────────────────────────────────────
  const selectedStudents = useMemo(
    () => filtered.filter((s) => selection.isSelected(s.uid)),
    [filtered, selection.isSelected],
  );

  // Drop selections for students no longer in the filtered view.
  useEffect(() => {
    selection.retain(filtered.map((s) => s.uid));
  }, [filtered, selection.retain]);

  const allVisibleSelected = paged.length > 0 && paged.every((s) => selection.isSelected(s.uid));
  const someVisibleSelected = paged.some((s) => selection.isSelected(s.uid));

  // Non-unique fields safe to share across students. LRN / login code / system ID
  // are unique per student and are intentionally not bulk-editable.
  const BULK_FIELDS: Array<{ key: string; label: string; placeholder?: string }> = [
    { key: 'gradeLevel', label: 'Grade Level', placeholder: 'e.g. Grade 7' },
    { key: 'section', label: 'Section', placeholder: 'e.g. St. Anne' },
    { key: 'province', label: 'Province' },
    { key: 'city', label: 'City / Municipality' },
  ];

  const openBulkEdit = () => {
    setBulkValues({});
    setBulkEnabled(new Set());
    setBulkEditOpen(true);
  };

  const toggleBulkField = (key: string, enabled: boolean) => {
    setBulkEnabled((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const performBulkEdit = async () => {
    const payload: Record<string, any> = {};
    bulkEnabled.forEach((key) => { payload[key] = (bulkValues[key] || '').trim(); });
    const targets = selectedStudents.map((s) => s.uid);
    setBulkBusy(true);
    try {
      const updatedById = new Map<string, any>();
      const result = await runBulk(targets, async (uid) => {
        const res = await updateAccountProfile(uid, payload);
        updatedById.set(uid, res.user);
      });
      setStudents((prev) => prev.map((s) => {
        const updated = updatedById.get(s.uid);
        return updated ? { ...s, ...updated } : s;
      }));
      setBulkMsg(summarizeBulk('Updated', result).replace(/account/g, 'student'));
      void loadStudents();
    } catch (err: any) {
      setBulkMsg(`Error: ${err?.message || 'Bulk update failed.'}`);
    } finally {
      setBulkBusy(false);
      setConfirmBulk(null);
      setBulkEditOpen(false);
      selection.clear();
      setTimeout(() => setBulkMsg(''), 5000);
    }
  };

  const performBulkDelete = async () => {
    const targets = selectedStudents.map((s) => s.uid);
    setBulkBusy(true);
    try {
      const succeeded = new Set<string>();
      const result = await runBulk(targets, async (uid) => {
        await deleteAccount(uid);
        succeeded.add(uid);
      });
      setStudents((prev) => prev.filter((s) => !succeeded.has(s.uid)));
      setTotalStudents((prev) => Math.max(0, prev - succeeded.size));
      setBulkMsg(summarizeBulk('Deleted', result).replace(/account/g, 'student'));
      void loadStudents();
    } catch (err: any) {
      setBulkMsg(`Error: ${err?.message || 'Bulk delete failed.'}`);
    } finally {
      setBulkBusy(false);
      setConfirmBulk(null);
      selection.clear();
      setTimeout(() => setBulkMsg(''), 5000);
    }
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
        <button onClick={() => setShowBulkImport(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Upload size={15} />Bulk Upload CSV
        </button>
        <button onClick={() => setShowExportModal(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <FileDown size={15} />Export ID Codes
        </button>
        <button onClick={() => setShowBatch(true)}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 bg-[#185C20] text-white rounded-lg text-sm font-medium hover:bg-[#1a6925] transition-colors">
          <UserPlus size={15} />Register Students
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, LRN, grade level, section..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20" />
          </div>
          <select
            value={gradeFilter}
            onChange={(event) => { setGradeFilter(event.target.value); setSectionFilter(''); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
          >
            <option value="">All grade levels</option>
            {gradeLevels.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#185C20]/20"
          >
            <option value="">All sections</option>
            {sections.map((section) => <option key={section} value={section}>{section}</option>)}
          </select>
          <button onClick={loadStudents} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs text-gray-400 whitespace-nowrap">{totalStudents} student{totalStudents !== 1 ? 's' : ''}</span>
        </div>

        {/* Bulk action bar */}
        {selection.count > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-[#185C20]/5 border-b border-[#185C20]/10">
            <span className="text-sm font-medium text-[#185C20]">{selection.count} selected</span>
            <button
              onClick={openBulkEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#185C20] text-white text-xs font-medium hover:bg-[#1a6925] transition-colors"
            >
              <Pencil size={13} /> Edit selected
            </button>
            <button
              onClick={() => setConfirmBulk('delete')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 size={13} /> Delete selected
            </button>
            <button
              onClick={() => selection.clear()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-white/60 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Bulk feedback */}
        {bulkMsg && (
          <div className="px-4 py-2.5 bg-green-50 border-b border-green-100 text-sm text-green-800">{bulkMsg}</div>
        )}

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
                  <th className="w-10 px-4 py-3">
                    <SelectCheckbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      onChange={() => selection.setMany(paged.map((s) => s.uid), !allVisibleSelected)}
                      className="accent-[#185C20]"
                      ariaLabel="Select all students on this page"
                    />
                  </th>
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
                {paged.map((s) => (
                  <tr key={s.uid} className={`transition-colors ${selection.isSelected(s.uid) ? 'bg-[#185C20]/5' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-4 py-3">
                      <SelectCheckbox
                        checked={selection.isSelected(s.uid)}
                        onChange={() => selection.toggle(s.uid)}
                        className="accent-[#185C20]"
                        ariaLabel={`Select ${s.displayName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#185C20]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.photoUrl
                            ? <img src={s.photoUrl} alt={s.displayName} className="w-full h-full object-cover" />
                            : <span className="text-xs font-bold text-[#185C20]">{(s.firstName?.[0] ?? '') + (s.lastName?.[0] ?? '')}</span>}
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
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#185C20] hover:bg-[#185C20]/5 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors">
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
        <Pagination
          page={safePage}
          pageCount={pageCount}
          totalItems={totalStudents}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {/* Batch registration modal */}
      <BatchStudentRegistration
        open={showBatch}
        onClose={() => setShowBatch(false)}
        existingStudents={students}
        onRegistered={(created) => {
          if (created.length > 0) {
            setStudents((p) => [...created, ...p]);
            setTotalStudents((p) => p + created.length);
            void loadStudents();
          }
        }}
      />

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
                void loadStudents();
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

      {/* Bulk CSV import */}
      <BulkStudentImport
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        existingStudents={students}
        onImported={(created) => {
          if (created.length > 0) {
            setStudents((p) => [...created, ...p]);
            setTotalStudents((p) => p + created.length);
            void loadStudents();
          }
        }}
      />

      {/* Export ID codes */}
      <ExportIdCodesModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Bulk edit modal */}
      <Modal open={bulkEditOpen} onClose={() => setBulkEditOpen(false)} maxW="max-w-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Edit {selection.count} student{selection.count === 1 ? '' : 's'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Enable a field to apply the same value to all selected students.</p>
          </div>
          <button onClick={() => setBulkEditOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            LRN, login code and system ID are unique per student and can't be bulk-edited.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BULK_FIELDS.map((field) => (
              <BulkEditField
                key={field.key}
                label={field.label}
                enabled={bulkEnabled.has(field.key)}
                onToggle={(en) => toggleBulkField(field.key, en)}
                accentClass="accent-[#185C20]"
              >
                <input
                  value={bulkValues[field.key] || ''}
                  onChange={(e) => setBulkValues((p) => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={inputClass}
                />
              </BulkEditField>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end">
          <button onClick={() => setBulkEditOpen(false)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => setConfirmBulk('edit')}
            disabled={bulkEnabled.size === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#185C20] text-white text-sm font-medium hover:bg-[#1a6925] disabled:opacity-50 transition-colors"
          >
            <Save size={14} /> Apply to {selection.count} student{selection.count === 1 ? '' : 's'}
          </button>
        </div>
      </Modal>

      {/* Bulk confirmations */}
      <ConfirmDialog
        open={confirmBulk === 'edit'}
        title="Apply bulk changes"
        message={`Apply the selected field changes to ${selection.count} student${selection.count === 1 ? '' : 's'}?`}
        confirmLabel="Apply changes"
        intent="primary"
        busy={bulkBusy}
        onConfirm={performBulkEdit}
        onCancel={() => setConfirmBulk(null)}
      />
      <ConfirmDialog
        open={confirmBulk === 'delete'}
        title="Delete students"
        intent="danger"
        message={`Permanently delete ${selection.count} student${selection.count === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={bulkBusy}
        onConfirm={performBulkDelete}
        onCancel={() => setConfirmBulk(null)}
      />
    </div>
  );
};
