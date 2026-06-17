const express = require('express');
const { runSync, getSyncStatus } = require('../services/syncService');

const router = express.Router();

// GET /local/sync/status
router.get('/status', (req, res) => {
  res.json(getSyncStatus());
});

// POST /local/sync/run
router.post('/run', async (req, res) => {
  const status = getSyncStatus();
  if (status.isSyncing) {
    return res.status(409).json({ error: 'Sync already in progress.' });
  }
  // Run in background, return immediately so the client can poll status
  runSync().catch((err) => console.error('[syncRoute] runSync error:', err.message));
  res.json({ started: true });
});

module.exports = router;
