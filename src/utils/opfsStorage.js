// ---------------------------------------------------------------------------
// SoundAura — OPFS Storage (independent from Chrome IndexedDB/localStorage)
// Uses Origin Private File System + Cache API for audio blobs
// Survives Chrome "Clear browsing data" in most cases
// ---------------------------------------------------------------------------

const CACHE_NAME = 'soundaura-audio-v1';
const META_DIR = 'meta';

function getRoot() {
  return navigator.storage.getDirectory();
}

async function ensureDir(parent, name) {
  try {
    return await parent.getDirectoryHandle(name, { create: true });
  } catch {
    return await parent.getDirectoryHandle(name, { create: true });
  }
}

async function writeFile(dir, fileName, data) {
  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(typeof data === 'string' ? data : JSON.stringify(data));
  await writable.close();
}

async function readFile(dir, fileName) {
  try {
    const handle = await dir.getFileHandle(fileName);
    const file = await handle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function deleteFile(dir, fileName) {
  try {
    await dir.removeEntry(fileName);
  } catch {}
}

async function listFiles(dir) {
  const names = [];
  for await (const [name] of dir) {
    names.push(name);
  }
  return names;
}

async function getMetaDir() {
  const root = await getRoot();
  return ensureDir(root, META_DIR);
}

export const OpfsStorage = {
  async isAvailable() {
    try {
      const root = await getRoot();
      await root.getDirectoryHandle('__test__', { create: false });
      return true;
    } catch {
      try {
        const root = await getRoot();
        const test = await root.getDirectoryHandle('__test_opfs__', { create: true });
        await root.removeEntry('__test_opfs__');
        return true;
      } catch {
        return false;
      }
    }
  },

  async saveJson(key, data) {
    try {
      const dir = await getMetaDir();
      await writeFile(dir, `${key}.json`, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn(`[OPFS] saveJson(${key}) failed:`, e);
      return false;
    }
  },

  async loadJson(key) {
    try {
      const dir = await getMetaDir();
      const raw = await readFile(dir, `${key}.json`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`[OPFS] loadJson(${key}) failed:`, e);
      return null;
    }
  },

  async removeJson(key) {
    try {
      const dir = await getMetaDir();
      await deleteFile(dir, `${key}.json`);
    } catch {}
  },

  async saveAudioBlob(songId, blob) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const url = new Request(`soundaura://audio/${songId}`);
      const response = new Response(blob, {
        headers: { 'Content-Type': blob.type || 'audio/mpeg', 'X-Song-Id': songId }
      });
      await cache.put(url, response);
      return true;
    } catch (e) {
      console.warn(`[OPFS] saveAudioBlob(${songId}) failed:`, e);
      return false;
    }
  },

  async loadAudioBlob(songId) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const url = new Request(`soundaura://audio/${songId}`);
      const response = await cache.match(url);
      if (response) return await response.blob();
      return null;
    } catch {
      return null;
    }
  },

  async removeAudioBlob(songId) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const url = new Request(`soundaura://audio/${songId}`);
      await cache.delete(url);
    } catch {}
  },

  async getLikedSongs() { return (await this.loadJson('liked')) || []; },
  async saveLikedSongs(songs) { return this.saveJson('liked', songs); },

  async getRecentlyPlayed() { return (await this.loadJson('recent')) || []; },
  async saveRecentlyPlayed(songs) { return this.saveJson('recent', songs.slice(0, 12)); },

  async getDownloadedSongs() { return (await this.loadJson('downloads')) || []; },
  async saveDownloadedSongs(songs) { return this.saveJson('downloads', songs); },

  async exportAll() {
    const liked = await this.getLikedSongs();
    const recent = await this.getRecentlyPlayed();
    const downloads = await this.getDownloadedSongs();
    return { liked, recent, downloads, exportedAt: new Date().toISOString(), version: 'opfs-v1' };
  },

  async importAll(data) {
    if (data.liked) await this.saveLikedSongs(data.liked);
    if (data.recent) await this.saveRecentlyPlayed(data.recent);
    if (data.downloads) await this.saveDownloadedSongs(data.downloads);
    return true;
  },

  async clearAll() {
    try {
      const dir = await getMetaDir();
      for (const name of await listFiles(dir)) {
        await deleteFile(dir, name);
      }
    } catch {}
    try {
      await caches.delete(CACHE_NAME);
    } catch {}
  }
};
