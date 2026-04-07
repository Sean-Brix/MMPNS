import React from 'react';
import { ImagePlus, RotateCcw, Upload, X } from 'lucide-react';

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

import { AcademicsHero } from './AcademicsHero';
import { EducationalVision } from './EducationalVision';
import { DepartmentNavigation } from './DepartmentNavigation';
import { ScholasticPillars } from './ScholasticPillars';
import { AcademicsCTA } from './AcademicsCTA';

type AcademicsImageSlot =
  | 'academicInstitutionalQuality'
  | 'sharedKindergarten'
  | 'sharedElementary'
  | 'sharedJuniorHigh';

const ACADEMICS_IMAGE_LABELS: Record<AcademicsImageSlot, string> = {
  academicInstitutionalQuality: 'Academics hero background image',
  sharedKindergarten: 'Department card: Kindergarten',
  sharedElementary: 'Department card: Elementary',
  sharedJuniorHigh: 'Department card: Junior High',
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

// Decorative SVG for Section Dividers
const DecorativeDivider = () => (
  <div className="flex items-center justify-center gap-4 my-12">
    <div className="h-px w-24 bg-gradient-to-r from-transparent to-[#EDCD1F]"></div>
    <div className="w-2 h-2 rotate-45 border border-[#EDCD1F]"></div>
    <div className="h-px w-24 bg-gradient-to-l from-transparent to-[#EDCD1F]"></div>
  </div>
);

export const Academics: React.FC = () => {
  const [isImageEditMode, setIsImageEditMode] = React.useState(false);
  const [siteImageSlots, setSiteImageSlots] = React.useState<SiteImageSlotMap>({
    ...SITE_IMAGE_DEFAULTS,
  });
  const [editingSlot, setEditingSlot] = React.useState<AcademicsImageSlot | null>(null);
  const [uploadError, setUploadError] = React.useState('');
  const [uploadNotice, setUploadNotice] = React.useState('');
  const [hasLoadedSlots, setHasLoadedSlots] = React.useState(false);

  React.useEffect(() => {
    setSiteImageSlots(readSiteImageSlots());
    setHasLoadedSlots(true);
    setIsImageEditMode(isPrincipalImageEditModeEnabled());
  }, []);

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
        pageFolder: 'academics',
        slot,
      });

      if (cloudUrl) {
        setSiteImageSlots((current) => ({
          ...current,
          [slot]: cloudUrl,
        }));
        setUploadNotice('Image uploaded to cloud storage folder: principal-edits/academics.');
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

  const levels = [
    {
      id: 'Kindergarten',
      title: 'Kindergarten',
      subtitle: 'NURTURING THE SEEDS OF FAITH',
      description: 'Our early childhood program is a sanctuary of discovery where play meets prayer. We focus on the total development of the child, ensuring that their first steps in education are rooted in joy, curiosity, and Catholic values.',
      img: siteImageSlots.sharedKindergarten,
      stats: [
        { label: 'Ratio', value: '1:15' },
        { label: 'Focus', value: 'Holistic' }
      ],
      highlights: [
        'Eucharistic-centered value formation',
        'Montessori-inspired play blocks',
        'Early literacy & sensory math',
        'Social-emotional grace and courtesy',
        'Music, movement, and mother tongue'
      ]
    },
    {
      id: 'Elementary',
      title: 'Elementary',
      subtitle: 'BUILDING THE INTELLECTUAL PILLARS',
      description: 'The primary years at MMPNS are dedicated to academic rigor and moral discipline. We provide a solid foundation in the core disciplines while integrating the Sisters Adorers charism into the daily classroom experience.',
      img: siteImageSlots.sharedElementary,
      stats: [
        { label: 'Subjects', value: '8 Core' },
        { label: 'Track', value: 'Mastery' }
      ],
      highlights: [
        'MATATAG Curriculum',
        'Advanced Reading & Numeracy tracks',
        'Daily Catechesis & Bible history',
        'Interactive Science & IT labs',
        'Art appreciation and physical wellness'
      ]
    },
    {
      id: 'Junior High',
      title: 'Junior High',
      subtitle: 'SHAPING SERVANT LEADERS',
      description: 'As students transition into adolescence, our Junior High program emphasizes critical thinking, leadership, and personal responsibility. We prepare our graduates not just for higher education, but for a life of service.',
      img: siteImageSlots.sharedJuniorHigh,
      stats: [
        { label: 'Accredited', value: 'ESC/PEAC' },
        { label: 'Focus', value: 'Research' }
      ],
      highlights: [
        'Rigorous STEM & Humanities tracks',
        'Student-led research & innovation',
        'Leadership formation & retreat programs',
        'T.L.E. with specialization focus',
        'Extensive community outreach programs'
      ]
    }
  ];

  return (
    <div className="bg-white min-h-screen">
      {isImageEditMode && (
        <div className="fixed top-[88px] md:top-[122px] right-4 z-40 w-[min(90vw,320px)] rounded-xl bg-[#185C20] text-white border border-white/15 shadow-xl p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold">
              <ImagePlus size={13} />
              Academics image editor
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

          {(Object.keys(ACADEMICS_IMAGE_LABELS) as AcademicsImageSlot[]).map((slot) => (
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
              <p className="text-[11px] font-semibold text-white/85">{ACADEMICS_IMAGE_LABELS[slot]}</p>
              <p className="text-[10px] text-white/60 mt-0.5">Click to upload or restore</p>
            </button>
          ))}
        </div>
      )}

      <AcademicsHero />
      <EducationalVision campfireImg={siteImageSlots.academicInstitutionalQuality} />
      <DecorativeDivider />
      <DepartmentNavigation levels={levels} />
      <ScholasticPillars />
      <AcademicsCTA />

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
                <h3 className="text-lg font-bold text-[#185C20]">Edit Academics Page Image</h3>
                <p className="text-xs text-gray-500 mt-0.5">{ACADEMICS_IMAGE_LABELS[editingSlot]}</p>
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
                  <img src={siteImageSlots[editingSlot]} alt={ACADEMICS_IMAGE_LABELS[editingSlot]} className="w-full h-52 object-contain bg-white" />
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-white">
                    Default Preview
                  </p>
                  <img src={SITE_IMAGE_DEFAULTS[editingSlot]} alt={`Default ${ACADEMICS_IMAGE_LABELS[editingSlot]}`} className="w-full h-52 object-contain bg-white" />
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

export default Academics;
