// IndexedDB wrapper for persistent storage
const DB_NAME = 'SoundAuraDB';
const DB_VERSION = 1;
const STORE_LIKED = 'likedSongs';
const STORE_RECENT = 'recentlyPlayed';
const STORE_DOWNLOADS = 'downloadedSongs';

// LocalStorage backup keys (secondary persistence layer)
const LS_LIKED_KEY = 'soundaura_liked_backup';
const LS_RECENT_KEY = 'soundaura_recent_backup';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create stores if they don't exist
      if (!database.objectStoreNames.contains(STORE_LIKED)) {
        database.createObjectStore(STORE_LIKED, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_RECENT)) {
        database.createObjectStore(STORE_RECENT, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_DOWNLOADS)) {
        database.createObjectStore(STORE_DOWNLOADS, { keyPath: 'id' });
      }
    };
  });
}

async function getDB() {
  if (!db) {
    await openDB();
  }
  return db;
}

// Safely write to localStorage as backup
function lsSet(key, data) {
  try {
    // Only store essential fields to save space (no audio blobs)
    const slim = data.map(s => ({
      id: s.id, title: s.title, artist: s.artist,
      album: s.album, duration: s.duration,
      coverUrl: s.coverUrl, audioUrl: s.audioUrl,
      language: s.language, hasLyrics: s.hasLyrics,
      allAudioUrls: s.allAudioUrls,
    }));
    localStorage.setItem(key, JSON.stringify(slim));
  } catch { /* quota exceeded — silently skip */ }
}

function lsGet(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}

export const Storage = {
  // Request persistent storage so the browser won't auto-evict our data
  async requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist();
        console.log(`[SoundAura] Persistent storage ${granted ? 'granted ✅' : 'denied ❌'}`);
        return granted;
      } catch (e) {
        console.warn('[SoundAura] Storage persistence check failed:', e);
        return false;
      }
    }
    return false;
  },

  async getLikedSongs() {
    try {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_LIKED], 'readonly');
        const store = transaction.objectStore(STORE_LIKED);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const results = request.result || [];
          // If IndexedDB is empty, try restoring from localStorage backup
          if (results.length === 0) {
            const backup = lsGet(LS_LIKED_KEY);
            if (backup.length > 0) {
              console.log('[SoundAura] Restoring liked songs from backup...');
              // Restore to IndexedDB asynchronously
              backup.forEach(s => Storage.addLikedSong(s).catch(() => {}));
              resolve(backup);
              return;
            }
          }
          resolve(results);
        };
        request.onerror = () => {
          // Fallback to localStorage if IndexedDB fails
          resolve(lsGet(LS_LIKED_KEY));
        };
      });
    } catch {
      return lsGet(LS_LIKED_KEY);
    }
  },
  
  async addLikedSong(song) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_LIKED], 'readwrite');
      const store = transaction.objectStore(STORE_LIKED);
      const request = store.put(song);
      
      request.onsuccess = () => {
        // Also backup to localStorage
        Storage.getLikedSongs().then(all => lsSet(LS_LIKED_KEY, all)).catch(() => {});
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  async removeLikedSong(songId) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_LIKED], 'readwrite');
      const store = transaction.objectStore(STORE_LIKED);
      const request = store.delete(songId);
      
      request.onsuccess = () => {
        // Update localStorage backup
        Storage.getLikedSongs().then(all => lsSet(LS_LIKED_KEY, all)).catch(() => {});
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  async getRecentlyPlayed() {
    try {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_RECENT], 'readonly');
        const store = transaction.objectStore(STORE_RECENT);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const results = request.result || [];
          if (results.length === 0) {
            const backup = lsGet(LS_RECENT_KEY);
            if (backup.length > 0) {
              backup.forEach(s => Storage.addRecentlyPlayed(s).catch(() => {}));
              resolve(backup);
              return;
            }
          }
          resolve(results);
        };
        request.onerror = () => resolve(lsGet(LS_RECENT_KEY));
      });
    } catch {
      return lsGet(LS_RECENT_KEY);
    }
  },
  
  async addRecentlyPlayed(song) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_RECENT], 'readwrite');
      const store = transaction.objectStore(STORE_RECENT);
      const request = store.put(song);
      
      request.onsuccess = () => {
        Storage.getRecentlyPlayed().then(all => lsSet(LS_RECENT_KEY, all.slice(0, 12))).catch(() => {});
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  async clearRecentlyPlayed() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_RECENT], 'readwrite');
      const store = transaction.objectStore(STORE_RECENT);
      const request = store.clear();
      
      request.onsuccess = () => {
        try { localStorage.removeItem(LS_RECENT_KEY); } catch {}
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  async getDownloadedSongs() {
    try {
      const database = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_DOWNLOADS], 'readonly');
        const store = transaction.objectStore(STORE_DOWNLOADS);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  },
  
  async addDownloadedSong(song) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_DOWNLOADS], 'readwrite');
      const store = transaction.objectStore(STORE_DOWNLOADS);
      const request = store.put(song);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async removeDownloadedSong(songId) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_DOWNLOADS], 'readwrite');
      const store = transaction.objectStore(STORE_DOWNLOADS);
      const request = store.delete(songId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Export all liked songs as JSON for manual backup
  async exportBackup() {
    const liked = await Storage.getLikedSongs();
    const recent = await Storage.getRecentlyPlayed();
    const data = { liked, recent, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soundaura-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Import backup from JSON file
  async importBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.liked && Array.isArray(data.liked)) {
            for (const song of data.liked) {
              await Storage.addLikedSong(song);
            }
          }
          if (data.recent && Array.isArray(data.recent)) {
            for (const song of data.recent) {
              await Storage.addRecentlyPlayed(song);
            }
          }
          resolve({ likedCount: data.liked?.length || 0, recentCount: data.recent?.length || 0 });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
};
