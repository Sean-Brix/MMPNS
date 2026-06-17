const fs = require('fs');
const path = require('path');
const { cloudFetch } = require('./authService');
const {
  PHOTOS_DIR,
  readStudents,
  upsertStudent,
  deleteStudent,
  getUnsyncedLogs,
  markLogsAsSynced,
  countUnsyncedLogs,
} = require('./csvService');

const STATUS_FILE = path.join(__dirname, '..', 'data', 'sync_status.json');

const readStatus = () => {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    }
  } catch (_) { /* ignore */ }
  return { lastSynced: null, isSyncing: false, syncSteps: [], lastError: null };
};

const writeStatus = (updates) => {
  const current = readStatus();
  const next = { ...current, ...updates };
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(next, null, 2), 'utf-8');
  } catch (err) {
    console.error('[sync] Could not write status file:', err.message);
  }
};

let syncInProgress = false;

const downloadPhoto = async (uid, photoUrl) => {
  if (!photoUrl || photoUrl.startsWith('/photos/')) return null;
  try {
    const res = await fetch(photoUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const filename = `${uid}.${ext}`;
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(PHOTOS_DIR, filename), buffer);
    return filename;
  } catch (err) {
    console.warn(`[sync] Could not download photo for ${uid}:`, err.message);
    return null;
  }
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

const addStep = (msg) => {
  console.log('[sync]', msg);
  const status = readStatus();
  writeStatus({ syncSteps: [...(status.syncSteps || []), msg] });
};

const runSync = async () => {
  if (syncInProgress) {
    console.log('[sync] Sync already in progress, skipping');
    return;
  }
  syncInProgress = true;
  writeStatus({ isSyncing: true, syncSteps: [], lastError: null });

  try {
    const isFirstRun = readStudents().length === 0;

    addStep('Connecting to cloud server...');

    if (isFirstRun) {
      addStep('First-time setup: downloading all student data...');
      const { students } = await cloudFetch('/sync/export');
      let photoCount = 0;

      for (const student of students) {
        const photoFile = await downloadPhoto(student.uid, student.photoUrl);
        upsertStudent({
          uid: student.uid,
          systemId: student.systemId,
          displayName: student.displayName,
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          lrn: student.lrn || '',
          gradeLevel: student.gradeLevel || '',
          section: student.section || '',
          photoFile: photoFile || '',
          photoUpdatedAt: student.photoUpdatedAt || '',
          status: student.status,
        });
        if (photoFile) photoCount++;
      }

      addStep(`Downloaded ${students.length} students and ${photoCount} photos`);

      // Clear any pending queue since we did a full export
      await cloudFetch('/sync/clear', { method: 'POST' });
    } else {
      addStep('Fetching pending student changes...');
      const { pendingUpserts, pendingDeletes } = await cloudFetch('/sync/pending');

      if (pendingUpserts.length > 0) {
        addStep(`Updating ${pendingUpserts.length} student record(s)...`);
        const { students } = await cloudFetch('/sync/students', {
          method: 'POST',
          body: JSON.stringify({ uids: pendingUpserts }),
        });
        let photoCount = 0;
        for (const student of students) {
          const photoFile = await downloadPhoto(student.uid, student.photoUrl);
          upsertStudent({
            uid: student.uid,
            systemId: student.systemId,
            displayName: student.displayName,
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            lrn: student.lrn || '',
            gradeLevel: student.gradeLevel || '',
            section: student.section || '',
            photoFile: photoFile || '',
            photoUpdatedAt: student.photoUpdatedAt || '',
            status: student.status,
          });
          if (photoFile) photoCount++;
        }
        addStep(`Updated ${students.length} student(s), ${photoCount} photo(s) refreshed`);
      } else {
        addStep('No student changes pending');
      }

      if (pendingDeletes.length > 0) {
        addStep(`Removing ${pendingDeletes.length} deleted student(s)...`);
        for (const uid of pendingDeletes) {
          deleteStudent(uid);
          // Remove photo file if it exists
          const photoFiles = fs.readdirSync(PHOTOS_DIR).filter((f) => f.startsWith(uid + '.'));
          for (const f of photoFiles) fs.unlinkSync(path.join(PHOTOS_DIR, f));
        }
        addStep(`Removed ${pendingDeletes.length} student record(s)`);
      }

      if (pendingUpserts.length > 0 || pendingDeletes.length > 0) {
        await cloudFetch('/sync/clear', { method: 'POST' });
      }
    }

    // Upload unsynced attendance logs
    const unsyncedLogs = getUnsyncedLogs();
    if (unsyncedLogs.length > 0) {
      addStep(`Uploading ${unsyncedLogs.length} attendance log(s)...`);

      // Strip the internal _file field and synced flag before uploading
      const records = unsyncedLogs.map(({ _file, synced, ...r }) => ({
        ...r,
        scanCount: parseInt(r.scanCount || '0', 10),
        timeInScanCount: parseInt(r.timeInScanCount || '0', 10),
        timeOutScanCount: parseInt(r.timeOutScanCount || '0', 10),
      }));

      let totalImported = 0;
      for (const chunk of chunkArray(records, 200)) {
        const result = await cloudFetch('/attendance/bulk', {
          method: 'POST',
          body: JSON.stringify({ records: chunk }),
        });
        totalImported += result.imported || 0;
      }

      markLogsAsSynced(unsyncedLogs);
      addStep(`Uploaded ${totalImported} attendance record(s)`);
    } else {
      addStep('No attendance logs to upload');
    }

    const now = new Date().toISOString();
    addStep('Sync complete!');
    writeStatus({ lastSynced: now, isSyncing: false, lastError: null });
    console.log('[sync] Sync completed at', now);
  } catch (err) {
    const msg = err.message || 'Unknown sync error';
    addStep(`Sync failed: ${msg}`);
    writeStatus({ isSyncing: false, lastError: msg });
  } finally {
    syncInProgress = false;
  }
};

const getSyncStatus = () => {
  const status = readStatus();
  return {
    ...status,
    pendingLogs: countUnsyncedLogs(),
  };
};

module.exports = { runSync, getSyncStatus };
