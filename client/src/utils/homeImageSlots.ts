import { PAGE_DEFAULT_IMAGES } from './siteDefaultImages';

export type HomeImageSlotKey =
  | 'heroMain'
  | 'heroGarden'
  | 'heroChristmas'
  | 'heroMass'
  | 'foundressLegacy'
  | 'academicKindergarten'
  | 'academicElementary'
  | 'academicJuniorHigh';

export const HOME_IMAGE_STORAGE_KEY = 'mmpns_home_image_slots';
export const HOME_IMAGE_EDIT_MODE_KEY = 'mmpns_home_image_edit_mode';
export const HOME_IMAGE_STORAGE_MAX_BYTES = 4_500_000;

export const HOME_IMAGE_DEFAULTS: Record<HomeImageSlotKey, string> = {
  heroMain: PAGE_DEFAULT_IMAGES.home.heroMain,
  heroGarden: PAGE_DEFAULT_IMAGES.home.heroGarden,
  heroChristmas: PAGE_DEFAULT_IMAGES.home.heroChristmas,
  heroMass: PAGE_DEFAULT_IMAGES.home.heroMass,
  foundressLegacy: PAGE_DEFAULT_IMAGES.home.foundressLegacy,
  academicKindergarten: PAGE_DEFAULT_IMAGES.home.academicKindergarten,
  academicElementary: PAGE_DEFAULT_IMAGES.home.academicElementary,
  academicJuniorHigh: PAGE_DEFAULT_IMAGES.home.academicJuniorHigh,
};

const getByteLength = (value: string) => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return value.length * 2;
};

export const estimateHomeImageSlotsSize = (slots: Record<HomeImageSlotKey, string>) => {
  return getByteLength(JSON.stringify(slots));
};

export const canPersistHomeImageSlots = (slots: Record<HomeImageSlotKey, string>) => {
  return estimateHomeImageSlotsSize(slots) <= HOME_IMAGE_STORAGE_MAX_BYTES;
};

export const readHomeImageSlots = (): Record<HomeImageSlotKey, string> => {
  try {
    const raw = localStorage.getItem(HOME_IMAGE_STORAGE_KEY);
    if (!raw) {
      return { ...HOME_IMAGE_DEFAULTS };
    }
    const parsed = JSON.parse(raw) as Partial<Record<HomeImageSlotKey, string>>;
    return { ...HOME_IMAGE_DEFAULTS, ...parsed };
  } catch {
    return { ...HOME_IMAGE_DEFAULTS };
  }
};

export const writeHomeImageSlots = (slots: Record<HomeImageSlotKey, string>) => {
  const serialized = JSON.stringify(slots);

  if (getByteLength(serialized) > HOME_IMAGE_STORAGE_MAX_BYTES) {
    return false;
  }

  try {
    localStorage.setItem(HOME_IMAGE_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
};

export const clearHomeImageSlots = () => {
  localStorage.removeItem(HOME_IMAGE_STORAGE_KEY);
};

export const restoreHomeImageSlot = (
  slots: Record<HomeImageSlotKey, string>,
  slot: HomeImageSlotKey,
) => {
  return {
    ...slots,
    [slot]: HOME_IMAGE_DEFAULTS[slot],
  };
};

export const restoreAllHomeImageSlots = () => {
  return { ...HOME_IMAGE_DEFAULTS };
};
