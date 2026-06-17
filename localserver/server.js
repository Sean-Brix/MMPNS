require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { startTokenRefreshTimer } = require('./services/authService');
const { runSync } = require('./services/syncService');
const { countUnsyncedLogs, readStudents, PHOTOS_DIR } = require('./services/csvService');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const syncRoutes = require('./routes/syncRoutes');

const app = express();
const PORT = process.env.LOCAL_SERVER_PORT || 3001;
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '3600000', 10);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'mmpns-local-server',
    students: readStudents().length,
    unsyncedLogs: countUnsyncedLogs(),
    timestamp: new Date().toISOString(),
  });
});

// Serve student photos
app.use('/photos', express.static(PHOTOS_DIR));

// Routes
app.use('/local/students', studentRoutes);
app.use('/local/attendance', attendanceRoutes);
app.use('/local/sync', syncRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`[server] MMPNS Local Server running on http://localhost:${PORT}`);

  // Start token refresh timer
  startTokenRefreshTimer();

  // Trigger initial sync if students.csv is empty
  const students = readStudents();
  if (students.length === 0) {
    console.log('[server] No student data found — triggering initial sync...');
    runSync().catch((err) => console.error('[server] Initial sync failed:', err.message));
  } else {
    console.log(`[server] ${students.length} students loaded from CSV`);
  }

  // Auto-sync every SYNC_INTERVAL_MS (default: 1 hour)
  setInterval(() => {
    console.log('[server] Auto-sync triggered');
    runSync().catch((err) => console.error('[server] Auto-sync failed:', err.message));
  }, SYNC_INTERVAL_MS);
});
