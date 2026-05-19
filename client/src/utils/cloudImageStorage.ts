import { getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import { getFirebaseStorageClient, isFirebaseCoreConfigured } from './firebaseClient';

import {
  HOME_SLOT_SITE_IMAGE_KEY,
  SITE_DEFAULT_IMAGE_LIST,
  SITE_DEFAULT_IMAGES,
  type HomeSlotSiteImageMap,
  type SiteDefaultImageDefinition,
  type SiteDefaultImageKey,
} from './siteDefaultImages';

const CLOUD_DEFAULT_IMAGE_CACHE_KEY = 'mmpns_cloud_default_image_urls_v1';

export type SiteDefaultCloudUrlMap = Partial<Record<SiteDefaultImageKey, string>>;
export type HomeDefaultImageMap = Record<keyof HomeSlotSiteImageMap, string>;

let storageClient: FirebaseStorage | null | undefined;
let syncInFlight: Promise<SiteDefaultCloudUrlMap> | null = null;

const hasWindow = () => typeof window !== 'undefined';

export const isCloudImageStorageConfigured = () => {
  return isFirebaseCoreConfigured();
};

const getStorageClient = () => {
  if (storageClient !== undefined) {
    return storageClient;
  }

  if (!isCloudImageStorageConfigured()) {
    storageClient = null;
    return storageClient;
  }

  storageClient = getFirebaseStorageClient();

  if (!storageClient) {
    return storageClient;
  }

  // Keep an explicit runtime assertion that Storage client can resolve.
  storageClient = getStorage(storageClient.app);
  return storageClient;
};

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

const sanitizeFileName = (value: string) => {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const getExistingCloudObjectUrl = async (
  storage: FirebaseStorage,
  definition: SiteDefaultImageDefinition,
) => {
  const objectRef = ref(storage, definition.storagePath);

  try {
    return await getDownloadURL(objectRef);
  } catch {
    return null;
  }
};

export const getCachedSiteDefaultImageUrls = () => {
  return readCachedMap();
};

// Browser clients only read pre-uploaded defaults; bundled assets remain the fallback.
export const syncSiteDefaultImagesToCloud = async () => {
  if (!hasWindow()) {
    return {};
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const cachedMap = readCachedMap();
    const storage = getStorageClient();

    if (!storage) {
      return cachedMap;
    }

    const mergedMap: SiteDefaultCloudUrlMap = { ...cachedMap };

    for (const definition of SITE_DEFAULT_IMAGE_LIST) {
      if (mergedMap[definition.key]) {
        continue;
      }

      const cloudUrl = await getExistingCloudObjectUrl(storage, definition);

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
  const storage = getStorageClient();
  if (!storage) {
    return null;
  }

  const extension = options.file.name.split('.').pop() || 'bin';
  const baseName = options.file.name.replace(/\.[^.]*$/, '');
  const safeBaseName = sanitizeFileName(baseName).slice(0, 48) || 'image';
  const safeSlot = sanitizeFileName(options.slot);
  const objectPath = `principal-edits/${sanitizeFileName(options.pageFolder)}/${safeSlot}/${Date.now()}-${safeBaseName}.${extension.toLowerCase()}`;
  const objectRef = ref(storage, objectPath);

  await uploadBytes(objectRef, options.file, {
    contentType: options.file.type || 'application/octet-stream',
    customMetadata: {
      source: 'mmpns-principal-upload',
      slot: options.slot,
    },
  });

  return getDownloadURL(objectRef);
};
