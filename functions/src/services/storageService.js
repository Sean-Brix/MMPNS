const crypto = require("crypto");
const path = require("path");
const {getStorageBucket} = require("../firebaseAdmin");
const {badRequest, notFound} = require("../httpError");

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const sanitizePathPart = (value) => {
  return String(value || "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80) || "asset";
};

const sanitizeObjectPath = (value) => {
  const objectPath = String(value || "").replace(/^\/+/, "");

  if (!objectPath || objectPath.includes("..")) {
    throw badRequest("A valid storage path is required.");
  }

  return objectPath;
};

const createDownloadUrl = (bucketName, objectPath, token) => {
  const encodedPath = encodeURIComponent(objectPath);
  return "https://firebasestorage.googleapis.com/v0/b/" +
    `${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
};

const getObjectDownloadUrl = async (objectPath) => {
  const safePath = sanitizeObjectPath(objectPath);
  const bucket = getStorageBucket();
  const file = bucket.file(safePath);
  const [exists] = await file.exists();

  if (!exists) {
    throw notFound(`Storage object "${safePath}" does not exist.`);
  }

  const [metadata] = await file.getMetadata();
  const token = metadata &&
    metadata.metadata &&
    metadata.metadata.firebaseStorageDownloadTokens;

  if (token) {
    return {
      path: safePath,
      url: createDownloadUrl(
          bucket.name,
          safePath,
          String(token).split(",")[0],
      ),
    };
  }

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 60,
  });

  return {
    path: safePath,
    url: signedUrl,
  };
};

const uploadPrincipalImage = async ({
  buffer,
  contentType,
  filename,
  pageFolder,
  slot,
}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw badRequest("Image file is required.");
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw badRequest("Image file must be 10MB or smaller.");
  }

  if (!contentType || !contentType.startsWith("image/")) {
    throw badRequest("Only image uploads are supported.");
  }

  const bucket = getStorageBucket();
  const extension = path.extname(filename || "")
      .replace(".", "")
      .toLowerCase() || "bin";
  const baseName = sanitizePathPart(path.basename(
      filename || "image",
      path.extname(filename || ""),
  ));
  const safePageFolder = sanitizePathPart(pageFolder);
  const safeSlot = sanitizePathPart(slot);
  const token = crypto.randomUUID();
  const objectPath = [
    "principal-edits",
    safePageFolder,
    safeSlot,
    `${Date.now()}-${baseName}.${extension}`,
  ].join("/");
  const file = bucket.file(objectPath);

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
        source: "mmpns-functions-api",
        slot: safeSlot,
      },
    },
  });

  return {
    path: objectPath,
    url: createDownloadUrl(bucket.name, objectPath, token),
  };
};

module.exports = {
  getObjectDownloadUrl,
  uploadPrincipalImage,
};
