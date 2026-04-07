import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarDays, Edit, Eye, Plus, Save, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { staffMembers as fallbackStaffMembers } from '../FacultyStaff/data';
import { addDatabaseItem, deleteDatabaseItem, readDatabase, updateDatabaseItem, writeDatabase } from '../../../utils/database';
import { uploadPrincipalEditedImageToCloud } from '../../../utils/cloudImageStorage';
import { calculateYearsAtMmpns } from '../../../utils/staffYears';
import { StaffProfile } from '../FacultyStaff/StaffProfile';

interface StaffMember {
  id: number;
  name: string;
  role: string;
  department: string;
  staffType: 'teaching' | 'non-teaching';
  img: string;
  bio: string;
  education: string;
  yearsAtMmpns: number;
  startedAtMmpns?: string;
  specialization?: string;
  motto?: string;
}

interface Props {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

type ModalMode = 'add' | 'edit' | 'delete' | null;

const STAFF_DEPARTMENTS = [
  'Elementary',
  'Junior High School',
  'Accounting',
  'Guidance',
  'Registrar',
  'Library',
  'Clinic',
  'Maintenance & Security',
];

const emptyForm: Partial<StaffMember> = {
  name: '',
  role: '',
  department: '',
  staffType: 'teaching',
  img: '',
  bio: '',
  education: '',
  startedAtMmpns: '',
  yearsAtMmpns: 0,
  specialization: '',
  motto: '',
};

const PAGE_SIZE = 8;
const FACULTY_AUTO_SEED_FLAG = 'mmpns_dashboard_faculty_seeded_once';

const toDataUrl = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        reject(new Error('Unable to read image file.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
};

const inferStartDateFromYears = (yearsAtMmpns: number) => {
  const today = new Date();
  today.setFullYear(today.getFullYear() - Math.max(0, yearsAtMmpns));
  return today.toISOString().slice(0, 10);
};

const ModalShell: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, children }) => {
  return (
    <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#185C20]/10 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#185C20]/10">
          <div>
            <h3 className="text-lg font-bold text-[#185C20]">{title}</h3>
            {subtitle ? <p className="text-xs text-[#185C20]/55 mt-0.5">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#185C20]/5 text-[#185C20]/50 hover:text-[#185C20] transition-colors flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
};

export const FacultyManager: React.FC<Props> = ({ showNotification }) => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'teaching' | 'non-teaching'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<Partial<StaffMember>>(emptyForm);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showFullProfilePreview, setShowFullProfilePreview] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = () => {
    const data = readDatabase<{ staff?: StaffMember[] }>('faculty');
    const hasAutoSeeded = localStorage.getItem(FACULTY_AUTO_SEED_FLAG) === '1';

    if (!data || !Array.isArray(data.staff)) {
      writeDatabase('faculty', {
        ...(data || {}),
        staff: fallbackStaffMembers,
      });
      localStorage.setItem(FACULTY_AUTO_SEED_FLAG, '1');
      setStaff(fallbackStaffMembers);
      return;
    }

    if (data.staff.length === 0) {
      if (!hasAutoSeeded) {
        writeDatabase('faculty', {
          ...data,
          staff: fallbackStaffMembers,
        });
        localStorage.setItem(FACULTY_AUTO_SEED_FLAG, '1');
        setStaff(fallbackStaffMembers);
        return;
      }

      setStaff([]);
      return;
    }

    if (data && Array.isArray(data.staff)) {
      const shouldMigrateLegacySeed =
        data.staff.length === 1 &&
        data.staff[0]?.name === fallbackStaffMembers[0]?.name &&
        fallbackStaffMembers.length > 1;

      if (shouldMigrateLegacySeed) {
        writeDatabase('faculty', {
          ...data,
          staff: fallbackStaffMembers,
        });
        localStorage.setItem(FACULTY_AUTO_SEED_FLAG, '1');
        setStaff(fallbackStaffMembers);
        return;
      }

      localStorage.setItem(FACULTY_AUTO_SEED_FLAG, '1');
      setStaff(data.staff);
      return;
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedStaff(null);
    setFormData(emptyForm);
    setImagePreview('');
    setIsUploadingImage(false);
    setShowFullProfilePreview(false);
  };

  const openAddModal = () => {
    setSelectedStaff(null);
    setFormData({
      ...emptyForm,
      startedAtMmpns: new Date().toISOString().slice(0, 10),
    });
    setImagePreview('');
    setModalMode('add');
  };

  const openEditModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setFormData({
      ...member,
      startedAtMmpns: member.startedAtMmpns || inferStartDateFromYears(member.yearsAtMmpns),
    });
    setImagePreview(member.img);
    setModalMode('edit');
  };

  const openProfilePreview = (member: StaffMember) => {
    setSelectedStaff(member);
    setShowFullProfilePreview(true);
  };

  const openDeleteModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setModalMode('delete');
  };

  const isValidForm =
    Boolean(formData.name?.trim()) &&
    Boolean(formData.role?.trim()) &&
    Boolean(formData.department?.trim()) &&
    Boolean(formData.img?.trim()) &&
    Boolean(formData.bio?.trim()) &&
    Boolean(formData.education?.trim()) &&
    Boolean(formData.startedAtMmpns);

  const handleImageUpload = async (file?: File) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please upload a valid image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showNotification('error', 'Image file must be 10MB or smaller.');
      return;
    }

    let previewData = '';

    try {
      previewData = await toDataUrl(file);
      setImagePreview(previewData);
    } catch {
      showNotification('error', 'Unable to preview image.');
      return;
    }

    setIsUploadingImage(true);

    try {
      const cloudUrl = await uploadPrincipalEditedImageToCloud({
        file,
        pageFolder: 'faculty-dashboard',
        slot: 'staff-profile',
      });

      if (!cloudUrl) {
        setFormData((prev) => ({ ...prev, img: previewData }));
        showNotification('info', 'Cloud image is not configured. Image saved locally for this entry.');
        return;
      }

      setFormData((prev) => ({ ...prev, img: cloudUrl }));
      showNotification('success', 'Image uploaded to cloud storage.');
    } catch {
      setFormData((prev) => ({ ...prev, img: previewData }));
      showNotification('info', 'Cloud upload failed. Image saved locally for this entry.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = () => {
    const computedYears = calculateYearsAtMmpns(formData.startedAtMmpns, Number(formData.yearsAtMmpns) || 0);
    const payload = {
      name: formData.name?.trim() || '',
      role: formData.role?.trim() || '',
      department: formData.department?.trim() || '',
      staffType: formData.staffType === 'non-teaching' ? 'non-teaching' : 'teaching',
      img: formData.img?.trim() || '',
      bio: formData.bio?.trim() || '',
      education: formData.education?.trim() || '',
      yearsAtMmpns: computedYears,
      startedAtMmpns: formData.startedAtMmpns || '',
      specialization: formData.specialization?.trim() || '',
      motto: formData.motto?.trim() || '',
    };

    if (!isValidForm) {
      showNotification('error', 'Please complete all required fields before saving.');
      return;
    }

    if (modalMode === 'edit' && selectedStaff) {
      const success = updateDatabaseItem<StaffMember>('faculty', 'staff', selectedStaff.id, payload);
      if (!success) {
        showNotification('error', 'Failed to update staff member.');
        return;
      }

      showNotification('success', 'Staff member updated successfully.');
      loadStaff();
      closeModal();
      return;
    }

    if (modalMode === 'add') {
      const newId = addDatabaseItem<StaffMember>('faculty', 'staff', payload);
      if (!newId) {
        showNotification('error', 'Failed to add staff member.');
        return;
      }

      showNotification('success', 'Staff member added successfully.');
      loadStaff();
      closeModal();
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedStaff) {
      return;
    }

    const success = deleteDatabaseItem('faculty', 'staff', selectedStaff.id);
    if (!success) {
      showNotification('error', 'Failed to delete staff member.');
      return;
    }

    showNotification('success', 'Staff member deleted successfully.');
    loadStaff();
    closeModal();
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return staff.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        member.department.toLowerCase().includes(q);
      const matchesDept = filterDept === 'all' || member.department === filterDept;
      const matchesType = filterType === 'all' || member.staffType === filterType;
      return matchesSearch && matchesDept && matchesType;
    });
  }, [filterDept, filterType, searchQuery, staff]);

  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedStaff = filteredStaff.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDept, filterType]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const departments = useMemo(() => {
    const fromRecords = staff.map((member) => member.department).filter(Boolean);
    const pendingDepartment = formData.department?.trim();
    return Array.from(new Set([...STAFF_DEPARTMENTS, ...fromRecords, ...(pendingDepartment ? [pendingDepartment] : [])]));
  }, [formData.department, staff]);

  const activeYearsPreview = calculateYearsAtMmpns(formData.startedAtMmpns, Number(formData.yearsAtMmpns) || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#185C20]/30" />
          <input
            type="text"
            placeholder="Search by name, role, or department..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] placeholder-[#185C20]/30 focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 focus:border-[#EDCD1F]"
          />
        </div>

        <select
          value={filterDept}
          onChange={(event) => setFilterDept(event.target.value)}
          className="px-4 py-2.5 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 focus:border-[#EDCD1F] cursor-pointer"
        >
          <option value="all">All Departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value as 'all' | 'teaching' | 'non-teaching')}
          className="px-4 py-2.5 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 focus:border-[#EDCD1F] cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="teaching">Teaching</option>
          <option value="non-teaching">Non-Teaching</option>
        </select>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#185C20] text-white rounded-lg text-sm font-bold hover:bg-[#185C20]/90 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Add Staff
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#185C20]/10 overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#185C20]/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Years</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-[#185C20] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#185C20]/5">
              {paginatedStaff.map((member) => (
                <tr key={member.id} className="hover:bg-[#185C20]/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-[#185C20]">{member.name}</td>
                  <td className="px-4 py-3 text-sm text-[#185C20]/70">{member.role}</td>
                  <td className="px-4 py-3 text-sm text-[#185C20]/70">{member.department}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        member.staffType === 'teaching' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {member.staffType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#185C20]/70">
                    {calculateYearsAtMmpns(member.startedAtMmpns, member.yearsAtMmpns)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openProfilePreview(member)}
                        className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(member)}
                        className="p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-[#185C20]/5">
          {paginatedStaff.map((member) => (
            <div key={member.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-[#185C20] text-sm truncate">{member.name}</h4>
                  <p className="text-xs text-[#185C20]/60 mt-0.5">{member.role}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openProfilePreview(member)}
                    className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => openEditModal(member)}
                    className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(member)}
                    className="p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-0.5 bg-[#185C20]/5 rounded text-xs text-[#185C20]/70">{member.department}</span>
                <span className="px-2 py-0.5 bg-[#EDCD1F]/15 rounded text-xs text-[#185C20]">
                  {calculateYearsAtMmpns(member.startedAtMmpns, member.yearsAtMmpns)} years
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredStaff.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-[#185C20]/40">No staff members found.</p>
          </div>
        )}
      </div>

      {filteredStaff.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#185C20]/50">
            Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filteredStaff.length)} of {filteredStaff.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-[#185C20]/15 text-xs font-bold text-[#185C20] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#185C20]/5 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-[#185C20]/70">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#185C20]/15 text-xs font-bold text-[#185C20] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#185C20]/5 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {(modalMode === 'add' || modalMode === 'edit') && (
        <ModalShell
          title={modalMode === 'add' ? 'Add Staff Member' : 'Edit Staff Member'}
          subtitle="These details are used directly by the public Faculty & Staff cards and profile modal."
          onClose={closeModal}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Full Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Role / Position *</label>
              <input
                type="text"
                value={formData.role || ''}
                onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Department *</label>
              <input
                list="faculty-departments"
                type="text"
                value={formData.department || ''}
                onChange={(event) => setFormData({ ...formData, department: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 cursor-pointer"
                placeholder="Select or type a new department"
              />
              <datalist id="faculty-departments">
                {departments.map((department) => (
                  <option key={department} value={department} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Staff Type *</label>
              <select
                value={formData.staffType || 'teaching'}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    staffType: event.target.value as 'teaching' | 'non-teaching',
                  })
                }
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 cursor-pointer"
              >
                <option value="teaching">Teaching</option>
                <option value="non-teaching">Non-Teaching</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Start Date at MMPNS *</label>
              <input
                type="date"
                value={formData.startedAtMmpns || ''}
                onChange={(event) => setFormData({ ...formData, startedAtMmpns: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
              <p className="text-xs text-[#185C20]/45 mt-1.5 inline-flex items-center gap-1">
                <CalendarDays size={12} />
                Calculated years of service: {activeYearsPreview}
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Staff Photo Upload *</label>
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-xs font-bold text-[#185C20] hover:bg-[#185C20]/5 cursor-pointer transition-colors">
                <UploadCloud size={14} />
                {isUploadingImage ? 'Uploading to Firebase...' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleImageUpload(event.target.files?.[0])}
                />
              </label>
              {(imagePreview || formData.img) && (
                <img
                  src={imagePreview || formData.img}
                  alt="Staff preview"
                  className="mt-2 w-20 h-20 rounded-lg object-cover border border-[#185C20]/10"
                />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Education *</label>
              <input
                type="text"
                value={formData.education || ''}
                onChange={(event) => setFormData({ ...formData, education: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Specialization (optional)</label>
              <input
                type="text"
                value={formData.specialization || ''}
                onChange={(event) => setFormData({ ...formData, specialization: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Motto (optional)</label>
              <input
                type="text"
                value={formData.motto || ''}
                onChange={(event) => setFormData({ ...formData, motto: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Biography *</label>
              <textarea
                value={formData.bio || ''}
                onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#185C20] text-white rounded-lg text-sm font-bold hover:bg-[#185C20]/90 transition-colors cursor-pointer"
            >
              <Save size={14} />
              Save
            </button>
            <button
              onClick={closeModal}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#185C20]/10 text-[#185C20] rounded-lg text-sm font-bold hover:bg-[#185C20]/5 transition-colors cursor-pointer"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </ModalShell>
      )}

      {showFullProfilePreview && selectedStaff && (
        <StaffProfile
          staff={selectedStaff}
          onClose={() => {
            setShowFullProfilePreview(false);
            setSelectedStaff(null);
          }}
          onPrev={() => undefined}
          onNext={() => undefined}
          hasPrev={false}
          hasNext={false}
        />
      )}

      {modalMode === 'delete' && selectedStaff && (
        <ModalShell title="Delete Staff Member" subtitle="This will remove the card from the public Faculty & Staff page." onClose={closeModal}>
          <p className="text-sm text-[#185C20]/75 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-[#185C20]">{selectedStaff.name}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleConfirmDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              onClick={closeModal}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#185C20]/10 text-[#185C20] rounded-lg text-sm font-bold hover:bg-[#185C20]/5 transition-colors cursor-pointer"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
