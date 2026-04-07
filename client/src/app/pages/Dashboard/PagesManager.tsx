import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Edit, Eye, Plus, Save, Search, Trash2, UploadCloud, X } from 'lucide-react';

import { uploadPrincipalEditedImageToCloud } from '../../../utils/cloudImageStorage';
import { readDatabase, writeDatabase } from '../../../utils/database';
import { HOME_IMAGE_DEFAULTS, readHomeImageSlots, type HomeImageSlotKey } from '../../../utils/homeImageSlots';
import { HeroSection } from '../Home/HeroSection';

interface Props {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

type FeaturedSlideType = 'announcement' | 'bulletin';
type ModalMode = 'add' | 'edit' | 'preview' | 'delete' | null;

interface FeaturedSlide {
  id: string;
  type: FeaturedSlideType;
  title: string;
  subtitle: string;
  description: string;
  location: string;
  date?: string;
  time?: string;
  imageSlot: HomeImageSlotKey;
  imageUrl?: string;
}

const EVENT_SLOT_OPTIONS: Array<{ value: HomeImageSlotKey; label: string }> = [
  { value: 'heroChristmas', label: 'Event Slot: Christmas' },
  { value: 'heroMass', label: 'Event Slot: Mass' },
];

const PAGE_SIZE = 6;

const emptySlide: FeaturedSlide = {
  id: '',
  type: 'announcement',
  title: '',
  subtitle: '',
  description: '',
  location: '',
  date: '',
  time: '',
  imageSlot: 'heroChristmas',
  imageUrl: '',
};

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

const isEventType = (value: unknown): value is FeaturedSlideType => {
  return value === 'announcement' || value === 'bulletin';
};

const getFallbackSlotForType = (type: FeaturedSlideType) => {
  return type === 'announcement' ? 'heroChristmas' : 'heroMass';
};

const normalizeSlide = (raw: unknown, index: number): FeaturedSlide | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const type = value.type;

  if (!isEventType(type)) {
    return null;
  }

  const maybeSlot = typeof value.imageSlot === 'string' ? value.imageSlot : '';
  const imageSlot = EVENT_SLOT_OPTIONS.some((slot) => slot.value === maybeSlot as HomeImageSlotKey)
    ? (maybeSlot as HomeImageSlotKey)
    : getFallbackSlotForType(type);

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : `home-event-${index + 1}`,
    type,
    title: typeof value.title === 'string' ? value.title : '',
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : '',
    description: typeof value.description === 'string' ? value.description : '',
    location: typeof value.location === 'string' ? value.location : '',
    date: typeof value.date === 'string' ? value.date : '',
    time: typeof value.time === 'string' ? value.time : '',
    imageSlot,
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : '',
  };
};

const ModalShell: React.FC<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, onClose, maxWidthClass = 'max-w-3xl', children }) => {
  return (
    <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`w-full max-w-[calc(100vw-1.5rem)] sm:max-w-none ${maxWidthClass} max-h-[92dvh] overflow-y-auto rounded-2xl bg-white border border-[#185C20]/10 shadow-2xl`}
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
            className="w-10 h-10 md:w-8 md:h-8 rounded-lg hover:bg-[#185C20]/5 text-[#185C20]/50 hover:text-[#185C20] transition-colors flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
};

export const PagesManager: React.FC<Props> = ({ showNotification }) => {
  const [pagesData, setPagesData] = useState<any>(null);
  const [slides, setSlides] = useState<FeaturedSlide[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | FeaturedSlideType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSlide, setSelectedSlide] = useState<FeaturedSlide | null>(null);
  const [formData, setFormData] = useState<FeaturedSlide>(emptySlide);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    const data = readDatabase<any>('pages');
    if (!data) {
      return;
    }

    const rawSlides = Array.isArray(data.home?.heroSlides) ? data.home.heroSlides : [];
    const normalizedSlides = rawSlides
      .map((slide: unknown, index: number) => normalizeSlide(slide, index))
      .filter((slide): slide is FeaturedSlide => Boolean(slide));

    setPagesData(data);
    setSlides(normalizedSlides);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType]);

  const persistSlides = (nextSlides: FeaturedSlide[], successMessage: string) => {
    if (!pagesData) {
      return;
    }

    const nextData = {
      ...pagesData,
      home: {
        ...(pagesData.home || {}),
        heroSlides: nextSlides,
      },
    };

    if (writeDatabase('pages', nextData)) {
      setPagesData(nextData);
      setSlides(nextSlides);
      showNotification('success', successMessage);
      return;
    }

    showNotification('error', 'Failed to save featured events.');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedSlide(null);
    setFormData(emptySlide);
    setIsUploadingImage(false);
  };

  const openAddModal = () => {
    setSelectedSlide(null);
    setFormData({
      ...emptySlide,
      id: `home-event-${Date.now()}`,
    });
    setModalMode('add');
  };

  const openEditModal = (slide: FeaturedSlide) => {
    setSelectedSlide(slide);
    setFormData(slide);
    setModalMode('edit');
  };

  const openPreviewModal = (slide: FeaturedSlide) => {
    setSelectedSlide(slide);
    setModalMode('preview');
  };

  const openDeleteModal = (slide: FeaturedSlide) => {
    setSelectedSlide(slide);
    setModalMode('delete');
  };

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
      setFormData((current) => ({ ...current, imageUrl: previewData }));
    } catch {
      showNotification('error', 'Unable to preview selected image.');
      return;
    }

    setIsUploadingImage(true);

    try {
      const cloudUrl = await uploadPrincipalEditedImageToCloud({
        file,
        pageFolder: 'featured-events',
        slot: formData.id || formData.imageSlot,
      });

      if (!cloudUrl) {
        showNotification('info', 'Cloud image is not configured. Image saved locally for this event.');
        return;
      }

      setFormData((current) => ({ ...current, imageUrl: cloudUrl }));
      showNotification('success', 'Event image uploaded to cloud storage.');
    } catch {
      setFormData((current) => ({ ...current, imageUrl: previewData }));
      showNotification('info', 'Cloud upload failed. Image saved locally for this event.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = () => {
    const payload: FeaturedSlide = {
      ...formData,
      id: formData.id || `home-event-${Date.now()}`,
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim(),
      description: formData.description.trim(),
      location: formData.location.trim(),
      date: (formData.date || '').trim(),
      time: (formData.time || '').trim(),
      imageUrl: (formData.imageUrl || '').trim(),
      imageSlot: formData.imageSlot,
      type: formData.type,
    };

    if (!payload.title || !payload.subtitle || !payload.description || !payload.location) {
      showNotification('error', 'Please complete all required fields before saving.');
      return;
    }

    if (modalMode === 'edit' && selectedSlide) {
      const nextSlides = slides.map((slide) => (slide.id === selectedSlide.id ? payload : slide));
      persistSlides(nextSlides, 'Featured event updated successfully.');
      closeModal();
      return;
    }

    if (modalMode === 'add') {
      const nextSlides = [...slides, payload];
      persistSlides(nextSlides, 'Featured event added successfully.');
      closeModal();
    }
  };

  const handleDelete = () => {
    if (!selectedSlide) {
      return;
    }

    const nextSlides = slides.filter((slide) => slide.id !== selectedSlide.id);
    persistSlides(nextSlides, 'Featured event removed successfully.');
    closeModal();
  };

  const filteredSlides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return slides.filter((slide) => {
      const matchesSearch =
        !q ||
        slide.title.toLowerCase().includes(q) ||
        slide.subtitle.toLowerCase().includes(q) ||
        slide.location.toLowerCase().includes(q);
      const matchesType = filterType === 'all' || slide.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [filterType, searchQuery, slides]);

  const totalPages = Math.max(1, Math.ceil(filteredSlides.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedSlides = filteredSlides.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const currentImageSlots = readHomeImageSlots();

  const getSlidePreviewImage = (slide: FeaturedSlide) => {
    return slide.imageUrl || currentImageSlots[slide.imageSlot] || HOME_IMAGE_DEFAULTS[slide.imageSlot];
  };

  const previewSlide = selectedSlide
    ? {
        type: selectedSlide.type,
        title: selectedSlide.title,
        subtitle: selectedSlide.subtitle,
        description: selectedSlide.description,
        image: null,
        eventImage: getSlidePreviewImage(selectedSlide),
        location: selectedSlide.location,
        date: selectedSlide.date,
        time: selectedSlide.time,
      }
    : null;

  if (!pagesData) {
    return <div className="text-sm text-[#185C20]/60">Loading featured events...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#185C20] text-white rounded-lg text-xs font-bold hover:bg-[#185C20]/90 cursor-pointer"
        >
          <Plus size={14} />
          Add Event
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#185C20]/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by title, subtitle, or location..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] placeholder-[#185C20]/30 focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
          />
        </div>

        <select
          value={filterType}
          onChange={(event) => setFilterType(event.target.value as 'all' | FeaturedSlideType)}
          className="px-4 py-2.5 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 cursor-pointer"
        >
          <option value="all">All Event Types</option>
          <option value="announcement">Announcement</option>
          <option value="bulletin">Bulletin</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[#185C20]/10 overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#185C20]/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Featured Event</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Image Source</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-[#185C20] uppercase">Schedule</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-[#185C20] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#185C20]/5">
              {paginatedSlides.map((slide) => (
                <tr key={slide.id} className="hover:bg-[#185C20]/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-[#185C20]">{slide.title}</p>
                      <p className="text-xs text-[#185C20]/55 mt-0.5">{slide.subtitle}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#EDCD1F]/20 text-[#185C20] text-xs font-bold uppercase">
                      {slide.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#185C20]/70">{slide.imageUrl ? 'Uploaded image' : slide.imageSlot}</td>
                  <td className="px-4 py-3 text-sm text-[#185C20]/70">
                    {slide.date || '-'}
                    {slide.time ? ` • ${slide.time}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openPreviewModal(slide)}
                        className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openEditModal(slide)}
                        className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(slide)}
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
          {paginatedSlides.map((slide) => (
            <div
              key={slide.id}
              className="p-4 cursor-pointer"
              onClick={() => openPreviewModal(slide)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#185C20] line-clamp-1">{slide.title}</p>
                  <p className="text-xs text-[#185C20]/55 mt-0.5 line-clamp-1">{slide.subtitle}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EDCD1F]/20 text-[#185C20] text-[10px] font-bold uppercase">
                      {slide.type}
                    </span>
                    <span className="text-[11px] text-[#185C20]/60">{slide.date || 'No schedule'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                  <button
                    onClick={() => openEditModal(slide)}
                    className="p-2 rounded-lg text-[#185C20]/55 hover:text-[#185C20] hover:bg-[#185C20]/6 transition-colors cursor-pointer"
                    aria-label={`Edit ${slide.title}`}
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => openDeleteModal(slide)}
                    className="p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    aria-label={`Delete ${slide.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#185C20]/60 mt-2 line-clamp-2">{slide.location}</p>
            </div>
          ))}
        </div>

        {filteredSlides.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-[#185C20]/40">No featured events found.</p>
          </div>
        )}
      </div>

      {filteredSlides.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#185C20]/50">
            Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filteredSlides.length)} of {filteredSlides.length}
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
          title={modalMode === 'add' ? 'Add Featured Event' : 'Edit Featured Event'}
          subtitle="This updates only event slides on the public Home page."
          onClose={closeModal}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Type *</label>
              <select
                value={formData.type}
                onChange={(event) => {
                  const nextType = event.target.value as FeaturedSlideType;
                  setFormData({
                    ...formData,
                    type: nextType,
                    imageSlot: getFallbackSlotForType(nextType),
                  });
                }}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 cursor-pointer"
              >
                <option value="announcement">Announcement</option>
                <option value="bulletin">Bulletin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Image Slot Fallback *</label>
              <select
                value={formData.imageSlot}
                onChange={(event) => setFormData({ ...formData, imageSlot: event.target.value as HomeImageSlotKey })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 cursor-pointer"
              >
                {EVENT_SLOT_OPTIONS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Event Image Upload</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-xs font-bold text-[#185C20] hover:bg-[#185C20]/5 cursor-pointer transition-colors">
                  <UploadCloud size={14} />
                  {isUploadingImage ? 'Uploading...' : 'Upload Event Image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleImageUpload(event.target.files?.[0])}
                  />
                </label>
                {formData.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setFormData((current) => ({ ...current, imageUrl: '' }))}
                    className="px-3 py-2 rounded-lg text-xs font-bold text-[#185C20] bg-[#185C20]/5 hover:bg-[#185C20]/10"
                  >
                    Use slot default
                  </button>
                ) : null}
              </div>
              <div className="mt-3 rounded-lg border border-[#185C20]/10 overflow-hidden bg-[#FAF9F6]">
                <img
                  src={formData.imageUrl || currentImageSlots[formData.imageSlot] || HOME_IMAGE_DEFAULTS[formData.imageSlot]}
                  alt="Featured event preview"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Subtitle *</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(event) => setFormData({ ...formData, subtitle: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Description *</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Date</label>
              <input
                type="text"
                value={formData.date}
                onChange={(event) => setFormData({ ...formData, date: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#185C20]/70 mb-1.5">Time</label>
              <input
                type="text"
                value={formData.time}
                onChange={(event) => setFormData({ ...formData, time: event.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#185C20]/10 rounded-lg text-sm text-[#185C20] focus:outline-none focus:ring-2 focus:ring-[#EDCD1F]/30"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-[#185C20] text-white rounded-lg text-sm font-bold hover:bg-[#185C20]/90 cursor-pointer"
            >
              <Save size={14} />
              Save
            </button>
            <button
              onClick={closeModal}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#185C20]/10 text-[#185C20] rounded-lg text-sm font-bold hover:bg-[#185C20]/5 cursor-pointer"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </ModalShell>
      )}

      {modalMode === 'preview' && selectedSlide && previewSlide && (
        <ModalShell
          title="Public Event Slide Preview"
          subtitle="This uses the same rendering component shown on Home."
          onClose={closeModal}
          maxWidthClass="max-w-6xl"
        >
          <div className="overflow-hidden rounded-xl border border-[#185C20]/10">
            <HeroSection setCurrentPage={() => undefined} slides={[previewSlide]} />
          </div>
        </ModalShell>
      )}

      {modalMode === 'delete' && selectedSlide && (
        <ModalShell title="Delete Featured Event" subtitle="This removes the event from Home slider." onClose={closeModal}>
          <p className="text-sm text-[#185C20]/75 leading-relaxed">
            Are you sure you want to delete <span className="font-bold text-[#185C20]">{selectedSlide.title}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 cursor-pointer"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              onClick={closeModal}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-[#185C20]/10 text-[#185C20] rounded-lg text-sm font-bold hover:bg-[#185C20]/5 cursor-pointer"
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
