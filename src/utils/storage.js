// ---------------------------------------------------------------------------
// SoundAura — Storage with OPFS primary + IndexedDB fallback + localStorage
// OPFS survives Chrome "Clear browsing data" (most cases)
// ---------------------------------------------------------------------------

import { OpfsStorage } from './opfsStorage';

const DB_NAME = 'SoundAuraDB';
const DB_VERSION = 1;
const STORE_LIKED = 'likedSongs';
const STORE_RECENT = 'recentlyPlayed';
const STORE_DOWNLOADS = 'downloadedSongs';

const LS_LIKED_KEY = 'soundaura_liked_backup';
const LS_RECENT_KEY = 'soundaura_recent_backup';
const LS_DOWNLOADS_KEY = 'soundaura_downloads_backup';

const BACKEND_VERSION = 'saavn-v2';
const BACKEND_VERSION_KEY = 'soundaura_backend_version';

let db = null;
let opfsReady = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_LIKED)) database.createObjectStore(STORE_LIKED, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(STORE_RECENT)) database.createObjectStore(STORE_RECENT, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(STORE_DOWNLOADS)) database.createObjectStore(STORE_DOWNLOADS, { keyPath: 'id' });
    };
  });
}

async function getDB() {
  if (!db) await openDB();
  return db;
}

async function isOpfsReady() {
  if (opfsReady === null) opfsReady = await OpfsStorage.isAvailable();
  return opfsReady;
}

function lsSet(key, data) {
  try {
    const slim = data.map(s => ({
      id: s.id, title: s.title, artist: s.artist,
      album: s.album, duration: s.duration,
      coverUrl: s.coverUrl, audioUrl: s.audioUrl,
      language: s.language, hasLyrics: s.hasLyrics,
      allAudioUrls: s.allAudioUrls,
      rawAudioUrls: s.rawAudioUrls,
      _saavnId: s._saavnId, source: s.source, genre: s.genre,
    }));
    localStorage.setItem(key, JSON.stringify(slim));
  } catch {}
}

function lsGet(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

function slimSong(s) {
  return {
    id: s.id, title: s.title, artist: s.artist,
    album: s.album, duration: s.duration,
    coverUrl: s.coverUrl, audioUrl: s.audioUrl,
    language: s.language, hasLyrics: s.hasLyrics,
    allAudioUrls: s.allAudioUrls,
    rawAudioUrls: s.rawAudioUrls,
    _saavnId: s._saavnId, source: s.source, genre: s.genre,
  };
}

async function idbGetAll(storeName) {
  try {
    const database = await getDB();
    return new Promise((resolve) => {
      const tx = database.transaction([storeName], 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

async function idbPut(storeName, song) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([storeName], 'readwrite');
    const req = tx.objectStore(storeName).put(song);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(storeName, id) {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([storeName], 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(storeName) {
  const database = await getDB();
  return new Promise((resolve) => {
    const tx = database.transaction([storeName], 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

async function syncToOpfs(key, data) {
  if (await isOpfsReady()) {
    await OpfsStorage.saveJson(key, data);
  }
}

export const Storage = {
  async migrateIfNeeded() {
    try {
      const stored = localStorage.getItem(BACKEND_VERSION_KEY);
      if (stored === BACKEND_VERSION) return false;
      const backupLiked = await idbGetAll(STORE_LIKED);
      const backupRecent = await idbGetAll(STORE_RECENT);
      if (backupLiked.length > 0) lsSet(LS_LIKED_KEY, backupLiked);
      if (backupRecent.length > 0) lsSet(LS_RECENT_KEY, backupRecent.slice(0, 12));
      await Promise.all([STORE_LIKED, STORE_RECENT].map(idbClear));
      localStorage.setItem(BACKEND_VERSION_KEY, BACKEND_VERSION);
      return true;
    } catch (e) {
      console.warn('[SoundAura] Migration check failed:', e);
      return false;
    }
  },

  async requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist();
        console.log(`[SoundAura] Persistent storage ${granted ? 'granted ✅' : 'denied ❌'}`);
        if (!granted && navigator.storage.persisted) {
          const alreadyPersisted = await navigator.storage.persisted();
          if (alreadyPersisted) console.log('[SoundAura] Storage already persistent ✅');
        }
        return granted;
      } catch (e) {
        console.warn('[SoundAura] Storage persistence check failed:', e);
        return false;
      }
    }
    return false;
  },

  async getLikedSongs() {
    const opfs = await isOpfsReady();
    if (opfs) {
      try {
        const opfsData = await OpfsStorage.getLikedSongs();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_LIKED);
          if (idbData.length === 0) {
            console.log('[SoundAura] Restoring liked songs from OPFS...');
            for (const s of opfsData) await idbPut(STORE_LIKED, s);
          }
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_LIKED);
    if (idbData.length > 0) {
      lsSet(LS_LIKED_KEY, idbData);
      syncToOpfs('liked', idbData);
      return idbData;
    }
    const lsData = lsGet(LS_LIKED_KEY);
    if (lsData.length > 0) {
      for (const s of lsData) idbPut(STORE_LIKED, s).catch(() => {});
      syncToOpfs('liked', lsData);
      return lsData;
    }
    return [];
  },

  async addLikedSong(song) {
    await idbPut(STORE_LIKED, song);
    const all = await idbGetAll(STORE_LIKED);
    lsSet(LS_LIKED_KEY, all);
    syncToOpfs('liked', all);
  },

  async removeLikedSong(songId) {
    await idbDelete(STORE_LIKED, songId);
    const all = await idbGetAll(STORE_LIKED);
    lsSet(LS_LIKED_KEY, all);
    syncToOpfs('liked', all);
  },

  async getRecentlyPlayed() {
    const opfs = await isOpfsReady();
    if (opfs) {
      try {
        const opfsData = await OpfsStorage.getRecentlyPlayed();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_RECENT);
          if (idbData.length === 0) {
            console.log('[SoundAura] Restoring recent from OPFS...');
            for (const s of opfsData) await idbPut(STORE_RECENT, s);
          }
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_RECENT);
    if (idbData.length > 0) {
      lsSet(LS_RECENT_KEY, idbData);
      syncToOpfs('recent', idbData);
      return idbData;
    }
    const lsData = lsGet(LS_RECENT_KEY);
    if (lsData.length > 0) {
      for (const s of lsData) idbPut(STORE_RECENT, s).catch(() => {});
      syncToOpfs('recent', lsData);
      return lsData;
    }
    return [];
  },

  async addRecentlyPlayed(song) {
    await idbPut(STORE_RECENT, song);
    const all = await idbGetAll(STORE_RECENT);
    lsSet(LS_RECENT_KEY, all.slice(0, 12));
    syncToOpfs('recent', all.slice(0, 12));
  },

  async clearRecentlyPlayed() {
    await idbClear(STORE_RECENT);
    try { localStorage.removeItem(LS_RECENT_KEY); } catch {}
    if (await isOpfsReady()) await OpfsStorage.saveJson('recent', []);
  },

  async getDownloadedSongs() {
    const opfs = await isOpfsReady();
    if (opfs) {
      try {
        const opfsData = await OpfsStorage.getDownloadedSongs();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_DOWNLOADS);
          if (idbData.length === 0) {
            console.log('[SoundAura] Restoring downloads from OPFS...');
            for (const s of opfsData) await idbPut(STORE_DOWNLOADS, s);
          }
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_DOWNLOADS);
    if (idbData.length > 0) {
      lsSet(LS_DOWNLOADS_KEY, idbData);
      syncToOpfs('downloads', idbData);
      return idbData;
    }
    return [];
  },

  async addDownloadedSong(song) {
    await idbPut(STORE_DOWNLOADS, song);
    const all = await idbGetAll(STORE_DOWNLOADS);
    const slim = all.map(slimSong);
    try { localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(slim)); } catch {}
    syncToOpfs('downloads', slim);
    if (await isOpfsReady() && song.audioBlob) {
      await OpfsStorage.saveAudioBlob(song.id, song.audioBlob);
    }
  },

  async removeDownloadedSong(songId) {
    await idbDelete(STORE_DOWNLOADS, songId);
    const all = await idbGetAll(STORE_DOWNLOADS);
    const slim = all.map(slimSong);
    try { localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(slim)); } catch {}
    syncToOpfs('downloads', slim);
    if (await isOpfsReady()) await OpfsStorage.removeAudioBlob(songId);
  },

  async exportBackup() {
    const liked = await Storage.getLikedSongs();
    const recent = await Storage.getRecentlyPlayed();
    const downloads = await Storage.getDownloadedSongs();
    const data = {
      liked, recent,
      downloads: downloads.map(s => ({
        id: s.id, title: s.title, artist: s.artist,
        album: s.album, duration: s.duration,
        coverUrl: s.coverUrl, audioUrl: s.audioUrl,
        rawAudioUrls: s.rawAudioUrls,
      })),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soundaura-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.liked && Array.isArray(data.liked)) {
            for (const song of data.liked) await Storage.addLikedSong(song);
          }
          if (data.recent && Array.isArray(data.recent)) {
            for (const song of data.recent) await Storage.addRecentlyPlayed(song);
          }
          if (data.downloads && Array.isArray(data.downloads)) {
            for (const song of data.downloads) {
              await idbPut(STORE_DOWNLOADS, song);
            }
            const all = await idbGetAll(STORE_DOWNLOADS);
            syncToOpfs('downloads', all.map(slimSong));
          }
          resolve({ likedCount: data.liked?.length || 0, recentCount: data.recent?.length || 0, downloadsCount: data.downloads?.length || 0 });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },

  async getOpfsStatus() {
    return isOpfsReady();
  },

  async forceSyncToOpfs() {
    if (!(await isOpfsReady())) return false;
    const liked = await idbGetAll(STORE_LIKED);
    const recent = await idbGetAll(STORE_RECENT);
    const downloads = (await idbGetAll(STORE_DOWNLOADS)).map(slimSong);
    await OpfsStorage.saveJson('liked', liked);
    await OpfsStorage.saveJson('recent', recent);
    await OpfsStorage.saveJson('downloads', downloads);
    return true;
  }
};
