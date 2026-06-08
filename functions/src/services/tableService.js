const {FieldValue} = require("firebase-admin/firestore");
const {firestore} = require("../firebaseAdmin");
const {badRequest, notFound} = require("../httpError");

const APP_DATA_COLLECTION = "app_data";
const SEED_SNAPSHOT_COLLECTION = "app_seed_snapshots";
const CLOUD_SCHEMA_VERSION = 1;

const allowedTables = new Set([
  "faculty",
  "alumni",
  "pages",
  "settings",
  "credentials",
  "school_years",
  "teacher_portal",
  "calendar",
  "teacher_records",
  "master_subjects",
  "student_registrations",
  "students",
  "teachers",
  "evaluation_rubrics",
  "teacher_evaluations",
]);

const assertTable = (table) => {
  if (!allowedTables.has(table)) {
    throw badRequest(`Unsupported table "${table}".`);
  }
};

const unwrapPayload = (data) => {
  const hasPayload = data &&
    typeof data === "object" &&
    Object.prototype.hasOwnProperty.call(data, "payload");

  if (hasPayload) {
    return data.payload;
  }

  return data;
};

const getTableRef = (table) => {
  assertTable(table);
  return firestore.collection(APP_DATA_COLLECTION).doc(table);
};

const listTables = () => Array.from(allowedTables).sort();

const getTable = async (table) => {
  const snapshot = await getTableRef(table).get();

  if (!snapshot.exists) {
    throw notFound(`Table "${table}" does not exist in Firestore.`);
  }

  return unwrapPayload(snapshot.data());
};

const setTable = async (table, payload) => {
  const envelope = {
    payload,
    schemaVersion: CLOUD_SCHEMA_VERSION,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await getTableRef(table).set(envelope, {merge: true});
  return payload;
};

const deleteTable = async (table) => {
  await getTableRef(table).delete();
};

const getSeedSnapshot = async (key) => {
  let snapshot = await firestore
      .collection(SEED_SNAPSHOT_COLLECTION)
      .doc(key)
      .get();

  if (!snapshot.exists) {
    snapshot = await firestore
        .collection(APP_DATA_COLLECTION)
        .doc(`seed_${key}`)
        .get();
  }

  if (!snapshot.exists) {
    throw notFound(`Seed snapshot "${key}" does not exist in Firestore.`);
  }

  return unwrapPayload(snapshot.data());
};

module.exports = {
  deleteTable,
  getSeedSnapshot,
  getTable,
  listTables,
  setTable,
};
