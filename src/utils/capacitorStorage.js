import { Preferences } from '@capacitor/preferences';

const isNative = () => {
  try {
    return window.Capacitor && window.Capacitor.isNativePlatform();
  } catch { return false; }
};

export const CapacitorStorage = {
  isNative,

  async setItem(key, value) {
    if (!isNative()) return false;
    try {
      await Preferences.set({ key, value: typeof value === 'string' ? value : JSON.stringify(value) });
      return true;
    } catch { return false; }
  },

  async getItem(key) {
    if (!isNative()) return null;
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch { return null; }
  },

  async removeItem(key) {
    if (!isNative()) return;
    try { await Preferences.remove({ key }); } catch {}
  },

  async setJSON(key, data) {
    return this.setItem(key, JSON.stringify(data));
  },

  async getJSON(key) {
    const raw = await this.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  async clear() {
    if (!isNative()) return;
    try { await Preferences.clear(); } catch {}
  },

  async keys() {
    if (!isNative()) return [];
    try { const { keys } = await Preferences.keys(); return keys; } catch { return []; }
  },

  async exportAll() {
    if (!isNative()) return {};
    const { keys: allKeys } = await Preferences.keys();
    const data = {};
    for (const key of allKeys) {
      data[key] = await this.getItem(key);
    }
    return data;
  },
};
