import { sanitizeStoredImageSrc } from './imageSource';

export const ALUMNI_IMAGE_STORAGE_KEY = 'mmpns_alumni_image_slots';

export type AlumniImageSlotKey = 'registrationQr';

export const ALUMNI_IMAGE_DEFAULTS: Record<AlumniImageSlotKey, string> = {
  registrationQr: '/images/no_image.png',
};

export const readAlumniImageSlots = (): Record<AlumniImageSlotKey, string> => {
  try {
    const raw = localStorage.getItem(ALUMNI_IMAGE_STORAGE_KEY);
    if (!raw) {
      return { ...ALUMNI_IMAGE_DEFAULTS };
    }

    const parsed = JSON.parse(raw) as Partial<Record<AlumniImageSlotKey, string>>;
    const mergedSlots = {
      ...ALUMNI_IMAGE_DEFAULTS,
      ...parsed,
    };

    mergedSlots.registrationQr = sanitizeStoredImageSrc(
      mergedSlots.registrationQr,
      ALUMNI_IMAGE_DEFAULTS.registrationQr,
    );

    return mergedSlots;
  } catch {
    return { ...ALUMNI_IMAGE_DEFAULTS };
  }
};

export const writeAlumniImageSlots = (slots: Record<AlumniImageSlotKey, string>) => {
  try {
    localStorage.setItem(ALUMNI_IMAGE_STORAGE_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
};
