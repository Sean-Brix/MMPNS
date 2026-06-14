import { uploadPrincipalImage } from './apiClient';

import {
  HOME_SLOT_SITE_IMAGE_KEY,
  SITE_DEFAULT_IMAGE_LIST,
  SITE_DEFAULT_IMAGES,
  type HomeSlotSiteImageMap,
  type SiteDefaultImageKey,
} from './siteDefaultImages';
import { sanitizeStoredImageSrc } from './imageSource';

// Bumped to v2 to clear any stale Firebase Storage URLs cached by previous sessions.
const CLOUD_DEFAULT_IMAGE_CACHE_KEY = 'mmpns_cloud_default_image_urls_v2';

export type SiteDefaultCloudUrlMap = Partial<Record<SiteDefaultImageKey, string>>;
export type HomeDefaultImageMap = Record<keyof HomeSlotSiteImageMap, string>;

let syncInFlight: Promise<SiteDefaultCloudUrlMap> | null = null;

const hasWindow = () => typeof window !== 'undefined';

export const isCloudImageStorageConfigured = () => true;

const readCachedMap = (): SiteDefaultCloudUrlMap => {
  if (!hasWindow()) {
    return {};
  }

  try {
    const raw = localStorage.getItem(CLOUD_DEFAULT_IMAGE_CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as SiteDefaultCloudUrlMap;
    const sanitized: SiteDefaultCloudUrlMap = {};

    for (const definition of SITE_DEFAULT_IMAGE_LIST) {
      sanitized[definition.key] = sanitizeStoredImageSrc(parsed[definition.key], definition.localSrc);
    }

    return sanitized;
  } catch {
    return {};
  }
};

const persistCachedMap = (value: SiteDefaultCloudUrlMap) => {
  if (!hasWindow()) {
    return;
  }

  try {
    localStorage.setItem(CLOUD_DEFAULT_IMAGE_CACHE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep local defaults.
  }
};

const buildLocalMap = (): SiteDefaultCloudUrlMap => {
  const map: SiteDefaultCloudUrlMap = {};
  for (const definition of SITE_DEFAULT_IMAGE_LIST) {
    map[definition.key] = definition.localSrc;
  }
  return map;
};

export const getCachedSiteDefaultImageUrls = (): SiteDefaultCloudUrlMap => {
  const cached = readCachedMap();
  if (Object.keys(cached).length === 0) {
    return buildLocalMap();
  }
  return cached;
};

// Static site-default images are served from the public folder — no Firebase calls needed.
export const syncSiteDefaultImagesToCloud = async (): Promise<SiteDefaultCloudUrlMap> => {
  if (!hasWindow()) {
    return {};
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const map = buildLocalMap();
    persistCachedMap(map);
    return map;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
};

export const resolveHomeDefaultImages = (
  map: SiteDefaultCloudUrlMap = readCachedMap(),
): HomeDefaultImageMap => {
  const keys = Object.keys(HOME_SLOT_SITE_IMAGE_KEY) as Array<keyof HomeSlotSiteImageMap>;

  return keys.reduce((accumulator, slot) => {
    const imageKey = HOME_SLOT_SITE_IMAGE_KEY[slot];
    const cloudUrl = map[imageKey];
    accumulator[slot] = cloudUrl || SITE_DEFAULT_IMAGES[imageKey].localSrc;
    return accumulator;
  }, {} as HomeDefaultImageMap);
};

export const uploadPrincipalEditedImageToCloud = async (options: {
  file: File;
  pageFolder: string;
  slot: string;
}) => {
  return uploadPrincipalImage(options);
};
