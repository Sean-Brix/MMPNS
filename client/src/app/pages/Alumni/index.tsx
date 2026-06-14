import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ImagePlus, RotateCcw, Upload, X } from 'lucide-react';

import { AlumniHero } from './AlumniHero';
import { AlumniHub } from './AlumniHub';
import { VirtualCorridor } from './VirtualCorridor';
import { AlumniStats } from './AlumniStats';
import { AlumniGiving } from './AlumniGiving';
import { useAppNavigate } from '../../hooks/useAppNavigate';
import { uploadPrincipalEditedImageToCloud } from '../../../utils/cloudImageStorage';
import { HOME_IMAGE_EDIT_MODE_KEY } from '../../../utils/homeImageSlots';
import {
  ALUMNI_IMAGE_DEFAULTS,
  readAlumniImageSlots,
  writeAlumniImageSlots,
} from '../../../utils/alumniImageSlots';

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

export const Alumni: React.FC = () => {
  const setCurrentPage = useAppNavigate();
  const { scrollYProgress } = useScroll();
  const [isImageEditMode, setIsImageEditMode] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');
  const [uploadNotice, setUploadNotice] = React.useState('');
  const [hasLoadedSlots, setHasLoadedSlots] = React.useState(false);
  const [registrationQr, setRegistrationQr] = React.useState(ALUMNI_IMAGE_DEFAULTS.registrationQr);

  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  React.useEffect(() => {
    setRegistrationQr(readAlumniImageSlots().registrationQr);
    setHasLoadedSlots(true);

    const toggleEnabled = localStorage.getItem(HOME_IMAGE_EDIT_MODE_KEY) === 'true';
    setIsImageEditMode(toggleEnabled);
  }, []);

  React.useEffect(() => {
    if (!hasLoadedSlots) {
      return;
    }

    writeAlumniImageSlots({ registrationQr });
  }, [hasLoadedSlots, registrationQr]);

  const closeModal = () => {
    setShowEditModal(false);
    setUploadError('');
    setUploadNotice('');
  };

  const handleQrUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
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
        pageFolder: 'alumni',
        slot: 'registration-qr',
      });

      if (cloudUrl) {
        setRegistrationQr(cloudUrl);
        setUploadNotice('QR image uploaded to cloud storage folder: principal-edits/alumni.');
        setShowEditModal(false);
        return;
      }
    } catch (error) {
      console.warn('Cloud upload failed, storing alumni QR locally.', error);
    }

    try {
      const localDataUrl = await readFileAsDataUrl(file);
      setRegistrationQr(localDataUrl);
      setUploadNotice('Cloud upload is not configured. QR image is saved locally in this browser.');
      setShowEditModal(false);
    } catch {
      setUploadError('Unable to read the selected image.');
    }
  };

  return (
    <div className="relative bg-[#FAF9F6] selection:bg-[#EDCD1F] selection:text-[#185C20]">
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
              setShowEditModal(false);
            }}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold hover:bg-white/15 transition-colors"
          >
            Exit
          </button>
        </div>
      )}

      <AlumniHero heroOpacity={heroOpacity} heroY={heroY} />
      <AlumniHub
        registrationQr={registrationQr}
        isImageEditMode={isImageEditMode}
        onEditQr={() => {
          setShowEditModal(true);
          setUploadError('');
          setUploadNotice('');
        }}
      />
      <VirtualCorridor setCurrentPage={setCurrentPage} />
      <AlumniStats />
      <AlumniGiving />

      {isImageEditMode && showEditModal && (
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
                <h3 className="text-lg font-bold text-[#185C20]">Edit Alumni Registration QR</h3>
                <p className="text-xs text-gray-500 mt-0.5">Upload a QR image for alumni registration.</p>
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
                  <img src={registrationQr} alt="Current alumni registration QR" className="w-full h-52 object-contain bg-white" />
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-white">
                    Default Preview
                  </p>
                  <img src={ALUMNI_IMAGE_DEFAULTS.registrationQr} alt="Default alumni registration QR" className="w-full h-52 object-contain bg-white" />
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
                  Upload new QR image
                  <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRegistrationQr(ALUMNI_IMAGE_DEFAULTS.registrationQr);
                    setUploadError('');
                    setUploadNotice('Default QR image restored.');
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
      
      {/* Final Footer Quote */}
      <section className="py-16 md:py-20 bg-[#185C20] text-center px-6">
        <p className="text-[#EDCD1F]/40 font-serif italic text-base md:text-lg">
          "Once an MMPNian, Always an MMPNian."
        </p>
      </section>
    </div>
  );
};

export default Alumni;