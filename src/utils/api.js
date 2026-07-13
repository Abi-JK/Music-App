import { API, SEARCH } from './constants';
import { decodeHtml, parseDuration, toProxiedStream, formatLyrics } from './helpers';

// CORS proxy fallback — when edge functions aren't deployed, JioSaavn blocks browser requests
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// ─── Safe JSON fetch: tries primary URL, falls back to CORS proxies ──────────
async function safeJsonFetch(primaryUrl, fallbackUrls, signal) {
  // Try primary URL first
  try {
    const res = await fetch(primaryUrl, { signal });
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) {
      throw new Error('Got HTML instead of JSON');
    }
    return JSON.parse(text);
  } catch { /* try proxies */ }

  if (signal?.aborted) throw new Error('Aborted');

  // Try CORS proxy fallbacks
  for (const makeUrl of fallbackUrls) {
    try {
      const proxyUrl = makeUrl(primaryUrl);
      const res = await fetch(proxyUrl, { signal });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) continue;
      return JSON.parse(text);
    } catch { /* next proxy */ }
  }
  throw new Error('All API endpoints failed');
}

// ─── Normalize a song from the main JioSaavn API search results ──────────────
function normSong(s) {
  const mi = s.more_info || {};
  const primary = decodeHtml(s.primary_artists || mi.singers || '');
  const image = (s.image || '').replace('150x150', '500x500');
  return {
    id: s.id,
    title: decodeHtml(s.song || s.title || 'Unknown'),
    artist: primary || 'Unknown Artist',
    singers: primary,
    album: decodeHtml(s.album || ''),
    year: s.year || '',
    duration: parseDuration(s.duration),
    coverUrl: image || null,
    audioUrl: null,
    quality: '320kbps',
    language: s.language || '',
    label: decodeHtml(s.label || ''),
    copyright: '',
    hasLyrics: s.has_lyrics === 'true' || s.has_lyrics === true,
  };
}

// ─── Normalize a song from the getDetails endpoint ───────────────────────────
function normDetail(d) {
  const primary = decodeHtml(d.primary_artists || '');
  const image = (d.image || '').replace('150x150', '500x500');
  return {
    id: d.id,
    title: decodeHtml(d.song || d.name || 'Unknown'),
    artist: primary || 'Unknown Artist',
    singers: primary,
    album: decodeHtml(d.album || ''),
    year: d.year || '',
    duration: parseDuration(d.duration),
    coverUrl: image || null,
    audioUrl: null,
    quality: '320kbps',
    language: d.language || '',
    label: decodeHtml(d.label || ''),
    copyright: decodeHtml(d.copyright_text || ''),
    hasLyrics: d.has_lyrics === 'true' || d.has_lyrics === true,
    mediaPreview: d.media_preview_url || null,
  };
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────
export async function searchSongs(query, limit = 80) {
  const primaryUrl = `${API}?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&ctx=web6dot0&p=1&n=${limit}`;
  try {
    const j = await safeJsonFetch(primaryUrl, CORS_PROXIES);
    return (j.results || []).map(normSong);
  } catch {
    return [];
  }
}

// ─── PLAYBACK: Get fresh signed stream URL ───────────────────────────────────
export async function getStreamUrl(songId, signal) {
  const detailsUrl = `${API}?__call=song.getDetails&pids=${songId}&_format=json&_marker=0&ctx=web6dot0`;
  const tokenBaseUrl = `${API}?__call=song.generateAuthToken&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`;

  let detJson;
  try {
    detJson = await safeJsonFetch(detailsUrl, CORS_PROXIES, signal);
  } catch {
    detJson = await safeJsonFetch(detailsUrl, CORS_PROXIES, signal);
  }
  const detail = detJson.songs?.[0];
  if (!detail) throw new Error('Song not found');

  const tokenUrl = `${tokenBaseUrl}&url=${encodeURIComponent(detail.encrypted_media_url)}`;
  let tokJson;
  try {
    tokJson = await safeJsonFetch(tokenUrl, CORS_PROXIES, signal);
  } catch {
    tokJson = await safeJsonFetch(tokenUrl, CORS_PROXIES, signal);
  }
  const authUrl = tokJson.auth_url;
  if (!authUrl) throw new Error('No auth_url');

  return {
    ...normDetail(detail),
    audioUrl: authUrl,
    streamUrl: toProxiedStream(authUrl),
  };
}

// ─── ALBUM SONGS ─────────────────────────────────────────────────────────────
export async function searchAlbumSongs(albumName, limit = 80) {
  const songs = await searchSongs(albumName, limit);
  const lower = albumName.toLowerCase();
  return songs.filter(s => s.album?.toLowerCase().includes(lower));
}

// ─── LYRICS ──────────────────────────────────────────────────────────────────
export async function fetchLyrics(songId) {
  try {
    const j = await safeJsonFetch(`${SEARCH}/lyrics?id=${songId}`, CORS_PROXIES);
    const f = formatLyrics(j.data?.lyrics || j.lyrics);
    if (f) return f;
  } catch { /* fall through */ }

  try {
    const j = await safeJsonFetch(
      `${API}?__call=lyrics.getLyrics&lyrics_id=${songId}&_format=json&_marker=0&ctx=web6dot0`,
      CORS_PROXIES
    );
    const f = formatLyrics(j.lyrics);
    if (f) return f;
  } catch { /* lyrics are optional */ }

  return null;
}

// ─── DOWNLOAD: fetch blob through proxy ──────────────────────────────────────
export async function fetchStreamBlob(authUrl) {
  const proxied = toProxiedStream(authUrl);
  try {
    const r = await fetch(proxied);
    if (r.ok) return await r.blob();
  } catch { /* fall through */ }
  try {
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(authUrl)}`);
    if (r.ok) return await r.blob();
  } catch { /* exhausted */ }
  throw new Error('Could not fetch audio blob');
}
