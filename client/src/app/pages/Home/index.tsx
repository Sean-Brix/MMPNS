import React from 'react';
import { ImagePlus, RotateCcw, Upload, X } from 'lucide-react';

import { HeroSection } from './HeroSection';
import { FoundressLegacy } from './FoundressLegacy';
import { InstitutionalPillars } from './InstitutionalPillars';
import { AcademicHighlights } from './AcademicHighlights';
import { AccreditationSection } from './AccreditationSection';
import { InstitutionalCTA } from './InstitutionalCTA';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import { getTeacherSession } from '../../../utils/auth';
import {
  readDatabase,
  readDatabaseOnline,
  subscribeDatabaseTable,
} from '../../../utils/database';
import {
  getCachedSiteDefaultImageUrls,
  resolveHomeDefaultImages,
  syncSiteDefaultImagesToCloud,
  uploadPrincipalEditedImageToCloud,
} from '../../../utils/cloudImageStorage';
import {
  canPersistHomeImageSlots,
  HOME_IMAGE_DEFAULTS,
  HOME_IMAGE_EDIT_MODE_KEY,
  type HomeImageSlotKey,
  readHomeImageSlots,
  writeHomeImageSlots,
} from '../../../utils/homeImageSlots';

const readFileAsDataUrl = (file: File) => {
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

const loadImageFromDataUrl = (dataUrl: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to process image.'));
    image.src = dataUrl;
  });
};

const exportCanvasAsDataUrl = (
  image: HTMLImageElement,
  maxEdge: number,
  quality: number,
) => {
  const canvas = document.createElement('canvas');
  const longestEdge = Math.max(image.width, image.height);
  const scale = longestEdge > maxEdge ? maxEdge / longestEdge : 1;

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to process image.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/webp', quality);
};

const fitImageToStorage = async (
  file: File,
  currentSlots: Record<HomeImageSlotKey, string>,
  slot: HomeImageSlotKey,
) => {
  const originalDataUrl = await readFileAsDataUrl(file);
  const originalSlots = {
    ...currentSlots,
    [slot]: originalDataUrl,
  };

  if (canPersistHomeImageSlots(originalSlots)) {
    return {
      dataUrl: originalDataUrl,
      wasOptimized: false,
    };
  }

  const image = await loadImageFromDataUrl(originalDataUrl);

  const maxEdgeSteps = [2600, 2200, 1800, 1500];
  const qualitySteps = [0.98, 0.95, 0.92, 0.88];

  for (const maxEdge of maxEdgeSteps) {
    for (const quality of qualitySteps) {
      const candidateDataUrl = exportCanvasAsDataUrl(image, maxEdge, quality);
      const candidateSlots = {
        ...currentSlots,
        [slot]: candidateDataUrl,
      };

      if (canPersistHomeImageSlots(candidateSlots)) {
        return {
          dataUrl: candidateDataUrl,
          wasOptimized: true,
        };
      }
    }
  }

  return null;
};

const promoteDefaultsToCloudUrls = (
  currentSlots: Record<HomeImageSlotKey, string>,
  localDefaults: Record<HomeImageSlotKey, string>,
  cloudDefaults: Record<HomeImageSlotKey, string>,
) => {
  const nextSlots = { ...currentSlots };

  (Object.keys(localDefaults) as HomeImageSlotKey[]).forEach((slot) => {
    if (currentSlots[slot] === localDefaults[slot]) {
      nextSlots[slot] = cloudDefaults[slot];
    }
  });

  return nextSlots;
};

type HomeHeroSlideType = 'hero' | 'announcement' | 'bulletin';
type FeaturedEventSlideType = 'announcement' | 'bulletin';

interface HomeHeroSlideTemplate {
  id: string;
  type: HomeHeroSlideType;
  title: string;
  subtitle: string;
  description: string;
  location: string;
  date?: string;
  time?: string;
  accent?: string;
  imageSlot: HomeImageSlotKey;
  imageUrl?: string;
}

interface FeaturedEventSlideTemplate extends HomeHeroSlideTemplate {
  type: FeaturedEventSlideType;
}

const HOME_IMAGE_SLOT_KEYS: HomeImageSlotKey[] = [
  'heroMain',
  'heroGarden',
  'heroChristmas',
  'heroMass',
  'foundressLegacy',
  'academicKindergarten',
  'academicElementary',
  'academicJuniorHigh',
];

const INTRO_HERO_SLIDES: HomeHeroSlideTemplate[] = [
  {
    id: 'home-hero-main',
    type: 'hero',
    title: 'Excellence Through Faith',
    subtitle: 'Developing Global Leaders Rooted in Faith',
    description:
      'Welcome to Madre Maria Pia Notari School, where we blend 35+ years of academic tradition with a vibrant Catholic charism to nurture the leaders of tomorrow.',
    location: 'Parañaque City',
    accent: 'Through Faith',
    imageSlot: 'heroMain',
  },
  {
    id: 'home-hero-garden',
    type: 'hero',
    title: 'Tradition of Service',
    subtitle: 'Rooted in Eucharistic Adoration',
    description:
      'Guided by the spiritual legacy of the Sisters Adorers of the Holy Eucharist, we integrate devotion and discipline into every aspect of campus life.',
    location: 'Spirituality Center',
    accent: 'Rooted in Service',
    imageSlot: 'heroGarden',
  },
];

const DEFAULT_FEATURED_EVENT_SLIDES: FeaturedEventSlideTemplate[] = [
  {
    id: 'home-event-mass',
    type: 'announcement',
    title: 'Christmas & New Year Dance',
    subtitle: 'FESTIVE CELEBRATION',
    description:
      "Our students bring joy and talent to the stage in our annual holiday presentation. A vibrant celebration of our community's spirit as we welcome the new year with dance and gratitude.",
    location: 'MMPNS Main Stage',
    date: 'Dec 20',
    time: '2:00 PM',
    imageSlot: 'heroChristmas',
    imageUrl: '',
  },
  {
    id: 'home-event-monthly-mass',
    type: 'bulletin',
    title: 'School Community Mass',
    subtitle: 'EUCHARISTIC CELEBRATION',
    description:
      'Rooted in the Sisters Adorers charism, our school community gathers regularly for the Holy Sacrifice of the Mass, the source and summit of our Christian life and academic discipline.',
    location: 'MMPNS Quadrangle',
    date: 'Monthly',
    time: '8:30 AM',
    imageSlot: 'heroMass',
    imageUrl: '',
  },
];

const isHomeImageSlotKey = (value: unknown): value is HomeImageSlotKey => {
  return typeof value === 'string' && HOME_IMAGE_SLOT_KEYS.includes(value as HomeImageSlotKey);
};

const isFeaturedEventSlideType = (value: unknown): value is FeaturedEventSlideType => {
  return value === 'announcement' || value === 'bulletin';
};

const normalizeFeaturedEventSlide = (value: unknown, index: number): FeaturedEventSlideTemplate | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (!isFeaturedEventSlideType(raw.type)) {
    return null;
  }

  const fallbackSlot = raw.type === 'announcement' ? 'heroChristmas' : 'heroMass';
  const imageSlot = isHomeImageSlotKey(raw.imageSlot) ? raw.imageSlot : fallbackSlot;

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `home-event-${index + 1}`,
    type: raw.type,
    title: typeof raw.title === 'string' ? raw.title : 'New Slide',
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    location: typeof raw.location === 'string' ? raw.location : '',
    date: typeof raw.date === 'string' ? raw.date : undefined,
    time: typeof raw.time === 'string' ? raw.time : undefined,
    imageSlot,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
  };
};

export const Home: React.FC = () => {
  const setCurrentPage = useAppNavigate();
  const [isMobile, setIsMobile] = React.useState(false);
  const [isImageEditMode, setIsImageEditMode] = React.useState(false);
  const [editingSlot, setEditingSlot] = React.useState<HomeImageSlotKey | null>(null);
  const [uploadError, setUploadError] = React.useState('');
  const [uploadNotice, setUploadNotice] = React.useState('');
  const [storageError, setStorageError] = React.useState('');
  const [hasLoadedImageSlots, setHasLoadedImageSlots] = React.useState(false);
  const [homeDefaultSlots, setHomeDefaultSlots] = React.useState<Record<HomeImageSlotKey, string>>({
    ...HOME_IMAGE_DEFAULTS,
  });
  const [featuredEventSlides, setFeaturedEventSlides] = React.useState<FeaturedEventSlideTemplate[]>(DEFAULT_FEATURED_EVENT_SLIDES);
  const [imageSlots, setImageSlots] = React.useState<Record<HomeImageSlotKey, string>>({
    ...HOME_IMAGE_DEFAULTS,
  });

  const applyFeaturedSlidesFromPages = (pagesData: any) => {
    const rawSlides = pagesData?.home?.heroSlides;
    if (!Array.isArray(rawSlides)) {
      return;
    }

    const normalizedSlides = rawSlides
      .map((slide, index) => normalizeFeaturedEventSlide(slide, index))
      .filter((slide): slide is FeaturedEventSlideTemplate => Boolean(slide));

    setFeaturedEventSlides(normalizedSlides.length > 0 ? normalizedSlides : DEFAULT_FEATURED_EVENT_SLIDES);
  };

  const imageSlotLabels: Record<HomeImageSlotKey, string> = {
    heroMain: 'Hero slide: Excellence Through Faith',
    heroGarden: 'Hero slide: Tradition of Service',
    heroChristmas: 'Event card: Christmas and New Year Dance',
    heroMass: 'Event card: School Community Mass',
    foundressLegacy: 'Foundress legacy section image',
    academicKindergarten: 'Academic highlight: Kindergarten',
    academicElementary: 'Academic highlight: Elementary',
    academicJuniorHigh: 'Academic highlight: Junior High',
  };

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    setImageSlots(readHomeImageSlots());
    setHasLoadedImageSlots(true);

    const localPagesData = readDatabase<any>('pages');
    applyFeaturedSlidesFromPages(localPagesData);

    let isMounted = true;

    void readDatabaseOnline<any>('pages').then((onlinePagesData) => {
      if (!isMounted || !onlinePagesData) {
        return;
      }

      applyFeaturedSlidesFromPages(onlinePagesData);
    });

    const unsubscribe = subscribeDatabaseTable<any>(
      'pages',
      (pagesData) => {
        if (!isMounted || !pagesData) {
          return;
        }

        applyFeaturedSlidesFromPages(pagesData);
      },
      (error) => {
        console.error('Failed to subscribe to pages updates:', error);
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    const cachedDefaults = resolveHomeDefaultImages(getCachedSiteDefaultImageUrls());
    setHomeDefaultSlots(cachedDefaults);
    setImageSlots((current) => promoteDefaultsToCloudUrls(current, HOME_IMAGE_DEFAULTS, cachedDefaults));

    let isMounted = true;

    void syncSiteDefaultImagesToCloud()
      .then((cloudMap) => {
        if (!isMounted) {
          return;
        }

        const cloudBackedDefaults = resolveHomeDefaultImages(cloudMap);
        setHomeDefaultSlots(cloudBackedDefaults);
        setImageSlots((current) =>
          promoteDefaultsToCloudUrls(current, HOME_IMAGE_DEFAULTS, cloudBackedDefaults),
        );
      })
      .catch((error) => {
        console.warn('Default image cloud sync failed.', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!hasLoadedImageSlots) {
      return;
    }
    const didPersist = writeHomeImageSlots(imageSlots);
    if (!didPersist) {
      setStorageError('Browser storage is full. Upload smaller images or restore defaults to save changes.');
      return;
    }
    setStorageError('');
  }, [hasLoadedImageSlots, imageSlots]);

  React.useEffect(() => {
    const isPrincipal = getTeacherSession()?.position === 'Principal';
    const toggleEnabled = localStorage.getItem(HOME_IMAGE_EDIT_MODE_KEY) === 'true';
    setIsImageEditMode(isPrincipal && toggleEnabled);
  }, []);

  const openEditModal = (slot: HomeImageSlotKey) => {
    setEditingSlot(slot);
    setUploadError('');
    setUploadNotice('');
  };

  const closeEditModal = () => {
    setEditingSlot(null);
    setUploadError('');
    setUploadNotice('');
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        pageFolder: 'homepage',
        slot,
      });

      if (cloudUrl) {
        setImageSlots((current) => ({
          ...current,
          [slot]: cloudUrl,
        }));
        setStorageError('');
        setUploadNotice('Image uploaded to cloud storage folder: principal-edits/homepage.');
        setEditingSlot(null);
        return;
      }
    } catch (error) {
      console.warn('Cloud upload failed, storing image locally instead.', error);
    }

    try {
      const fittedImage = await fitImageToStorage(file, imageSlots, slot);
      if (!fittedImage) {
        setUploadError('Selected image is too large to save. Try a smaller image or lower resolution.');
        return;
      }

      setImageSlots((current) => ({
        ...current,
        [slot]: fittedImage.dataUrl,
      }));

      if (fittedImage.wasOptimized) {
        setUploadNotice('Image was automatically optimized to fit browser storage.');
      } else {
        setUploadNotice('Cloud upload is not configured. Image is saved locally in this browser.');
      }

      setStorageError('');
      setUploadError('');
      setEditingSlot(null);
    } catch {
      setUploadError('Unable to read the selected image.');
    }
  };

  const handleRestoreCurrentSlot = () => {
    if (!editingSlot) {
      return;
    }
    setImageSlots((current) => ({
      ...current,
      [editingSlot]: homeDefaultSlots[editingSlot],
    }));
    setUploadError('');
    setUploadNotice('Default image restored for this section.');
  };

  const introSlides = INTRO_HERO_SLIDES.map((slide) => ({
    type: slide.type,
    title: slide.title,
    subtitle: slide.subtitle,
    description: slide.description,
    image: imageSlots[slide.imageSlot],
    eventImage: undefined,
    accent: slide.accent,
    location: slide.location,
    date: slide.date,
    time: slide.time,
    imageSlot: slide.imageSlot,
  }));

  const eventSlides = featuredEventSlides.map((slide) => ({
    type: slide.type,
    title: slide.title,
    subtitle: slide.subtitle,
    description: slide.description,
    image: null,
    eventImage: slide.imageUrl || imageSlots[slide.imageSlot],
    accent: undefined,
    location: slide.location,
    date: slide.date,
    time: slide.time,
    imageSlot: slide.imageSlot,
  }));

  const slides = [...introSlides, ...eventSlides];

  return (
    <div className="relative overflow-hidden">
      {isImageEditMode && (
        <div className="fixed top-[88px] md:top-[122px] right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#185C20] text-white border border-white/15 shadow-xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold">
            <ImagePlus size={13} />
            Site image edit mode
          </span>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(HOME_IMAGE_EDIT_MODE_KEY, 'false');
              setIsImageEditMode(false);
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold hover:bg-white/15 transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      {isImageEditMode && storageError && (
        <div className="fixed top-[136px] md:top-[170px] right-4 z-40 max-w-sm rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 shadow-lg">
          {storageError}
        </div>
      )}

      <HeroSection
        setCurrentPage={setCurrentPage}
        slides={slides}
        isImageEditMode={isImageEditMode}
        onEditImage={openEditModal}
      />
      <FoundressLegacy
        setCurrentPage={setCurrentPage}
        isMobile={isMobile}
        foundressImg={imageSlots.foundressLegacy}
        isImageEditMode={isImageEditMode}
        onEditImage={openEditModal}
      />
      <InstitutionalPillars />
      <AcademicHighlights
        setCurrentPage={setCurrentPage}
        kindergartenImg={imageSlots.academicKindergarten}
        elementaryImg={imageSlots.academicElementary}
        juniorHighImg={imageSlots.academicJuniorHigh}
        isImageEditMode={isImageEditMode}
        onEditImage={openEditModal}
      />
      <AccreditationSection />
      <InstitutionalCTA setCurrentPage={setCurrentPage} />

      {isImageEditMode && editingSlot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeEditModal}>
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#185C20]/10 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#185C20]">Edit Home Image</h3>
                <p className="text-xs text-gray-500 mt-0.5">{imageSlotLabels[editingSlot]}</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
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
                  <img src={imageSlots[editingSlot]} alt={imageSlotLabels[editingSlot]} className="w-full h-52 object-cover" />
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-white">
                    Default Preview
                  </p>
                  <img src={homeDefaultSlots[editingSlot]} alt={`${imageSlotLabels[editingSlot]} default`} className="w-full h-52 object-cover" />
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

              {storageError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {storageError}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#185C20] text-white text-sm font-semibold hover:bg-[#144a1a] transition-colors cursor-pointer">
                  <Upload size={14} />
                  Upload new image
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
                </label>
                <button
                  type="button"
                  onClick={handleRestoreCurrentSlot}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#EDCD1F]/25 text-[#185C20] text-sm font-semibold hover:bg-[#EDCD1F]/35 transition-colors"
                >
                  <RotateCcw size={14} />
                  Restore default
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
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

export default Home;