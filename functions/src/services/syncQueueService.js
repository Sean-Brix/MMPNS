const {admin, firestore} = require("../firebaseAdmin");

const FieldValue = admin.firestore.FieldValue;
const SYNC_COLLECTION = "sync_state";
const LOCAL_SERVER_DOC = "local_server";

const syncRef = () => firestore.collection(SYNC_COLLECTION).doc(LOCAL_SERVER_DOC);

const addToSyncQueue = async (uid, type) => {
  try {
    if (type === "delete") {
      await syncRef().set({
        pendingDeletes: FieldValue.arrayUnion(uid),
        pendingUpserts: FieldValue.arrayRemove(uid),
      }, {merge: true});
    } else {
      await syncRef().set({
        pendingUpserts: FieldValue.arrayUnion(uid),
        pendingDeletes: FieldValue.arrayRemove(uid),
        lastUpdated: FieldValue.serverTimestamp(),
      }, {merge: true});
    }
  } catch (err) {
    console.error("[syncQueue] Failed to update queue for", uid, err.message);
  }
};

const getSyncQueue = async () => {
  const snap = await syncRef().get();
  if (!snap.exists) {
    return {pendingUpserts: [], pendingDeletes: [], lastClearedAt: null};
  }
  const data = snap.data();
  return {
    pendingUpserts: data.pendingUpserts || [],
    pendingDeletes: data.pendingDeletes || [],
    lastClearedAt: data.lastClearedAt || null,
  };
};

const clearSyncQueue = async () => {
  await syncRef().set({
    pendingUpserts: [],
    pendingDeletes: [],
    lastClearedAt: FieldValue.serverTimestamp(),
  }, {merge: true});
};

module.exports = {addToSyncQueue, getSyncQueue, clearSyncQueue};
