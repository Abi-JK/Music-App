// IndexedDB wrapper for persistent storage
const DB_NAME = 'SoundAuraDB';
const DB_VERSION = 1;
const STORE_LIKED = 'likedSongs';
const STORE_RECENT = 'recentlyPlayed';
const STORE_DOWNLOADS = 'downloadedSongs';

// LocalStorage backup keys (secondary persistence layer)
const LS_LIKED_KEY = 'soundaura_liked_backup';
const LS_RECENT_KEY = 'soundaura_recent_backup';
const LS_DOWNLOADS_KEY = 'soundaura_downloads_backup';

// Bump this whenever the audio backend changes in a way that makes
// previously cached song objects (old audioUrl/id format) unplayable.
// Older cached data (liked/recent/downloads) from a prior backend is
// wiped automatically on first load after an update, instead of sitting
// around as silently-broken entries that fail to play.
const BACKEND_VERSION = 'saavn-v2';
const BACKEND_VERSION_KEY = 'soundaura_backend_version';

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
  // Wipes cached liked/recent/downloaded songs if they came from a previous,
  // incompatible audio backend (e.g. dead JioSaavn URLs after switching to
  // Audius). Safe to call every app load — it's a no-op once versions match.
  async migrateIfNeeded() {
    try {
      const stored = localStorage.getItem(BACKEND_VERSION_KEY);
      if (stored === BACKEND_VERSION) return false;

      console.log('[SoundAura] Audio backend changed — migrating cached songs...');
      const database = await getDB();

      // Backup existing data before migration
      const backupLiked = await new Promise(resolve => {
        try {
          const tx = database.transaction([STORE_LIKED], 'readonly');
          const req = tx.objectStore(STORE_LIKED).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch { resolve([]); }
      });

      const backupRecent = await new Promise(resolve => {
        try {
          const tx = database.transaction([STORE_RECENT], 'readonly');
          const req = tx.objectStore(STORE_RECENT).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch { resolve([]); }
      });

      // Save backup to localStorage before clearing
      if (backupLiked.length > 0) lsSet(LS_LIKED_KEY, backupLiked);
      if (backupRecent.length > 0) lsSet(LS_RECENT_KEY, backupRecent.slice(0, 12));

      // Clear IndexedDB stores — but NEVER clear downloads (large audio blobs)
      await Promise.all([STORE_LIKED, STORE_RECENT].map(storeName =>
        new Promise((resolve) => {
          try {
            const tx = database.transaction([storeName], 'readwrite');
            const req = tx.objectStore(storeName).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
          } catch { resolve(); }
        })
      ));

      localStorage.setItem(BACKEND_VERSION_KEY, BACKEND_VERSION);
      return true;
    } catch (e) {
      console.warn('[SoundAura] Migration check failed:', e);
      return false;
    }
  },

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
      
      request.onsuccess = () => {
        // Backup metadata (without blob) to localStorage
        Storage.getDownloadedSongs().then(all => {
          const slim = all.map(s => ({
            id: s.id, title: s.title, artist: s.artist,
            album: s.album, duration: s.duration,
            coverUrl: s.coverUrl, audioUrl: s.audioUrl,
          }));
          try { localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(slim)); } catch {}
        }).catch(() => {});
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  },
  
  async removeDownloadedSong(songId) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_DOWNLOADS], 'readwrite');
      const store = transaction.objectStore(STORE_DOWNLOADS);
      const request = store.delete(songId);
      
      request.onsuccess = () => {
        // Update localStorage backup
        Storage.getDownloadedSongs().then(all => {
          const slim = all.map(s => ({
            id: s.id, title: s.title, artist: s.artist,
            album: s.album, duration: s.duration,
            coverUrl: s.coverUrl, audioUrl: s.audioUrl,
          }));
          try { localStorage.setItem(LS_DOWNLOADS_KEY, JSON.stringify(slim)); } catch {}
        }).catch(() => {});
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  // Export all liked songs as JSON for manual backup
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
          if (data.downloads && Array.isArray(data.downloads)) {
            for (const song of data.downloads) {
              // Only restore metadata (no audio blob available in backup)
              const database = await getDB();
              const tx = database.transaction([STORE_DOWNLOADS], 'readwrite');
              const store = tx.objectStore(STORE_DOWNLOADS);
              store.put(song);
            }
          }
          resolve({ likedCount: data.liked?.length || 0, recentCount: data.recent?.length || 0, downloadsCount: data.downloads?.length || 0 });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
};
