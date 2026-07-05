import { STREAM } from './constants';

// ─── FORMATTERS ──────────────────────────────────────────────────────────────
export const fmt = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

export function decodeHtml(text) {
  if (!text) return '';
  const el = document.createElement('textarea');
  el.innerHTML = String(text);
  return el.value;
}

export function parseDuration(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.includes(':')) {
    const [m, s] = val.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

// Convert any web.saavncdn.com stream URL to go through local proxy
export function toProxiedStream(url) {
  if (!url) return null;
  if (url.startsWith('blob:') || url.startsWith('/')) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'web.saavncdn.com') {
      return `${STREAM}${u.pathname}${u.search}`;
    }
    return url;
  } catch {
    return url;
  }
}

export function pickBestCover(s) {
  if (s.images?.['500x500']) return s.images['500x500'];
  if (typeof s.image === 'string') return s.image.replace('150x150', '500x500');
  const imgs = s.image || [];
  return imgs.find(i => i.quality === '500x500')?.link
    || imgs.find(i => i.quality === '150x150')?.link
    || imgs[imgs.length - 1]?.link
    || null;
}

// Normalize a song returned by the Vercel search API
export function normVercelSong(s) {
  const primary  = decodeHtml(s.primaryArtists || s.primary_artists || '');
  const featured = decodeHtml(s.featuredArtists || '');
  const singers  = [primary, featured].filter(Boolean).join(', ');
  return {
    id:        s.id,
    title:     decodeHtml(s.name || s.song || s.title || 'Unknown'),
    artist:    primary || 'Unknown Artist',
    singers:   singers || primary,
    album:     decodeHtml(s.album?.name || s.album || ''),
    year:      s.year || '',
    duration:  parseDuration(s.duration),
    coverUrl:  pickBestCover(s),
    audioUrl:  null,
    quality:   '320kbps',
    language:  s.language || '',
    label:     decodeHtml(s.label || ''),
    copyright: decodeHtml(s.copyright || s.copyright_text || ''),
    hasLyrics: s.hasLyrics === 'true' || s.hasLyrics === true,
  };
}

export function formatLyrics(raw) {
  if (!raw) return null;
  let text = decodeHtml(String(raw))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\uFFFD/g, "'")
    .trim();
  if (!text.includes('\n')) text = text.replace(/\s{2,}/g, '\n');
  return text.split('\n').map(l => l.trim()).filter(Boolean).join('\n') || null;
}

// ─── LOCAL STORAGE ───────────────────────────────────────────────────────────
export const LS = {
  get: (k, fb = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set: (k, v)        => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── WAV ENCODER ─────────────────────────────────────────────────────────────
export function audioBufferToWav(buf) {
  const numCh = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
  const bps = 16, br = sr * numCh * 2, ba = numCh * 2, ds = n * numCh * 2;
  const ab = new ArrayBuffer(44 + ds), v = new DataView(ab);
  const ws = (off, str) => { for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + ds, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
  v.setUint32(24, sr, true); v.setUint32(28, br, true); v.setUint16(32, ba, true); v.setUint16(34, bps, true);
  ws(36, 'data'); v.setUint32(40, ds, true);
  let off = 44;
  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2;
    }
  }
  return ab;
}
