import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { getFirestoreClient } from './firebaseClient';

export type CloudDatabaseTable =
  | 'faculty'
  | 'alumni'
  | 'pages'
  | 'settings'
  | 'credentials'
  | 'school_years'
  | 'teacher_portal';

const CLOUD_TABLE_COLLECTION = 'app_data';
const CLOUD_SCHEMA_VERSION = 1;

interface CloudTableEnvelope<T = unknown> {
  payload: T;
  schemaVersion: number;
  updatedAt?: unknown;
}

const getTableRef = (table: CloudDatabaseTable) => {
  const db = getFirestoreClient();
  if (!db) {
    return null;
  }

  return doc(db, CLOUD_TABLE_COLLECTION, table);
};

export const isCloudDatabaseConfigured = () => {
  return Boolean(getFirestoreClient());
};

export const getCloudTable = async <T = any>(table: CloudDatabaseTable): Promise<T | null> => {
  const tableRef = getTableRef(table);
  if (!tableRef) {
    return null;
  }

  const snap = await getDoc(tableRef);
  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as Partial<CloudTableEnvelope<T>> | T;

  if (data && typeof data === 'object' && 'payload' in data) {
    return (data as CloudTableEnvelope<T>).payload;
  }

  return data as T;
};

export const setCloudTable = async <T = any>(table: CloudDatabaseTable, payload: T) => {
  const tableRef = getTableRef(table);
  if (!tableRef) {
    return false;
  }

  const envelope: CloudTableEnvelope<T> = {
    payload,
    schemaVersion: CLOUD_SCHEMA_VERSION,
    updatedAt: serverTimestamp(),
  };

  await setDoc(tableRef, envelope, { merge: true });
  return true;
};

export const subscribeCloudTable = <T = any>(
  table: CloudDatabaseTable,
  onData: (data: T | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe => {
  const tableRef = getTableRef(table);

  if (!tableRef) {
    onData(null);
    return () => {
      // No-op when cloud database is not configured.
    };
  }

  return onSnapshot(
    tableRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }

      const raw = snap.data() as Partial<CloudTableEnvelope<T>> | T;
      if (raw && typeof raw === 'object' && 'payload' in raw) {
        onData((raw as CloudTableEnvelope<T>).payload);
        return;
      }

      onData(raw as T);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
};
