const express = require("express");
const {forbidden} = require("../httpError");
const {requireAuth} = require("../services/sessionService");
const {
  deleteTable,
  getSeedSnapshot,
  getTable,
  listTables,
  setTable,
} = require("../services/tableService");

// eslint-disable-next-line new-cap
const router = express.Router();

const tableWriteRoles = ["teacher", "admin", "superadmin", "principal"];
// Librarians manage the books catalog, so they may also write that one table.
const bookTableWriteRoles = [...tableWriteRoles, "librarian"];
const developerRoles = new Set(["admin", "superadmin"]);

const isCredentialsTable = (req) => req.params.table === "credentials";

const requireDeveloperAdmin = (req, res, next) => {
  requireAuth()(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }

    const role = String((req.auth && req.auth.role) || "").toLowerCase();
    if (req.auth && req.auth.accountType === "admin" &&
      developerRoles.has(role)) {
      next();
      return;
    }

    next(forbidden("Developer admin access is required."));
  });
};

const requireCredentialRead = (req, res, next) => {
  if (isCredentialsTable(req)) {
    requireDeveloperAdmin(req, res, next);
    return;
  }

  next();
};

const requireTableWrite = (req, res, next) => {
  if (isCredentialsTable(req)) {
    requireDeveloperAdmin(req, res, next);
    return;
  }

  const roles = req.params.table === "books" ? bookTableWriteRoles : tableWriteRoles;
  requireAuth(roles)(req, res, next);
};

const requireSeedRead = (req, res, next) => {
  if (req.params.key === "users") {
    requireDeveloperAdmin(req, res, next);
    return;
  }

  next();
};

router.get("/", (_req, res) => {
  res.json({tables: listTables()});
});

router.get("/seed-snapshots/:key", requireSeedRead, async (req, res, next) => {
  try {
    const payload = await getSeedSnapshot(req.params.key);
    res.json({key: req.params.key, payload});
  } catch (error) {
    next(error);
  }
});

router.get("/:table", requireCredentialRead, async (req, res, next) => {
  try {
    const payload = await getTable(req.params.table);
    res.json({table: req.params.table, payload});
  } catch (error) {
    next(error);
  }
});

router.put("/:table", requireTableWrite, async (req, res, next) => {
  try {
    const hasPayload = Object.prototype.hasOwnProperty.call(
        req.body || {},
        "payload",
    );
    const payload = hasPayload ?
      req.body.payload :
      req.body;

    const savedPayload = await setTable(req.params.table, payload);
    res.json({table: req.params.table, payload: savedPayload});
  } catch (error) {
    next(error);
  }
});

router.patch("/:table", requireTableWrite, async (req, res, next) => {
  try {
    const current = await getTable(req.params.table);
    const hasPayload = Object.prototype.hasOwnProperty.call(
        req.body || {},
        "payload",
    );
    const updates = hasPayload ?
      req.body.payload :
      req.body;
    const nextPayload = {
      ...(current && typeof current === "object" && !Array.isArray(current) ?
        current :
        {}),
      ...(updates && typeof updates === "object" && !Array.isArray(updates) ?
        updates :
        {}),
    };

    const savedPayload = await setTable(req.params.table, nextPayload);
    res.json({table: req.params.table, payload: savedPayload});
  } catch (error) {
    next(error);
  }
});

router.delete("/:table", requireTableWrite, async (req, res, next) => {
  try {
    await deleteTable(req.params.table);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = {
  tableRoutes: router,
};
