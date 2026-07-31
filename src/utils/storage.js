import { OpfsStorage } from './opfsStorage';

const DB_NAME = 'SoundAuraDB';
const DB_VERSION = 3;
const STORE_LIKED = 'likedSongs';
const STORE_RECENT = 'recentlyPlayed';
const STORE_DOWNLOADS = 'downloadedSongs';
const STORE_CUSTOM = 'customSongs';

const LS_LIKED_KEY = 'soundaura_liked_backup';
const LS_RECENT_KEY = 'soundaura_recent_backup';
const LS_DOWNLOADS_KEY = 'soundaura_downloads_backup';
const LS_CUSTOM_KEY = 'soundaura_custom_backup';

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
      if (!database.objectStoreNames.contains(STORE_CUSTOM)) database.createObjectStore(STORE_CUSTOM, { keyPath: 'id' });
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
  // Also persist to IndexedDB as backup
  try {
    const transaction = db.transaction([key.replace('soundaura_', '').replace('_backup', '')], 'readwrite');
    const store = transaction.objectStore(key.replace('soundaura_', '').replace('_backup', ''));
    store.clear();
    slim.forEach(item => store.put(item));
  } catch {}
}

function lsGet(key) {
  try {
    const v = localStorage.getItem(key);
    if (v) return JSON.parse(v);
  } catch {}
  // Fallback to IndexedDB if localStorage missing
  try {
    const transaction = db.transaction([key.replace('soundaura_', '').replace('_backup', '')], 'readonly');
    const store = transaction.objectStore(key.replace('soundaura_', '').replace('_backup', ''));
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
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

async function idbPutAll(storeName, songs) {
  if (songs.length === 0) return;
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([storeName], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    for (const song of songs) {
      tx.objectStore(storeName).put(song);
    }
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

async function syncToOpfs(storeName, data) {
  if (await isOpfsReady()) {
    await OpfsStorage.saveJson(storeName, data);
  }
}

export const Storage = {
  async cleanupOldCache() {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.startsWith('soundaura-audio-') || key === 'soundaura-audio-v1') {
          await caches.delete(key);
        }
      }
    } catch {}
  },

  async forceSyncToOpfs() {
    if (!(await isOpfsReady())) return;
    try {
      await syncToOpfs('liked', await idbGetAll(STORE_LIKED));
      await syncToOpfs('recent', await idbGetAll(STORE_RECENT));
      await syncToOpfs('downloads', (await idbGetAll(STORE_DOWNLOADS)).map(slimSong));
      await syncToOpfs('custom', (await idbGetAll(STORE_CUSTOM)).map(slimSong));
    } catch {}
  },

  async requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist();
        console.log(`[SoundAura] Persistent storage ${granted ? 'granted' : 'denied'}`);
        return granted;
      } catch {
        return false;
      }
    }
    return false;
  },

  async getLikedSongs() {
    if (await isOpfsReady()) {
      try {
        const opfsData = await OpfsStorage.getLikedSongs();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_LIKED);
          if (idbData.length === 0) {
            await idbPutAll(STORE_LIKED, opfsData);
          }
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_LIKED);
    if (idbData.length > 0) {
      await syncToOpfs('liked', idbData);
      return idbData;
    }
    const lsData = lsGet(LS_LIKED_KEY);
    if (lsData.length > 0) {
      await syncToOpfs('liked', lsData);
      return lsData;
    }
    return [];
  },

  async addLikedSong(song) {
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getLikedSongs();
      if (current.find(s => s.id === song.id)) return;
      current.push(song);
      await OpfsStorage.saveLikedSongs(current);
    }
    await idbPut(STORE_LIKED, song);
    const all = await idbGetAll(STORE_LIKED);
    lsSet(LS_LIKED_KEY, all);
  },

  async removeLikedSong(songId) {
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getLikedSongs();
      const filtered = current.filter(s => s.id !== songId);
      await OpfsStorage.saveLikedSongs(filtered);
    }
    await idbDelete(STORE_LIKED, songId);
    const all = await idbGetAll(STORE_LIKED);
    lsSet(LS_LIKED_KEY, all);
  },

  async getRecentlyPlayed() {
    if (await isOpfsReady()) {
      try {
        const opfsData = await OpfsStorage.getRecentlyPlayed();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_RECENT);
          if (idbData.length === 0) {
            await idbPutAll(STORE_RECENT, opfsData);
          }
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_RECENT);
    if (idbData.length > 0) {
      await syncToOpfs('recent', idbData);
      return idbData;
    }
    const lsData = lsGet(LS_RECENT_KEY);
    if (lsData.length > 0) {
      await syncToOpfs('recent', lsData);
      return lsData;
    }
    return [];
  },

  async addRecentlyPlayed(song) {
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getRecentlyPlayed();
      const filtered = current.filter(s => s.id !== song.id).slice(0, 11);
      filtered.unshift(song);
      await OpfsStorage.saveRecentlyPlayed(filtered);
    }
    await idbPut(STORE_RECENT, song);
    const all = await idbGetAll(STORE_RECENT);
    lsSet(LS_RECENT_KEY, all.slice(0, 12));
  },

  async clearRecentlyPlayed() {
    if (await isOpfsReady()) await OpfsStorage.saveRecentlyPlayed([]);
    await idbClear(STORE_RECENT);
    try { localStorage.removeItem(LS_RECENT_KEY); } catch {}
  },

  async getDownloadedSongs() {
    if (await isOpfsReady()) {
      try {
        const opfsData = await OpfsStorage.getDownloadedSongs();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_DOWNLOADS);
          if (idbData.length === 0) {
            await idbPutAll(STORE_DOWNLOADS, opfsData);
          }
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_DOWNLOADS);
    if (idbData.length > 0) {
      await syncToOpfs('downloads', idbData.map(slimSong));
      return idbData;
    }
    return [];
  },

  async addDownloadedSong(song) {
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getDownloadedSongs();
      if (current.find(s => s.id === song.id)) return;
      current.push(slimSong(song));
      await OpfsStorage.saveDownloadedSongs(current);
    }
    await idbPut(STORE_DOWNLOADS, song);
    const all = await idbGetAll(STORE_DOWNLOADS);
    try { localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(all.map(slimSong))); } catch {}
    if (opfs && song.audioBlob) {
      await OpfsStorage.saveAudioBlob(song.id, song.audioBlob);
    }
  },

  async removeDownloadedSong(songId) {
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getDownloadedSongs();
      const filtered = current.filter(s => s.id !== songId);
      await OpfsStorage.saveDownloadedSongs(filtered);
    }
    await idbDelete(STORE_DOWNLOADS, songId);
    const all = await idbGetAll(STORE_DOWNLOADS);
    try { localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(all.map(slimSong))); } catch {}
    if (opfs) await OpfsStorage.removeAudioBlob(songId);
  },

  async getCustomSongs() {
    if (await isOpfsReady()) {
      try {
        const opfsData = await OpfsStorage.getCustomSongs();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_CUSTOM);
          if (idbData.length === 0) {
            await idbPutAll(STORE_CUSTOM, opfsData);
          }
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_CUSTOM);
    if (idbData.length > 0) {
      await syncToOpfs('custom', idbData);
      return idbData;
    }
    const lsData = lsGet(LS_CUSTOM_KEY);
    if (lsData.length > 0) {
      await syncToOpfs('custom', lsData);
      return lsData;
    }
    return [];
  },

  async addCustomSong(song, audioBlob) {
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getCustomSongs();
      if (current.find(s => s.id === song.id)) return;
      current.push(slimSong(song));
      await OpfsStorage.saveCustomSongs(current);
    }
    const songWithBlob = { ...song, audioBlob };
    await idbPut(STORE_CUSTOM, songWithBlob);
    const all = await idbGetAll(STORE_CUSTOM);
    lsSet(LS_CUSTOM_KEY, all.map(s => { const c = { ...s }; delete c.audioBlob; return c; }));
    if (opfs && audioBlob) {
      await OpfsStorage.saveAudioBlob(song.id, audioBlob);
    }
  },

  async removeCustomSong(songId) {
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getCustomSongs();
      const filtered = current.filter(s => s.id !== songId);
      await OpfsStorage.saveCustomSongs(filtered);
    }
    await idbDelete(STORE_CUSTOM, songId);
    const all = await idbGetAll(STORE_CUSTOM);
    lsSet(LS_CUSTOM_KEY, all.map(s => { const c = { ...s }; delete c.audioBlob; return c; }));
    if (opfs) await OpfsStorage.removeAudioBlob(songId);
  },

  async loadCustomSongBlob(songId) {
    if (await isOpfsReady()) {
      const file = await OpfsStorage.loadAudioBlob(songId);
      if (file) return file;
    }
    const all = await idbGetAll(STORE_CUSTOM);
    const song = all.find(s => s.id === songId);
    return song?.audioBlob || null;
  },

  async getOpfsStatus() {
    return isOpfsReady();
  },

  // Helper to persist arbitrary data to IndexedDB to survive localStorage clear
  async persistData(storeName, key) {
    const data = await this.getLikedSongs(); // example for liked; adjust per store if needed
    await idbPutAll(storeName, data);
    lsSet(key, data);
  },

  async importCloudData({ liked, recent, downloads, custom } = {}) {
    if (Array.isArray(liked) && liked.length > 0) {
      await idbPutAll(STORE_LIKED, liked);
      await syncToOpfs('liked', liked);
    }
    if (Array.isArray(recent) && recent.length > 0) {
      await idbPutAll(STORE_RECENT, recent);
      await syncToOpfs('recent', recent.slice(0, 12));
    }
    if (Array.isArray(downloads) && downloads.length > 0) {
      await idbPutAll(STORE_DOWNLOADS, downloads);
      await syncToOpfs('downloads', downloads.map(slimSong));
    }
    if (Array.isArray(custom) && custom.length > 0) {
      await idbPutAll(STORE_CUSTOM, custom);
      await syncToOpfs('custom', custom.map(slimSong));
    }
    return {
      liked: liked?.length || 0,
      recent: recent?.length || 0,
      downloads: downloads?.length || 0,
      custom: custom?.length || 0,
    };
  },

  async exportBackup() {
    const liked = await Storage.getLikedSongs();
    const recent = await Storage.getRecentlyPlayed();
    const downloads = await Storage.getDownloadedSongs();
    const custom = await Storage.getCustomSongs();
    const data = {
      liked, recent,
      downloads: downloads.map(s => ({
        id: s.id, title: s.title, artist: s.artist,
        album: s.album, duration: s.duration,
        coverUrl: s.coverUrl, audioUrl: s.audioUrl,
        rawAudioUrls: s.rawAudioUrls,
      })),
      custom: custom.map(s => ({
        id: s.id, title: s.title, artist: s.artist,
        album: s.album, duration: s.duration,
        coverUrl: s.coverUrl, genre: s.genre,
        addedAt: s.addedAt,
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
            await syncToOpfs('downloads', all.map(slimSong));
          }
          resolve({ likedCount: data.liked?.length || 0, recentCount: data.recent?.length || 0, downloadsCount: data.downloads?.length || 0 });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },
};
