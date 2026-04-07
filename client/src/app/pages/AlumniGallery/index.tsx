import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ImagePlus, RotateCcw, Search, Upload, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { alumniProfiles as fallbackAlumniProfiles } from './data';
import { AlumniProfile } from './types';
import { StoryReader } from './StoryReader';
import { FilterBar } from './FilterBar';
import { AlumniCard } from './AlumniCard';
import { Skeleton } from '../../components/ui/skeleton';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import {
  getCachedSiteDefaultImageUrls,
  syncSiteDefaultImagesToCloud,
  uploadPrincipalEditedImageToCloud,
} from '../../../utils/cloudImageStorage';
import { HOME_IMAGE_EDIT_MODE_KEY } from '../../../utils/homeImageSlots';
import { isPrincipalImageEditModeEnabled } from '../../../utils/imageEditMode';
import {
  SITE_IMAGE_DEFAULTS,
  readSiteImageSlots,
  restoreSiteImageSlot,
  writeSiteImageSlots,
  type SiteImageSlotMap,
} from '../../../utils/siteImageSlots';
import { readDatabase, writeDatabase } from '../../../utils/database';

type AlumniGalleryImageSlot = 'alumniGalleryJames' | 'alumniGalleryJamesVintage';

const ALUMNI_GALLERY_IMAGE_LABELS: Record<AlumniGalleryImageSlot, string> = {
  alumniGalleryJames: 'Featured alumni profile image',
  alumniGalleryJamesVintage: 'Featured alumni vintage image',
};

const readFileAsDataUrl = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : null;
      if (!value) {
        reject(new Error('Unable to read image file.'));
        return;
      }
      resolve(value);
    };
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });
};

const promoteDefaultsToCloudUrls = (
  currentSlots: SiteImageSlotMap,
  cloudMap: Partial<Record<keyof SiteImageSlotMap, string>>,
) => {
  const nextSlots = { ...currentSlots };

  (Object.keys(SITE_IMAGE_DEFAULTS) as Array<keyof SiteImageSlotMap>).forEach((slot) => {
    if (currentSlots[slot] !== SITE_IMAGE_DEFAULTS[slot]) {
      return;
    }

    const cloudUrl = cloudMap[slot];
    if (cloudUrl) {
      nextSlots[slot] = cloudUrl;
    }
  });

  return nextSlots;
};

const normalizeAlumniProfile = (profile: Partial<AlumniProfile>, index: number): AlumniProfile | null => {
  if (
    !profile.name ||
    !profile.batch ||
    !profile.role ||
    !profile.field ||
    !profile.img ||
    !profile.quote ||
    !profile.story ||
    !profile.favoriteMemory ||
    !profile.messageToMMPNS
  ) {
    return null;
  }

  return {
    id: typeof profile.id === 'number' ? profile.id : index + 1,
    name: profile.name,
    batch: profile.batch,
    role: profile.role,
    field: profile.field,
    img: profile.img,
    vintageImg: profile.vintageImg,
    quote: profile.quote,
    story: profile.story,
    favoriteMemory: profile.favoriteMemory,
    messageToMMPNS: profile.messageToMMPNS,
  };
};

const loadAlumniProfiles = () => {
  const data = readDatabase<{ alumni?: Partial<AlumniProfile>[] }>('alumni');
  if (!data || !Array.isArray(data.alumni)) {
    return {
      profiles: [],
      fromDatabase: true,
    };
  }

  if (data.alumni.length === 0) {
    return {
      profiles: [],
      fromDatabase: true,
    };
  }

  const shouldMigrateLegacySeed =
    data.alumni.length === 1 &&
    data.alumni[0]?.name === fallbackAlumniProfiles[0]?.name &&
    fallbackAlumniProfiles.length > 1;

  if (shouldMigrateLegacySeed) {
    writeDatabase('alumni', {
      ...data,
      alumni: fallbackAlumniProfiles,
    });
    return {
      profiles: fallbackAlumniProfiles,
      fromDatabase: true,
    };
  }

  const normalized = data.alumni
    .map((profile, index) => normalizeAlumniProfile(profile, index))
    .filter((profile): profile is AlumniProfile => profile !== null);

  if (normalized.length === 0) {
    return {
      profiles: [],
      fromDatabase: true,
    };
  }

  return {
    profiles: normalized,
    fromDatabase: true,
  };
};

const ALUMNI_PROFILES_QUERY_KEY = ['alumni-profiles'];

export const AlumniGallery: React.FC = () => {
  const setCurrentPage = useAppNavigate();
  const queryClient = useQueryClient();

  const alumniProfilesQuery = useQuery({
    queryKey: ALUMNI_PROFILES_QUERY_KEY,
    queryFn: async () => loadAlumniProfiles(),
  });

  const galleryProfiles = alumniProfilesQuery.data?.profiles ?? [];
  const isUsingDatabaseProfiles = alumniProfilesQuery.data?.fromDatabase ?? true;

  const [selectedAlumni, setSelectedAlumni] = useState<AlumniProfile | null>(null);
  const [filterBatch, setFilterBatch] = useState('All');
  const [filterField, setFilterField] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isImageEditMode, setIsImageEditMode] = useState(false);
  const [siteImageSlots, setSiteImageSlots] = useState<SiteImageSlotMap>({
    ...SITE_IMAGE_DEFAULTS,
  });
  const [editingSlot, setEditingSlot] = useState<AlumniGalleryImageSlot | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const [hasLoadedSlots, setHasLoadedSlots] = useState(false);

  React.useEffect(() => {
    setSiteImageSlots(readSiteImageSlots());
    setHasLoadedSlots(true);
    setIsImageEditMode(isPrincipalImageEditModeEnabled());

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'mmpns_db_alumni') {
        queryClient.invalidateQueries({ queryKey: ALUMNI_PROFILES_QUERY_KEY });
      }
    };

    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ALUMNI_PROFILES_QUERY_KEY });
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient]);

  React.useEffect(() => {
    if (!hasLoadedSlots) {
      return;
    }

    writeSiteImageSlots(siteImageSlots);
  }, [hasLoadedSlots, siteImageSlots]);

  React.useEffect(() => {
    const cachedMap = getCachedSiteDefaultImageUrls();
    setSiteImageSlots((current) => promoteDefaultsToCloudUrls(current, cachedMap));

    let isMounted = true;

    void syncSiteDefaultImagesToCloud()
      .then((cloudMap) => {
        if (!isMounted) {
          return;
        }

        setSiteImageSlots((current) => promoteDefaultsToCloudUrls(current, cloudMap));
      })
      .catch((error) => {
        console.warn('Default image cloud sync failed.', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const closeModal = () => {
    setEditingSlot(null);
    setUploadError('');
    setUploadNotice('');
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const slot = editingSlot;

    if (!file || !slot) {
      return;
    }

    event.currentTarget.value = '';

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload a valid image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image file must be 10MB or smaller.');
      return;
    }

    setUploadError('');
    setUploadNotice('');

    try {
      const cloudUrl = await uploadPrincipalEditedImageToCloud({
        file,
        pageFolder: 'alumni-gallery',
        slot,
      });

      if (cloudUrl) {
        setSiteImageSlots((current) => ({
          ...current,
          [slot]: cloudUrl,
        }));
        setUploadNotice('Image uploaded to cloud storage folder: principal-edits/alumni-gallery.');
        setEditingSlot(null);
        return;
      }
    } catch (error) {
      console.warn('Cloud upload failed, storing image locally instead.', error);
    }

    try {
      const localDataUrl = await readFileAsDataUrl(file);
      setSiteImageSlots((current) => ({
        ...current,
        [slot]: localDataUrl,
      }));
      setUploadNotice('Cloud upload is not configured. Image is saved locally in this browser.');
      setEditingSlot(null);
    } catch {
      setUploadError('Unable to read the selected image.');
    }
  };

  const hydratedProfiles = React.useMemo(() => {
    return galleryProfiles.map((profile) => {
      if (isUsingDatabaseProfiles || profile.id !== 1) {
        return profile;
      }

      return {
        ...profile,
        img: siteImageSlots.alumniGalleryJames,
        vintageImg: siteImageSlots.alumniGalleryJamesVintage,
      };
    });
  }, [galleryProfiles, isUsingDatabaseProfiles, siteImageSlots]);

  const batchYears = ['All', ...Array.from(new Set(hydratedProfiles.map(p => p.batch))).sort()];
  const fields = ['All', ...Array.from(new Set(hydratedProfiles.map(p => p.field))).sort()];

  const filteredProfiles = hydratedProfiles.filter(p => {
    const matchBatch = filterBatch === 'All' || p.batch === filterBatch;
    const matchField = filterField === 'All' || p.field === filterField;
    const matchSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.field.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBatch && matchField && matchSearch;
  });

  const currentIndex = selectedAlumni ? filteredProfiles.findIndex(a => a.id === selectedAlumni.id) : -1;

  const goToStory = (dir: 'prev' | 'next') => {
    const newIdx = dir === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIdx >= 0 && newIdx < filteredProfiles.length) {
      setSelectedAlumni(filteredProfiles[newIdx]);
    }
  };

  const clearFilters = () => {
    setFilterBatch('All');
    setFilterField('All');
    setSearchQuery('');
  };

  const hasActiveFilters = filterBatch !== 'All' || filterField !== 'All' || searchQuery !== '';

  return (
    <div className="relative bg-[#FAF9F6] selection:bg-[#EDCD1F] selection:text-[#185C20] min-h-screen">
      {isImageEditMode && (
        <div className="fixed top-[88px] md:top-[122px] right-4 z-40 w-[min(90vw,320px)] rounded-xl bg-[#185C20] text-white border border-white/15 shadow-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold">
              <ImagePlus size={13} />
              Alumni gallery image editor
            </span>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(HOME_IMAGE_EDIT_MODE_KEY, 'false');
                setIsImageEditMode(false);
                setEditingSlot(null);
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-semibold hover:bg-white/15 transition-colors"
            >
              Exit
            </button>
          </div>

          {(Object.keys(ALUMNI_GALLERY_IMAGE_LABELS) as AlumniGalleryImageSlot[]).map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => {
                setEditingSlot(slot);
                setUploadError('');
                setUploadNotice('');
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <p className="text-[11px] font-semibold text-white/85">{ALUMNI_GALLERY_IMAGE_LABELS[slot]}</p>
              <p className="text-[10px] text-white/60 mt-0.5">Click to upload or restore</p>
            </button>
          ))}
        </div>
      )}

      <FilterBar
        setCurrentPage={setCurrentPage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterBatch={filterBatch}
        setFilterBatch={setFilterBatch}
        filterField={filterField}
        setFilterField={setFilterField}
        batchYears={batchYears}
        fields={fields}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        resultsCount={filteredProfiles.length}
      />

      <section className="container mx-auto px-4 py-16 pb-32">
        {alumniProfilesQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-8">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="space-y-3 rounded-xl border border-[#185C20]/10 bg-white p-3">
                <Skeleton className="h-56 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProfiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredProfiles.map((alumni, idx) => (
              <AlumniCard
                key={alumni.id}
                alumni={alumni}
                index={idx}
                onClick={() => setSelectedAlumni(alumni)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[#185C20]/5 rounded-full flex items-center justify-center mb-4">
              <Search size={24} className="text-[#185C20]/40" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#185C20] mb-2">No alumni found</h3>
            <p className="text-[#185C20]/50 max-w-xs mx-auto">
              We couldn't find any profiles matching your current filters. Try adjusting your search criteria.
            </p>
            <button 
              onClick={clearFilters}
              className="mt-6 text-[#EDCD1F] font-bold text-sm uppercase tracking-widest hover:text-[#185C20] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </section>

      <AnimatePresence>
        {selectedAlumni && (
          <StoryReader
            alumni={selectedAlumni}
            onClose={() => setSelectedAlumni(null)}
            onPrev={() => goToStory('prev')}
            onNext={() => goToStory('next')}
            hasPrev={currentIndex > 0}
            hasNext={currentIndex < filteredProfiles.length - 1}
          />
        )}
      </AnimatePresence>

      {isImageEditMode && editingSlot && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white border border-[#185C20]/10 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#185C20]">Edit Alumni Gallery Image</h3>
                <p className="text-xs text-gray-500 mt-0.5">{ALUMNI_GALLERY_IMAGE_LABELS[editingSlot]}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-white">
                    Current
                  </p>
                  <img src={siteImageSlots[editingSlot]} alt={ALUMNI_GALLERY_IMAGE_LABELS[editingSlot]} className="w-full h-52 object-contain bg-white" />
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-white">
                    Default Preview
                  </p>
                  <img src={SITE_IMAGE_DEFAULTS[editingSlot]} alt={`Default ${ALUMNI_GALLERY_IMAGE_LABELS[editingSlot]}`} className="w-full h-52 object-contain bg-white" />
                </div>
              </div>

              {uploadError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {uploadError}
                </p>
              )}

              {uploadNotice && (
                <p className="text-xs font-semibold text-[#185C20] bg-[#185C20]/10 border border-[#185C20]/20 rounded-lg px-3 py-2">
                  {uploadNotice}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#185C20] text-white text-sm font-semibold hover:bg-[#144a1a] transition-colors cursor-pointer">
                  <Upload size={14} />
                  Upload new image
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSiteImageSlots((current) => restoreSiteImageSlot(current, editingSlot));
                    setUploadError('');
                    setUploadNotice('Default image restored for this section.');
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#EDCD1F]/25 text-[#185C20] text-sm font-semibold hover:bg-[#EDCD1F]/35 transition-colors"
                >
                  <RotateCcw size={14} />
                  Restore default
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniGallery;