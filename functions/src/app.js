const cors = require("cors");
const express = require("express");
const {HttpError} = require("./httpError");
const {authRoutes} = require("./routes/authRoutes");
const {accountRoutes} = require("./routes/accountRoutes");
const {attendanceRoutes} = require("./routes/attendanceRoutes");
const {storageRoutes} = require("./routes/storageRoutes");
const {tableRoutes} = require("./routes/tableRoutes");
const {syncRoutes} = require("./routes/syncRoutes");

const app = express();
// eslint-disable-next-line new-cap
const router = express.Router();

app.use(cors({origin: true}));
app.use(express.json({limit: "10mb"}));

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mmpns-api",
    backingServices: ["firestore", "cloud-storage", "firebase-auth"],
  });
});

router.use("/auth", authRoutes);
router.use("/accounts", accountRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/tables", tableRoutes);
router.use("/storage", storageRoutes);
router.use("/sync", syncRoutes);

app.use("/api", router);
app.use("/", router);

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
});

app.use((error, _req, res, _next) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const message = statusCode === 500 ? "Internal server error" : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: message,
  });
});

module.exports = {app};
