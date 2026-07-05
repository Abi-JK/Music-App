const DB_NAME = 'soundaura_offline';
const STORE = 'tracks';
const DB_VERSION = 1;

// Cache map of active Object URLs to prevent memory leaks
const objectUrls = new Map();

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineTrack(song, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      id: song.id,
      song,
      blob,
      savedAt: Date.now(),
    });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getOfflineTrack(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function listOfflineTracks() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      db.close();
      resolve((req.result || []).sort((a, b) => b.savedAt - a.savedAt));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteOfflineTrack(id) {
  // First clean up Object URL
  revokeTrackUrl(id);
  
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export function blobUrlForTrack(record) {
  if (!record?.blob) return null;
  // Reuse existing Object URL if available to avoid leaks
  if (objectUrls.has(record.id)) {
    return objectUrls.get(record.id);
  }
  const url = URL.createObjectURL(record.blob);
  objectUrls.set(record.id, url);
  return url;
}

export function revokeTrackUrl(id) {
  if (objectUrls.has(id)) {
    URL.revokeObjectURL(objectUrls.get(id));
    objectUrls.delete(id);
  }
}

export function clearAllTrackUrls() {
  for (const url of objectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrls.clear();
}
