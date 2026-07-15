// IndexedDB wrapper for persistent storage
const DB_NAME = 'SoundAuraDB';
const DB_VERSION = 1;
const STORE_LIKED = 'likedSongs';
const STORE_RECENT = 'recentlyPlayed';
const STORE_DOWNLOADS = 'downloadedSongs';

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

export const Storage = {
  async getLikedSongs() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_LIKED], 'readonly');
      const store = transaction.objectStore(STORE_LIKED);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },
  
  async addLikedSong(song) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_LIKED], 'readwrite');
      const store = transaction.objectStore(STORE_LIKED);
      const request = store.put(song);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async removeLikedSong(songId) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_LIKED], 'readwrite');
      const store = transaction.objectStore(STORE_LIKED);
      const request = store.delete(songId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  
  async getRecentlyPlayed() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_RECENT], 'readonly');
      const store = transaction.objectStore(STORE_RECENT);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },
  
  async addRecentlyPlayed(song) {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_RECENT], 'readwrite');
      const store = transaction.objectStore(STORE_RECENT);
      const request = store.put(song);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  
  async clearRecentlyPlayed() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_RECENT], 'readwrite');
      const store = transaction.objectStore(STORE_RECENT);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  
  async getDownloadedSongs() {
    const database = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_DOWNLOADS], 'readonly');
      const store = transaction.objectStore(STORE_DOWNLOADS);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
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
  }
};
