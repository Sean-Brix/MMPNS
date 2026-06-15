const Busboy = require("busboy");
const express = require("express");
const {badRequest} = require("../httpError");
const {requireAuth} = require("../services/sessionService");
const {
  getObjectDownloadUrl,
  uploadPrincipalImage,
  uploadStudentPhoto,
} = require("../services/storageService");
const {updateStudentPhoto} = require("../services/userService");

// eslint-disable-next-line new-cap
const router = express.Router();

const parseMultipartUpload = (req) => {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line new-cap
    const busboy = Busboy({headers: req.headers});
    const fields = {};
    const files = [];

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (name, file, info) => {
      const chunks = [];

      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("limit", () => {
        reject(badRequest("Image file is too large."));
      });

      file.on("end", () => {
        files.push({
          name,
          filename: info.filename,
          contentType: info.mimeType,
          buffer: Buffer.concat(chunks),
        });
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      resolve({fields, file: files[0]});
    });

    busboy.end(req.rawBody);
  });
};

router.get("/objects/url", async (req, res, next) => {
  try {
    const result = await getObjectDownloadUrl(req.query.path);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post(
    "/principal-edits",
    requireAuth(["teacher", "admin", "superadmin", "principal"]),
    async (req, res, next) => {
      try {
        const {fields, file} = await parseMultipartUpload(req);
        const result = await uploadPrincipalImage({
          buffer: file && file.buffer,
          contentType: file && file.contentType,
          filename: file && file.filename,
          pageFolder: fields.pageFolder,
          slot: fields.slot,
        });

        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    });

router.post(
    "/student-photos/:uid",
    requireAuth(["superadmin", "admin", "registrar"]),
    async (req, res, next) => {
      try {
        const {uid} = req.params;
        if (!uid) throw badRequest("Student UID is required.");
        const {file} = await parseMultipartUpload(req);
        const result = await uploadStudentPhoto({
          uid,
          buffer: file && file.buffer,
          contentType: file && file.contentType,
          filename: file && file.filename,
        });
        await updateStudentPhoto(uid, result.url);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    });

module.exports = {
  storageRoutes: router,
};
