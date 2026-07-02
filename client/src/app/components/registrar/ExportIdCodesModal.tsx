import React, { useEffect, useState } from 'react';
import { FileDown, X } from 'lucide-react';
import { Modal, inputClass, labelClass } from './shared';
import { downloadStudentCodeDocument, type StudentCodeType, type StudentCodeRecord } from '../../../utils/studentCodeDocument';
import { getAccounts } from '../../../utils/apiClient';

interface ExportIdCodesModalProps {
  open: boolean;
  onClose: () => void;
}

export const ExportIdCodesModal: React.FC<ExportIdCodesModalProps> = ({ open, onClose }) => {
  const [students, setStudents] = useState<StudentCodeRecord[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [codeType, setCodeType] = useState<StudentCodeType>('qr');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  // The on-screen student list is paginated (10 at a time); this modal needs
  // every student that matches the filters, so it loads the full roster itself.
  useEffect(() => {
    if (!open) return;
    setError('');
    setIsLoadingStudents(true);
    getAccounts({ role: 'student' })
      .then((res) => setStudents((res.users ?? []) as StudentCodeRecord[]))
      .catch((err: any) => setError(err?.message || 'Failed to load students for export.'))
      .finally(() => setIsLoadingStudents(false));
  }, [open]);

  const gradeLevels = Array.from(new Set(students.map((s) => s.gradeLevel).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sections = Array.from(new Set(
    students
      .filter((s) => !gradeFilter || s.gradeLevel === gradeFilter)
      .map((s) => s.section)
      .filter(Boolean) as string[],
  )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filtered = students.filter((s) => {
    if (gradeFilter && s.gradeLevel !== gradeFilter) return false;
    if (sectionFilter && s.section !== sectionFilter) return false;
    return true;
  });

  const handleExport = async () => {
    if (isExporting) return;
    setError('');
    setIsExporting(true);
    try {
      await downloadStudentCodeDocument({
        students: filtered,
        codeType,
        gradeLevel: gradeFilter || undefined,
        section: sectionFilter || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'The DOCX file could not be generated.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxW="max-w-md">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="font-semibold text-gray-900">Export ID Codes</p>
          <p className="text-xs text-gray-400 mt-0.5">Generates a Word document with each student's ID code.</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className={labelClass}>Grade Level</label>
          <select
            value={gradeFilter}
            onChange={(event) => { setGradeFilter(event.target.value); setSectionFilter(''); }}
            className={inputClass}
          >
            <option value="">All grade levels</option>
            {gradeLevels.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Section</label>
          <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} className={inputClass}>
            <option value="">All sections</option>
            {sections.map((section) => <option key={section} value={section}>{section}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Code Format</label>
          <select value={codeType} onChange={(event) => setCodeType(event.target.value as StudentCodeType)} className={inputClass}>
            <option value="qr">QR Code</option>
            <option value="barcode">Code 128 Barcode</option>
          </select>
        </div>
        <p className="text-xs text-gray-400">
          Includes student name, grade level, section, LRN, emergency contact info, and uploaded photo (when available) beside each {codeType === 'qr' ? 'QR code' : 'barcode'} — {isLoadingStudents ? 'loading students…' : `${filtered.length} student${filtered.length !== 1 ? 's' : ''} match the current filters.`}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          Cancel
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting || isLoadingStudents || filtered.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-700 text-white text-sm font-medium hover:bg-purple-800 disabled:opacity-50"
        >
          <FileDown size={15} />
          {isExporting ? 'Generating DOCX...' : isLoadingStudents ? 'Loading students...' : `Export ${filtered.length} to DOCX`}
        </button>
      </div>
    </Modal>
  );
};
