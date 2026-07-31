/* src/utils/cloudSync.js
 * Cloud backup & restore via Netlify Blobs (/api/user-data).
 * Purpose: user data (liked, recent, downloads, custom songs) lives on the
 * server so that clearing Chrome data/cache does NOT wipe the app's data.
 * Each install gets a backup code (SA-XXXX-XXXX). The app auto-syncs to the
 * server. After Chrome data is cleared, the user re-enters the code in the
 * app to restore everything. */

import { OpfsStorage } from './opfsStorage';

const API = '/api/user-data';
const LS_CODE_KEY = 'soundaura_backup_code';
const LS_UPLOADED_KEY = 'soundaura_cloud_audio';
const LS_LAST_SYNC_KEY = 'soundaura_last_sync';
const LS_AUDIO_BACKUP_KEY = 'soundaura_cloud_audio_enabled';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function gen(n) {
  let out = '';
  const rand = new Uint32Array(n);
  crypto.getRandomValues(rand);
  for (let i = 0; i < n; i++) out += CODE_ALPHABET[rand[i] % CODE_ALPHABET.length];
  return out;
}

export function generateBackupCode() {
  return `SA-${gen(4)}-${gen(4)}`;
}

export function normalizeCode(input) {
  if (!input) return null;
  const code = String(input).toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  if (!/^SA[A-Z0-9]{8}$/.test(code)) return null;
  return `${code.slice(0, 2)}-${code.slice(2, 6)}-${code.slice(6, 10)}`;
}

async function fetchWithTimeout(url, options, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export const CloudSync = {
  async getDeviceCode() {
    try {
      const saved = await OpfsStorage.loadJson('backup-code');
      if (saved && saved.code) return saved.code;
    } catch {}
    try {
      const ls = localStorage.getItem(LS_CODE_KEY);
      if (ls) return normalizeCode(ls) || null;
    } catch {}
    return null;
  },

  async saveDeviceCode(code) {
    const normalized = normalizeCode(code);
    if (!normalized) return false;
    await OpfsStorage.saveJson('backup-code', { code: normalized });
    try { localStorage.setItem(LS_CODE_KEY, normalized); } catch {}
    return true;
  },

  async clearDeviceCode() {
    await OpfsStorage.removeJson('backup-code');
    try { localStorage.removeItem(LS_CODE_KEY); } catch {}
  },

  isAudioBackupEnabled() {
    try { return localStorage.getItem(LS_AUDIO_BACKUP_KEY) !== '0'; } catch { return true; }
  },

  setAudioBackupEnabled(enabled) {
    try { localStorage.setItem(LS_AUDIO_BACKUP_KEY, enabled ? '1' : '0'); } catch {}
  },

  getLastSync() {
    try { return localStorage.getItem(LS_LAST_SYNC_KEY) || null; } catch { return null; }
  },

  async getUploadedAudioSet(code) {
    try {
      const ls = JSON.parse(localStorage.getItem(LS_UPLOADED_KEY) || '{}');
      if (Array.isArray(ls[code])) return new Set(ls[code]);
    } catch {}
    try {
      const opfs = await OpfsStorage.loadJson('cloud-audio-uploaded');
      if (opfs && Array.isArray(opfs[code])) return new Set(opfs[code]);
    } catch {}
    return new Set();
  },

  async setUploadedAudioSet(code, ids) {
    try {
      const ls = JSON.parse(localStorage.getItem(LS_UPLOADED_KEY) || '{}');
      ls[code] = [...ids];
      localStorage.setItem(LS_UPLOADED_KEY, JSON.stringify(ls));
    } catch {}
    try {
      const opfs = await OpfsStorage.loadJson('cloud-audio-uploaded') || {};
      opfs[code] = [...ids];
      await OpfsStorage.saveJson('cloud-audio-uploaded', opfs);
    } catch {}
  },

  /* ---- metadata ---- */

  async uploadMeta(code, meta) {
    const body = {
      liked: meta.liked || [],
      recent: meta.recent || [],
      downloads: (meta.downloads || []).map(slimSong),
      custom: (meta.custom || []).map(slimSong),
    };
    const res = await fetchWithTimeout(`${API}?code=${encodeURIComponent(code)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 15000);
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const data = await res.json();
    try { localStorage.setItem(LS_LAST_SYNC_KEY, data.savedAt || new Date().toISOString()); } catch {}
    return data;
  },

  async fetchMeta(code) {
    const res = await fetchWithTimeout(`${API}?code=${encodeURIComponent(code)}`, {}, 15000);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();
    return data.data || null;
  },

  /* ---- audio blobs ---- */

  async uploadAudio(code, songId, blob) {
    const res = await fetchWithTimeout(`${API}?code=${encodeURIComponent(code)}&audio=${encodeURIComponent(songId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: blob,
    }, 20000);
    if (!res.ok) throw new Error(`Audio upload failed: ${res.status}`);
    return true;
  },

  async fetchAudio(code, songId) {
    const res = await fetchWithTimeout(`${API}?code=${encodeURIComponent(code)}&audio=${encodeURIComponent(songId)}`, {}, 20000);
    if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);
    return await res.blob();
  },

  async deleteRemoteAudio(code, songId) {
    try {
      await fetchWithTimeout(`${API}?code=${encodeURIComponent(code)}&audio=${encodeURIComponent(songId)}`, {
        method: 'DELETE',
      }, 10000);
    } catch {}
  },

  async deleteAllRemote(code) {
    try {
      await fetchWithTimeout(`${API}?code=${encodeURIComponent(code)}&all=1`, {
        method: 'DELETE',
      }, 10000);
    } catch {}
  },
};

/* Strip heavy fields (audioBlob, custom file refs) before sending metadata. */
function slimSong(s) {
  if (!s) return null;
  const out = { ...s };
  delete out.audioBlob;
  delete out._customFile;
  return out;
}
