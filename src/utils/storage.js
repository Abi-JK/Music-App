import { OpfsStorage } from './opfsStorage';
import { CapacitorStorage } from './capacitorStorage';

const DB_NAME = 'SoundAuraDB';
const DB_VERSION = 3;
const STORE_LIKED = 'likedSongs';
const STORE_RECENT = 'recentlyPlayed';
const STORE_DOWNLOADS = 'downloadedSongs';
const STORE_CUSTOM = 'customSongs';

const NATIVE_KEYS = {
  liked: 'sa_liked',
  recent: 'sa_recent',
  downloads: 'sa_downloads',
  custom: 'sa_custom',
};

let db = null;
let opfsReady = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (CapacitorStorage.isNative()) { resolve(null); return; }
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
  if (!db && !CapacitorStorage.isNative()) await openDB();
  return db;
}

async function isOpfsReady() {
  if (CapacitorStorage.isNative()) return false;
  if (opfsReady === null) opfsReady = await OpfsStorage.isAvailable();
  return opfsReady;
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
    year: s.year,
    _customFile: s._customFile || s.id?.startsWith('custom-'),
    addedAt: s.addedAt, downloadedAt: s.downloadedAt,
  };
}

async function idbGetAll(storeName) {
  if (CapacitorStorage.isNative()) return [];
  try {
    const database = await getDB();
    if (!database) return [];
    return new Promise((resolve) => {
      const tx = database.transaction([storeName], 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

async function idbPut(storeName, song) {
  if (CapacitorStorage.isNative()) return;
  const database = await getDB();
  if (!database) return;
  return new Promise((resolve, reject) => {
    const tx = database.transaction([storeName], 'readwrite');
    const req = tx.objectStore(storeName).put(song);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutAll(storeName, songs) {
  if (CapacitorStorage.isNative() || songs.length === 0) return;
  const database = await getDB();
  if (!database) return;
  return new Promise((resolve, reject) => {
    const tx = database.transaction([storeName], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    for (const song of songs) tx.objectStore(storeName).put(song);
  });
}

async function idbDelete(storeName, id) {
  if (CapacitorStorage.isNative()) return;
  const database = await getDB();
  if (!database) return;
  return new Promise((resolve, reject) => {
    const tx = database.transaction([storeName], 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbClear(storeName) {
  if (CapacitorStorage.isNative()) return;
  const database = await getDB();
  if (!database) return;
  return new Promise((resolve) => {
    const tx = database.transaction([storeName], 'readwrite');
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

async function syncToOpfs(storeName, data) {
  if (CapacitorStorage.isNative()) return;
  if (await isOpfsReady()) {
    await OpfsStorage.saveJson(storeName, data);
  }
}

export const Storage = {
  isNative: () => CapacitorStorage.isNative(),

  async cleanupOldCache() {
    if (CapacitorStorage.isNative()) return;
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
    if (CapacitorStorage.isNative()) return true;
    try {
      await syncToOpfs('liked', await idbGetAll(STORE_LIKED));
      await syncToOpfs('recent', await idbGetAll(STORE_RECENT));
      await syncToOpfs('downloads', (await idbGetAll(STORE_DOWNLOADS)).map(slimSong));
      await syncToOpfs('custom', (await idbGetAll(STORE_CUSTOM)).map(slimSong));
      return true;
    } catch { return false; }
  },

  async requestPersistence() {
    if (CapacitorStorage.isNative()) return true;
    if (navigator.storage && navigator.storage.persist) {
      try { return await navigator.storage.persist(); } catch { return false; }
    }
    return false;
  },

  async getLikedSongs() {
    if (CapacitorStorage.isNative()) {
      return (await CapacitorStorage.getJSON(NATIVE_KEYS.liked)) || [];
    }
    if (await isOpfsReady()) {
      try {
        const opfsData = await OpfsStorage.getLikedSongs();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_LIKED);
          if (idbData.length === 0) await idbPutAll(STORE_LIKED, opfsData);
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_LIKED);
    if (idbData.length > 0) {
      syncToOpfs('liked', idbData).catch(() => {});
      return idbData;
    }
    return [];
  },

  async addLikedSong(song) {
    if (CapacitorStorage.isNative()) {
      const current = await CapacitorStorage.getJSON(NATIVE_KEYS.liked) || [];
      if (current.find(s => s.id === song.id)) return;
      current.push(slimSong(song));
      await CapacitorStorage.setJSON(NATIVE_KEYS.liked, current);
      return;
    }
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getLikedSongs();
      if (current.find(s => s.id === song.id)) return;
      current.push(song);
      await OpfsStorage.saveLikedSongs(current);
    }
    await idbPut(STORE_LIKED, song);
    const all = await idbGetAll(STORE_LIKED);
    await idbPutAll(STORE_LIKED, all);
  },

  async removeLikedSong(songId) {
    if (CapacitorStorage.isNative()) {
      const current = await CapacitorStorage.getJSON(NATIVE_KEYS.liked) || [];
      await CapacitorStorage.setJSON(NATIVE_KEYS.liked, current.filter(s => s.id !== songId));
      return;
    }
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getLikedSongs();
      await OpfsStorage.saveLikedSongs(current.filter(s => s.id !== songId));
    }
    await idbDelete(STORE_LIKED, songId);
    const all = await idbGetAll(STORE_LIKED);
    await idbPutAll(STORE_LIKED, all);
  },

  async getRecentlyPlayed() {
    if (CapacitorStorage.isNative()) {
      return (await CapacitorStorage.getJSON(NATIVE_KEYS.recent)) || [];
    }
    if (await isOpfsReady()) {
      try {
        const opfsData = await OpfsStorage.getRecentlyPlayed();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_RECENT);
          if (idbData.length === 0) await idbPutAll(STORE_RECENT, opfsData);
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_RECENT);
    if (idbData.length > 0) {
      syncToOpfs('recent', idbData).catch(() => {});
      return idbData;
    }
    return [];
  },

  async addRecentlyPlayed(song) {
    if (CapacitorStorage.isNative()) {
      const current = await CapacitorStorage.getJSON(NATIVE_KEYS.recent) || [];
      const filtered = current.filter(s => s.id !== song.id).slice(0, 11);
      filtered.unshift(slimSong(song));
      await CapacitorStorage.setJSON(NATIVE_KEYS.recent, filtered);
      return;
    }
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getRecentlyPlayed();
      const filtered = current.filter(s => s.id !== song.id).slice(0, 11);
      filtered.unshift(song);
      await OpfsStorage.saveRecentlyPlayed(filtered);
    }
    await idbPut(STORE_RECENT, song);
    const all = await idbGetAll(STORE_RECENT);
    await idbPutAll(STORE_RECENT, all);
  },

  async clearRecentlyPlayed() {
    if (CapacitorStorage.isNative()) {
      await CapacitorStorage.setJSON(NATIVE_KEYS.recent, []);
      return;
    }
    if (await isOpfsReady()) await OpfsStorage.saveRecentlyPlayed([]);
    await idbClear(STORE_RECENT);
  },

  async getDownloadedSongs() {
    if (CapacitorStorage.isNative()) {
      return (await CapacitorStorage.getJSON(NATIVE_KEYS.downloads)) || [];
    }
    if (await isOpfsReady()) {
      try {
        const opfsData = await OpfsStorage.getDownloadedSongs();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_DOWNLOADS);
          if (idbData.length === 0) await idbPutAll(STORE_DOWNLOADS, opfsData);
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_DOWNLOADS);
    if (idbData.length > 0) {
      syncToOpfs('downloads', idbData.map(slimSong)).catch(() => {});
      return idbData;
    }
    return [];
  },

  async addDownloadedSong(song) {
    if (CapacitorStorage.isNative()) {
      const current = await CapacitorStorage.getJSON(NATIVE_KEYS.downloads) || [];
      if (current.find(s => s.id === song.id)) return;
      current.push(slimSong(song));
      await CapacitorStorage.setJSON(NATIVE_KEYS.downloads, current);
      return;
    }
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getDownloadedSongs();
      if (current.find(s => s.id === song.id)) return;
      current.push(slimSong(song));
      await OpfsStorage.saveDownloadedSongs(current);
    }
    await idbPut(STORE_DOWNLOADS, song);
    const all = await idbGetAll(STORE_DOWNLOADS);
    await idbPutAll(STORE_DOWNLOADS, all);
  },

  async removeDownloadedSong(songId) {
    if (CapacitorStorage.isNative()) {
      const current = await CapacitorStorage.getJSON(NATIVE_KEYS.downloads) || [];
      await CapacitorStorage.setJSON(NATIVE_KEYS.downloads, current.filter(s => s.id !== songId));
      return;
    }
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getDownloadedSongs();
      await OpfsStorage.saveDownloadedSongs(current.filter(s => s.id !== songId));
    }
    await idbDelete(STORE_DOWNLOADS, songId);
    const all = await idbGetAll(STORE_DOWNLOADS);
    await idbPutAll(STORE_DOWNLOADS, all);
  },

  async getCustomSongs() {
    if (CapacitorStorage.isNative()) {
      return (await CapacitorStorage.getJSON(NATIVE_KEYS.custom)) || [];
    }
    if (await isOpfsReady()) {
      try {
        const opfsData = await OpfsStorage.getCustomSongs();
        if (opfsData.length > 0) {
          const idbData = await idbGetAll(STORE_CUSTOM);
          if (idbData.length === 0) await idbPutAll(STORE_CUSTOM, opfsData);
          return opfsData;
        }
      } catch {}
    }
    const idbData = await idbGetAll(STORE_CUSTOM);
    if (idbData.length > 0) {
      syncToOpfs('custom', idbData.map(slimSong)).catch(() => {});
      return idbData;
    }
    return [];
  },

  async addCustomSong(song, audioBlob) {
    if (CapacitorStorage.isNative()) {
      const current = await CapacitorStorage.getJSON(NATIVE_KEYS.custom) || [];
      if (current.find(s => s.id === song.id)) return;
      current.push(slimSong(song));
      await CapacitorStorage.setJSON(NATIVE_KEYS.custom, current);
      return;
    }
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
    await idbPutAll(STORE_CUSTOM, all);
    if (opfs && audioBlob) {
      await OpfsStorage.saveAudioBlob(song.id, audioBlob);
    }
  },

  async removeCustomSong(songId) {
    if (CapacitorStorage.isNative()) {
      const current = await CapacitorStorage.getJSON(NATIVE_KEYS.custom) || [];
      await CapacitorStorage.setJSON(NATIVE_KEYS.custom, current.filter(s => s.id !== songId));
      return;
    }
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getCustomSongs();
      await OpfsStorage.saveCustomSongs(current.filter(s => s.id !== songId));
    }
    await idbDelete(STORE_CUSTOM, songId);
    const all = await idbGetAll(STORE_CUSTOM);
    await idbPutAll(STORE_CUSTOM, all);
    if (opfs) await OpfsStorage.removeAudioBlob(songId);
  },

  async updateCustomSong(songId, updates) {
    if (CapacitorStorage.isNative()) {
      const current = await CapacitorStorage.getJSON(NATIVE_KEYS.custom) || [];
      const idx = current.findIndex(s => s.id === songId);
      if (idx >= 0) { current[idx] = { ...current[idx], ...updates }; await CapacitorStorage.setJSON(NATIVE_KEYS.custom, current); }
      return;
    }
    const opfs = await isOpfsReady();
    if (opfs) {
      const current = await OpfsStorage.getCustomSongs();
      const idx = current.findIndex(s => s.id === songId);
      if (idx >= 0) { current[idx] = { ...current[idx], ...updates }; await OpfsStorage.saveCustomSongs(current); }
    }
    const all = await idbGetAll(STORE_CUSTOM);
    const idx = all.findIndex(s => s.id === songId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
      await idbPut(STORE_CUSTOM, all[idx]);
    }
    const updated = await idbGetAll(STORE_CUSTOM);
    await idbPutAll(STORE_CUSTOM, updated);
  },

  async loadCustomSongBlob(songId) {
    if (CapacitorStorage.isNative()) return null;
    if (await isOpfsReady()) {
      const file = await OpfsStorage.loadAudioBlob(songId);
      if (file) return file;
    }
    const all = await idbGetAll(STORE_CUSTOM);
    const song = all.find(s => s.id === songId);
    return song?.audioBlob || null;
  },

  async loadSongBlob(songId) {
    if (CapacitorStorage.isNative()) return null;
    if (await isOpfsReady()) {
      const file = await OpfsStorage.loadAudioBlob(songId);
      if (file) return file;
    }
    const all = await idbGetAll(STORE_CUSTOM);
    let song = all.find(s => s.id === songId);
    if (song?.audioBlob) return song.audioBlob;
    const downloads = await idbGetAll(STORE_DOWNLOADS);
    song = downloads.find(s => s.id === songId);
    return song?.audioBlob || null;
  },

  async getOpfsStatus() {
    if (CapacitorStorage.isNative()) return false;
    return isOpfsReady();
  },

  async importCloudData({ liked, recent, downloads, custom } = {}) {
    const likedArr = Array.isArray(liked) ? liked : [];
    const recentArr = Array.isArray(recent) ? recent : [];
    const downloadsArr = Array.isArray(downloads) ? downloads : [];
    const customArr = Array.isArray(custom) ? custom : [];

    if (CapacitorStorage.isNative()) {
      await CapacitorStorage.setJSON(NATIVE_KEYS.liked, likedArr);
      await CapacitorStorage.setJSON(NATIVE_KEYS.recent, recentArr.slice(0, 12));
      await CapacitorStorage.setJSON(NATIVE_KEYS.downloads, downloadsArr);
      await CapacitorStorage.setJSON(NATIVE_KEYS.custom, customArr);
      return { liked: likedArr.length, recent: recentArr.length, downloads: downloadsArr.length, custom: customArr.length };
    }

    await idbClear(STORE_LIKED);
    await idbPutAll(STORE_LIKED, likedArr);
    syncToOpfs('liked', likedArr).catch(() => {});

    await idbClear(STORE_RECENT);
    await idbPutAll(STORE_RECENT, recentArr);
    syncToOpfs('recent', recentArr.slice(0, 12)).catch(() => {});

    await idbClear(STORE_DOWNLOADS);
    await idbPutAll(STORE_DOWNLOADS, downloadsArr);
    syncToOpfs('downloads', downloadsArr.map(slimSong)).catch(() => {});

    await idbClear(STORE_CUSTOM);
    await idbPutAll(STORE_CUSTOM, customArr);
    syncToOpfs('custom', customArr.map(slimSong)).catch(() => {});

    return { liked: likedArr.length, recent: recentArr.length, downloads: downloadsArr.length, custom: customArr.length };
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
              if (CapacitorStorage.isNative()) {
                const current = await CapacitorStorage.getJSON(NATIVE_KEYS.downloads) || [];
                if (!current.find(s => s.id === song.id)) current.push(slimSong(song));
                await CapacitorStorage.setJSON(NATIVE_KEYS.downloads, current);
              } else {
                await idbPut(STORE_DOWNLOADS, song);
              }
            }
          }
          if (data.custom && Array.isArray(data.custom)) {
            for (const song of data.custom) {
              const customSong = { ...song, source: 'custom', _customFile: true };
              if (CapacitorStorage.isNative()) {
                const current = await CapacitorStorage.getJSON(NATIVE_KEYS.custom) || [];
                if (!current.find(s => s.id === song.id)) current.push(slimSong(customSong));
                await CapacitorStorage.setJSON(NATIVE_KEYS.custom, current);
              } else {
                await idbPut(STORE_CUSTOM, customSong);
              }
            }
          }
          resolve({
            likedCount: data.liked?.length || 0,
            recentCount: data.recent?.length || 0,
            downloadsCount: data.downloads?.length || 0,
            customCount: data.custom?.length || 0,
          });
        } catch { reject(new Error('Invalid backup file')); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
};
