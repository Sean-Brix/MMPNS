import {
  SITE_DEFAULT_IMAGES,
  type SiteDefaultImageKey,
} from './siteDefaultImages';

export const SITE_IMAGE_STORAGE_KEY = 'mmpns_site_image_slots_v1';

export type SiteImageSlotMap = Record<SiteDefaultImageKey, string>;

export const SITE_IMAGE_DEFAULTS: SiteImageSlotMap = Object.keys(SITE_DEFAULT_IMAGES).reduce(
  (acc, key) => {
    const imageKey = key as SiteDefaultImageKey;
    acc[imageKey] = SITE_DEFAULT_IMAGES[imageKey].localSrc;
    return acc;
  },
  {} as SiteImageSlotMap,
);

export const readSiteImageSlots = (): SiteImageSlotMap => {
  try {
    const raw = localStorage.getItem(SITE_IMAGE_STORAGE_KEY);
    if (!raw) {
      return { ...SITE_IMAGE_DEFAULTS };
    }

    const parsed = JSON.parse(raw) as Partial<SiteImageSlotMap>;
    return {
      ...SITE_IMAGE_DEFAULTS,
      ...parsed,
    };
  } catch {
    return { ...SITE_IMAGE_DEFAULTS };
  }
};

export const writeSiteImageSlots = (slots: SiteImageSlotMap) => {
  try {
    localStorage.setItem(SITE_IMAGE_STORAGE_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
};

export const restoreSiteImageSlot = (
  slots: SiteImageSlotMap,
  slot: SiteDefaultImageKey,
): SiteImageSlotMap => ({
  ...slots,
  [slot]: SITE_IMAGE_DEFAULTS[slot],
});
