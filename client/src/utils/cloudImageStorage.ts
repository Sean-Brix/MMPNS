import { getStorageObjectUrl, uploadPrincipalImage } from './apiClient';

import {
  HOME_SLOT_SITE_IMAGE_KEY,
  SITE_DEFAULT_IMAGE_LIST,
  SITE_DEFAULT_IMAGES,
  type HomeSlotSiteImageMap,
  type SiteDefaultImageKey,
} from './siteDefaultImages';

const CLOUD_DEFAULT_IMAGE_CACHE_KEY = 'mmpns_cloud_default_image_urls_v1';

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

    return JSON.parse(raw) as SiteDefaultCloudUrlMap;
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

export const getCachedSiteDefaultImageUrls = () => {
  return readCachedMap();
};

// Browser clients ask the Functions API for Cloud Storage URLs; bundled assets remain the fallback.
export const syncSiteDefaultImagesToCloud = async () => {
  if (!hasWindow()) {
    return {};
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const cachedMap = readCachedMap();
    const mergedMap: SiteDefaultCloudUrlMap = { ...cachedMap };

    for (const definition of SITE_DEFAULT_IMAGE_LIST) {
      if (mergedMap[definition.key]) {
        continue;
      }

      const cloudUrl = await getStorageObjectUrl(definition.storagePath);

      if (cloudUrl) {
        mergedMap[definition.key] = cloudUrl;
      }
    }

    persistCachedMap(mergedMap);
    return mergedMap;
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
