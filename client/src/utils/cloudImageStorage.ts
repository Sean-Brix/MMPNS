import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';

import {
  HOME_SLOT_SITE_IMAGE_KEY,
  SITE_DEFAULT_IMAGE_LIST,
  SITE_DEFAULT_IMAGES,
  type HomeSlotSiteImageMap,
  type SiteDefaultImageDefinition,
  type SiteDefaultImageKey,
} from './siteDefaultImages';

const CLOUD_DEFAULT_IMAGE_CACHE_KEY = 'mmpns_cloud_default_image_urls_v1';
const DEFAULT_FIREBASE_PROJECT_ID = 'mmpns-9bdde';

export type SiteDefaultCloudUrlMap = Partial<Record<SiteDefaultImageKey, string>>;
export type HomeDefaultImageMap = Record<keyof HomeSlotSiteImageMap, string>;

let storageClient: FirebaseStorage | null | undefined;
let syncInFlight: Promise<SiteDefaultCloudUrlMap> | null = null;

const hasWindow = () => typeof window !== 'undefined';

const getFirebaseConfig = () => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
};

export const isCloudImageStorageConfigured = () => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
};

const getStorageClient = () => {
  if (storageClient !== undefined) {
    return storageClient;
  }

  if (!isCloudImageStorageConfigured()) {
    storageClient = null;
    return storageClient;
  }

  const config = getFirebaseConfig();
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  storageClient = getStorage(app);
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

const inferContentType = (definition: SiteDefaultImageDefinition) => {
  const lowerPath = definition.storagePath.toLowerCase();

  if (lowerPath.endsWith('.png')) {
    return 'image/png';
  }
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lowerPath.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'application/octet-stream';
};

const sanitizeFileName = (value: string) => {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const ensureCloudObject = async (
  storage: FirebaseStorage,
  definition: SiteDefaultImageDefinition,
) => {
  const objectRef = ref(storage, definition.storagePath);

  try {
    return await getDownloadURL(objectRef);
  } catch {
    const response = await fetch(definition.localSrc);
    if (!response.ok) {
      throw new Error(`Unable to fetch default asset: ${definition.key}`);
    }

    const blob = await response.blob();
    await uploadBytes(objectRef, blob, {
      contentType: inferContentType(definition),
      customMetadata: {
        source: 'mmpns-client-default',
        imageKey: definition.key,
      },
    });

    return getDownloadURL(objectRef);
  }
};

export const getCachedSiteDefaultImageUrls = () => {
  return readCachedMap();
};

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

      try {
        mergedMap[definition.key] = await ensureCloudObject(storage, definition);
      } catch (error) {
        console.warn(`Cloud sync failed for ${definition.key}`, error);
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
