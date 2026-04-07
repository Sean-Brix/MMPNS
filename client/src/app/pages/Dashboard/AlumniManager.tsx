import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Edit, Eye, Plus, Save, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { alumniProfiles as fallbackAlumniProfiles } from '../AlumniGallery/data';
import { addDatabaseItem, deleteDatabaseItem, readDatabase, updateDatabaseItem, writeDatabase } from '../../../utils/database';
import { uploadPrincipalEditedImageToCloud } from '../../../utils/cloudImageStorage';
import { StoryReader } from '../AlumniGallery/StoryReader';

interface AlumniProfile {
  id: number;
  name: string;
  batch: string;
  role: string;
  field: string;
  img: string;
  vintageImg?: string;
  quote: string;
  story: string;
  favoriteMemory: string;
  messageToMMPNS: string;
}

interface Props {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

type ModalMode = 'add' | 'edit' | 'delete' | null;
const PAGE_SIZE = 8;
const ALUMNI_AUTO_SEED_FLAG = 'mmpns_dashboard_alumni_seeded_once';

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

const emptyForm: Partial<AlumniProfile> = {
  name: '',
  batch: '',
  role: '',
  field: '',
  img: '',
  vintageImg: '',
  quote: '',
  story: '',
  favoriteMemory: '',
  messageToMMPNS: '',
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

export const AlumniManager: React.FC<Props> = ({ showNotification }) => {
  const [alumni, setAlumni] = useState<AlumniProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterField, setFilterField] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniProfile | null>(null);
  const [formData, setFormData] = useState<Partial<AlumniProfile>>(emptyForm);
  const [imagePreview, setImagePreview] = useState<{ img?: string; vintageImg?: string }>({});
  const [uploadingField, setUploadingField] = useState<'img' | 'vintageImg' | null>(null);
  const [showStoryPreview, setShowStoryPreview] = useState(false);

  useEffect(() => {
    loadAlumni();
  }, []);

  const loadAlumni = () => {
    const data = readDatabase<{ alumni?: AlumniProfile[] }>('alumni');
    const hasAutoSeeded = localStorage.getItem(ALUMNI_AUTO_SEED_FLAG) === '1';

    if (!data || !Array.isArray(data.alumni)) {
      writeDatabase('alumni', {
        ...(data || {}),
        alumni: fallbackAlumniProfiles,
      });
      localStorage.setItem(ALUMNI_AUTO_SEED_FLAG, '1');
      setAlumni(fallbackAlumniProfiles);
      return;
    }

    if (data.alumni.length === 0) {
      if (!hasAutoSeeded) {
        writeDatabase('alumni', {
          ...data,
          alumni: fallbackAlumniProfiles,
        });
        localStorage.setItem(ALUMNI_AUTO_SEED_FLAG, '1');
        setAlumni(fallbackAlumniProfiles);
        return;
      }

      setAlumni([]);
      return;
    }

    if (data && Array.isArray(data.alumni)) {
      const shouldMigrateLegacySeed =
        data.alumni.length === 1 &&
        data.alumni[0]?.name === fallbackAlumniProfiles[0]?.name &&
        fallbackAlumniProfiles.length > 1;

      if (shouldMigrateLegacySeed) {
        writeDatabase('alumni', {
          ...data,
          alumni: fallbackAlumniProfiles,
        });
        localStorage.setItem(ALUMNI_AUTO_SEED_FLAG, '1');
        setAlumni(fallbackAlumniProfiles);
        return;
      }

      localStorage.setItem(ALUMNI_AUTO_SEED_FLAG, '1');
      setAlumni(data.alumni);
      return;
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedAlumni(null);
    setFormData(emptyForm);
    setImagePreview({});
    setUploadingField(null);
    setShowStoryPreview(false);
  };

  const openAddModal = () => {
    setSelectedAlumni(null);
    setFormData(emptyForm);
    setModalMode('add');
  };

  const openEditModal = (profile: AlumniProfile) => {
    setSelectedAlumni(profile);
    setFormData(profile);
    setImagePreview({ img: profile.img, vintageImg: profile.vintageImg });
    setModalMode('edit');
  };

  const openStoryPreview = (profile: AlumniProfile) => {
    setSelectedAlumni(profile);
    setShowStoryPreview(true);
  };

  const openDeleteModal = (profile: AlumniProfile) => {
    setSelectedAlumni(profile);
    setModalMode('delete');
  };

  const isValidForm =
    Boolean(formData.name?.trim()) &&
    Boolean(formData.batch?.trim()) &&
    Boolean(formData.role?.trim()) &&
    Boolean(formData.field?.trim()) &&
    Boolean(formData.img?.trim()) &&
    Boolean(formData.quote?.trim()) &&
    Boolean(formData.story?.trim()) &&
    Boolean(formData.favoriteMemory?.trim()) &&
    Boolean(formData.messageToMMPNS?.trim());

  const handleImageUpload = async (field: 'img' | 'vintageImg', file?: File) => {
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
      setImagePreview((prev) => ({ ...prev, [field]: previewData }));
    } catch {
      showNotification('error', 'Unable to preview selected image.');
      return;
    }

    setUploadingField(field);

    try {
      const cloudUrl = await uploadPrincipalEditedImageToCloud({
        file,
        pageFolder: 'alumni-dashboard',
        slot: field,
      });

      if (!cloudUrl) {
        setFormData((prev) => ({ ...prev, [field]: previewData }));
        showNotification('info', 'Cloud image is not configured. Image saved locally for this entry.');
        return;
      }

      setFormData((prev) => ({ ...prev, [field]: cloudUrl }));
      showNotification('success', `${field === 'img' ? 'Main' : 'Vintage'} image uploaded to cloud storage.`);
    } catch {
      setFormData((prev) => ({ ...prev, [field]: previewData }));
      showNotification('info', 'Cloud upload failed. Image saved locally for this entry.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = () => {
    const payload = {
      name: formData.name?.trim() || '',
      batch: formData.batch?.trim() || '',
      role: formData.role?.trim() || '',
      field: formData.field?.trim() || '',
      img: formData.img?.trim() || '',
      vintageImg: formData.vintageImg?.trim() || '',
      quote: formData.quote?.trim() || '',
      story: formData.story?.trim() || '',
      favoriteMemory: formData.favoriteMemory?.trim() || '',
      messageToMMPNS: formData.messageToMMPNS?.trim() || '',
    };

    if (!isValidForm) {
      showNotification('error', 'Please complete all required fields before saving.');
      return;
    }

    if (modalMode === 'edit' && selectedAlumni) {
      const success = updateDatabaseItem<AlumniProfile>('alumni', 'alumni', selectedAlumni.id, payload);
      if (!success) {
        showNotification('error', 'Failed to update alumni profile.');
        return;
      }

      showNotification('success', 'Alumni profile updated successfully.');
      loadAlumni();
      closeModal();
      return;
    }

    if (modalMode === 'add') {
      const newId = addDatabaseItem<AlumniProfile>('alumni', 'alumni', payload);
      if (!newId) {
        showNotification('error', 'Failed to add alumni profile.');
        return;
      }

      showNotification('success', 'Alumni profile added successfully.');
      loadAlumni();
      closeModal();
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedAlumni) {
      return;
    }

    const success = deleteDatabaseItem('alumni', 'alumni', selectedAlumni.id);
    if (!success) {
      showNotification('error', 'Failed to delete alumni profile.');
      return;
    }

    showNotification('success', 'Alumni profile deleted successfully.');
    loadAlumni();
    closeModal();
  };

  const filteredAlumni = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return alumni.filter((profile) => {
      const matchesSearch =
        profile.name.toLowerCase().includes(q) ||
        profile.role.toLowerCase().includes(q) ||
        profile.field.toLowerCase().includes(q) ||
        profile.batch.toLowerCase().includes(q);
      const matchesBatch = filterBatch === 'all' || profile.batch === filterBatch;
      const matchesField = filterField === 'all' || profile.field === filterField;
      return matchesSearch && matchesBatch && matchesField;
    });
  }, [alumni, filterBatch, filterField, searchQuery]);

  const batchOptions = useMemo(() => {
    return Array.from(new Set(alumni.map((profile) => profile.batch).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  }, [alumni]);

  const fieldOptions = useMemo(() => {
    return Array.from(new Set(alumni.map((profile) => profile.field).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [alumni]);

  const totalPages = Math.max(1, Math.ceil(filteredAlumni.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedAlumni = filteredAlumni.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBatch, filterField]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#185C20]/30" />
          <input
            type="text"
            placeholder="Search by name, role, field, or batch..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] placeholder-[#185C20]/30 focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
          />
        </div>

        <select
          value={filterBatch}
          onChange={(event) => setFilterBatch(event.target.value)}
          className="px-4 py-2.5 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 cursor-pointer"
        >
          <option value="all">All Batches</option>
          {batchOptions.map((batch) => (
            <option key={batch} value={batch}>
              {batch}
            </option>
          ))}
        </select>

        <select
          value={filterField}
          onChange={(event) => setFilterField(event.target.value)}
          className="px-4 py-2.5 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 cursor-pointer"
        >
          <option value="all">All Fields</option>
          {fieldOptions.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#185C20] text-white rounded-lg text-sm font-bold hover:bg-[#185C20]/90 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          Add Alumni
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#185C20]/10 overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#185C20]/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Alumni</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Batch</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Field</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-[#185C20] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#185C20]/5">
              {paginatedAlumni.map((profile) => (
                <tr key={profile.id} className="hover:bg-[#185C20]/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={profile.img} alt={profile.name} className="w-10 h-10 rounded-lg object-cover border border-[#185C20]/10" />
                      <span className="text-sm font-semibold text-[#185C20]">{profile.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#185C20]/70">{profile.batch}</td>
                  <td className="px-4 py-3 text-sm text-[#185C20]/70">{profile.role}</td>
                  <td className="px-4 py-3 text-sm text-[#185C20]/70">{profile.field}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openStoryPreview(profile)}
                        className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openEditModal(profile)}
                        className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(profile)}
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
          {paginatedAlumni.map((profile) => (
            <div key={profile.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <img src={profile.img} alt={profile.name} className="w-12 h-12 rounded-lg object-cover border border-[#185C20]/10" />
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#185C20] text-sm truncate">{profile.name}</h4>
                    <p className="text-xs text-[#185C20]/60">Batch {profile.batch}</p>
                    <p className="text-xs text-[#185C20]/55 mt-0.5 line-clamp-1">{profile.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openStoryPreview(profile)}
                    className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => openEditModal(profile)}
                    className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(profile)}
                    className="p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <span className="px-2 py-0.5 bg-[#EDCD1F]/20 rounded text-xs text-[#185C20]">{profile.field}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredAlumni.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-[#185C20]/40">No alumni profiles found.</p>
          </div>
        )}
      </div>

      {filteredAlumni.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#185C20]/50">
            Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filteredAlumni.length)} of {filteredAlumni.length}
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
          title={modalMode === 'add' ? 'Add Alumni Profile' : 'Edit Alumni Profile'}
          subtitle="These fields power the public alumni cards and story reader."
          onClose={closeModal}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Batch *</label>
              <input
                type="text"
                value={formData.batch || ''}
                onChange={(event) => setFormData({ ...formData, batch: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Role *</label>
              <input
                type="text"
                value={formData.role || ''}
                onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Field / Category *</label>
              <input
                type="text"
                value={formData.field || ''}
                onChange={(event) => setFormData({ ...formData, field: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Photo Upload *</label>
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-xs font-bold text-[#185C20] hover:bg-[#185C20]/5 cursor-pointer transition-colors">
                <UploadCloud size={14} />
                {uploadingField === 'img' ? 'Uploading to Firebase...' : 'Upload Main Photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleImageUpload('img', event.target.files?.[0])}
                />
              </label>
              {(imagePreview.img || formData.img) && (
                <img
                  src={imagePreview.img || formData.img}
                  alt="Main preview"
                  className="mt-2 w-20 h-20 rounded-lg object-cover border border-[#185C20]/10"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Vintage Photo Upload (optional)</label>
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-xs font-bold text-[#185C20] hover:bg-[#185C20]/5 cursor-pointer transition-colors">
                <UploadCloud size={14} />
                {uploadingField === 'vintageImg' ? 'Uploading to Firebase...' : 'Upload Vintage Photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleImageUpload('vintageImg', event.target.files?.[0])}
                />
              </label>
              {(imagePreview.vintageImg || formData.vintageImg) && (
                <img
                  src={imagePreview.vintageImg || formData.vintageImg}
                  alt="Vintage preview"
                  className="mt-2 w-20 h-20 rounded-lg object-cover border border-[#185C20]/10"
                />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Quote *</label>
              <input
                type="text"
                value={formData.quote || ''}
                onChange={(event) => setFormData({ ...formData, quote: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Story *</label>
              <textarea
                rows={4}
                value={formData.story || ''}
                onChange={(event) => setFormData({ ...formData, story: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Favorite Memory *</label>
              <textarea
                rows={3}
                value={formData.favoriteMemory || ''}
                onChange={(event) => setFormData({ ...formData, favoriteMemory: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Message to MMPNS *</label>
              <textarea
                rows={3}
                value={formData.messageToMMPNS || ''}
                onChange={(event) => setFormData({ ...formData, messageToMMPNS: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 resize-none"
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

      {showStoryPreview && selectedAlumni && (
        <StoryReader
          alumni={selectedAlumni}
          onClose={() => {
            setShowStoryPreview(false);
            setSelectedAlumni(null);
          }}
          onPrev={() => undefined}
          onNext={() => undefined}
          hasPrev={false}
          hasNext={false}
        />
      )}

      {modalMode === 'delete' && selectedAlumni && (
        <ModalShell title="Delete Alumni Profile" subtitle="This will remove the card from the public alumni gallery." onClose={closeModal}>
          <p className="text-sm text-[#185C20]/75 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-[#185C20]">{selectedAlumni.name}</span>? This action cannot be undone.
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
