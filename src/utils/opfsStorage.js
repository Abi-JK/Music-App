const META_DIR = 'meta';
const AUDIO_DIR = 'audio';

function getRoot() {
  return navigator.storage.getDirectory();
}

async function ensureDir(parent, name) {
  return await parent.getDirectoryHandle(name, { create: true });
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

async function getAudioDir() {
  const root = await getRoot();
  return ensureDir(root, AUDIO_DIR);
}

export const OpfsStorage = {
  async isAvailable() {
    try {
      const root = await getRoot();
      await root.getDirectoryHandle('__test_opfs__', { create: true });
      await root.removeEntry('__test_opfs__');
      return true;
    } catch {
      return false;
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
      const dir = await getAudioDir();
      const handle = await dir.getFileHandle(songId, { create: true });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (e) {
      console.warn(`[OPFS] saveAudioBlob(${songId}) failed:`, e);
      return false;
    }
  },

  async loadAudioBlob(songId) {
    try {
      const dir = await getAudioDir();
      const handle = await dir.getFileHandle(songId);
      const file = await handle.getFile();
      return file;
    } catch {
      return null;
    }
  },

  async removeAudioBlob(songId) {
    try {
      const dir = await getAudioDir();
      await deleteFile(dir, songId);
    } catch {}
  },

  async getLikedSongs() { return (await this.loadJson('liked')) || []; },
  async saveLikedSongs(songs) { return this.saveJson('liked', songs); },

  async getRecentlyPlayed() { return (await this.loadJson('recent')) || []; },
  async saveRecentlyPlayed(songs) { return this.saveJson('recent', songs.slice(0, 12)); },

  async getDownloadedSongs() { return (await this.loadJson('downloads')) || []; },
  async saveDownloadedSongs(songs) { return this.saveJson('downloads', songs); },

  async getCustomSongs() { return (await this.loadJson('custom')) || []; },
  async saveCustomSongs(songs) { return this.saveJson('custom', songs); },

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
      const dir = await getAudioDir();
      for (const name of await listFiles(dir)) {
        await deleteFile(dir, name);
      }
    } catch {}
  }
};
