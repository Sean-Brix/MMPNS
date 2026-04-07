/// <reference types="vite/client" />

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const DEFAULT_FIREBASE_PROJECT_ID = 'mmpns-9bdde';

type FirebaseConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  appId?: string;
  messagingSenderId?: string;
};

let appInstance: FirebaseApp | null | undefined;
let authInstance: Auth | null | undefined;
let firestoreInstance: Firestore | null | undefined;
let storageInstance: FirebaseStorage | null | undefined;

export const getFirebaseConfig = (): FirebaseConfig => {
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

export const isFirebaseCoreConfigured = () => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
};

export const getFirebaseApp = () => {
  if (appInstance !== undefined) {
    return appInstance;
  }

  if (!isFirebaseCoreConfigured()) {
    appInstance = null;
    return appInstance;
  }

  const config = getFirebaseConfig();
  appInstance = getApps().length > 0 ? getApp() : initializeApp(config);
  return appInstance;
};

export const getFirebaseAuthClient = () => {
  if (authInstance !== undefined) {
    return authInstance;
  }

  const app = getFirebaseApp();
  if (!app) {
    authInstance = null;
    return authInstance;
  }

  authInstance = getAuth(app);
  return authInstance;
};

export const getFirestoreClient = () => {
  if (firestoreInstance !== undefined) {
    return firestoreInstance;
  }

  const app = getFirebaseApp();
  if (!app) {
    firestoreInstance = null;
    return firestoreInstance;
  }

  firestoreInstance = getFirestore(app);
  return firestoreInstance;
};

export const getFirebaseStorageClient = () => {
  if (storageInstance !== undefined) {
    return storageInstance;
  }

  const app = getFirebaseApp();
  if (!app) {
    storageInstance = null;
    return storageInstance;
  }

  storageInstance = getStorage(app);
  return storageInstance;
};
