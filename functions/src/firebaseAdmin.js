const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const getDefaultBucketName = () => {
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    return process.env.FIREBASE_STORAGE_BUCKET;
  }

  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
    return firebaseConfig.storageBucket;
  } catch (error) {
    return undefined;
  }
};

const firestore = admin.firestore();

const getStorageBucket = () => {
  const bucketName = getDefaultBucketName();
  return bucketName ?
    admin.storage().bucket(bucketName) :
    admin.storage().bucket();
};

module.exports = {
  admin,
  firestore,
  getStorageBucket,
};
