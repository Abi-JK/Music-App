import { API, SEARCH } from './constants';
import { decodeHtml, parseDuration, toProxiedStream, normVercelSong, formatLyrics } from './helpers';

// Direct public mirror — used as a last-resort fallback if the same-origin
// proxy (Netlify Edge Function / Vite dev proxy) is unreachable.
const SAAVN_DEV_DIRECT = 'https://saavn.dev/api';

// ─── CORE API: Get fresh signed stream URL ───────────────────────────────────
// First tries the same-origin proxy (which injects the JioSaavn Referer
// header the API requires). If that fails, falls back to saavn.dev, which
// returns a ready-to-play downloadUrl list and does not need header spoofing.
export async function getStreamUrl(songId) {
  // Try official JioSaavn API via same-origin proxy
  try {
    return await getStreamUrlViaOfficial(songId);
  } catch (err) {
    console.warn('[getStreamUrl] official API failed, falling back to saavn.dev:', err.message);
  }
  return getStreamUrlViaSaavnDev(songId);
}

async function getStreamUrlViaOfficial(songId) {
  const detRes = await fetch(
    `${API}?__call=song.getDetails&pids=${songId}&_format=json&_marker=0&ctx=web6dot0`
  );
  if (!detRes.ok) throw new Error(`Song details failed: ${detRes.status}`);
  const detJson = await detRes.json();
  const detail  = detJson.songs?.[0] || detJson[songId];
  if (!detail) throw new Error('Song not found in API response');

  const encUrl   = encodeURIComponent(detail.encrypted_media_url);
  const tokRes   = await fetch(
    `${API}?__call=song.generateAuthToken&url=${encUrl}&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`
  );
  if (!tokRes.ok) throw new Error(`Auth token failed: ${tokRes.status}`);
  const tokJson  = await tokRes.json();
  const authUrl  = tokJson.auth_url;
  if (!authUrl) throw new Error('No auth_url in token response');

  const streamUrl = toProxiedStream(authUrl);
  const primary   = decodeHtml(detail.primary_artists || '');
  const image     = (detail.image || '').replace('150x150', '500x500');

  return {
    id:        detail.id,
    title:     decodeHtml(detail.song || detail.name || 'Unknown'),
    artist:    primary || 'Unknown Artist',
    singers:   primary,
    album:     decodeHtml(detail.album || ''),
    year:      detail.year || '',
    duration:  parseDuration(detail.duration),
    coverUrl:  image || null,
    audioUrl:  authUrl,
    streamUrl,
    quality:   '320kbps',
    language:  detail.language || '',
    label:     decodeHtml(detail.label || ''),
    copyright: decodeHtml(detail.copyright_text || ''),
    hasLyrics: detail.has_lyrics === 'true' || detail.has_lyrics === true,
    mediaPreview: detail.media_preview_url || null,
  };
}

async function getStreamUrlViaSaavnDev(songId) {
  const res = await fetch(`${SAAVN_DEV_DIRECT}/songs/${songId}`);
  if (!res.ok) throw new Error(`saavn.dev lookup failed: ${res.status}`);
  const j = await res.json();
  const d = j.data?.[0] || j.data;
  if (!d) throw new Error('Song not found on saavn.dev');

  // downloadUrl is an array of { quality, url } — pick 320kbps or best
  const dls = d.downloadUrl || d.download_url || [];
  const best =
    dls.find(x => x.quality === '320kbps') ||
    dls.find(x => x.quality === '160kbps') ||
    dls[dls.length - 1];
  const audioUrl = best?.url || best?.link;
  if (!audioUrl) throw new Error('No downloadable URL on saavn.dev response');

  const norm = normVercelSong(d);
  return {
    ...norm,
    audioUrl,
    streamUrl: toProxiedStream(audioUrl),
    quality: best?.quality || '320kbps',
  };
}

// ─── SEARCH API ──────────────────────────────────────────────────────────────
export const searchSongs = async (query, limit = 24) => {
  const doFetch = async (base) => {
    const res = await fetch(
      `${base}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    const j = await res.json();
    return (j.data?.results || j.results || []).map(normVercelSong);
  };
  try {
    return await doFetch(SEARCH);
  } catch (e) {
    console.warn('[searchSongs] proxy failed, trying direct saavn.dev:', e.message);
    return doFetch(SAAVN_DEV_DIRECT);
  }
};

// ─── LYRICS API ──────────────────────────────────────────────────────────────
export const fetchLyrics = async (songId) => {
  const tryBase = async (base) => {
    const res = await fetch(`${base}/songs/${songId}/lyrics`);
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json();
    const raw = j.data?.lyrics || j.lyrics;
    return formatLyrics(raw);
  };
  for (const base of [SEARCH, SAAVN_DEV_DIRECT]) {
    try {
      const f = await tryBase(base);
      if (f) return f;
    } catch { /* try next */ }
  }
  return null;
};

// ─── DOWNLOAD: fetch blob through proxy (with fallbacks) ─────────────────────
export async function fetchStreamBlob(authUrl) {
  const proxied = toProxiedStream(authUrl);
  // 1) same-origin proxy (Netlify Edge / Vite dev)
  try {
    const r = await fetch(proxied);
    if (r.ok) return await r.blob();
    console.warn('Proxy fetch status:', r.status);
  } catch (e) {
    console.warn('Proxy fetch error:', e.message);
  }
  // 2) direct — often works if the CDN allows the origin
  try {
    const r = await fetch(authUrl);
    if (r.ok) return await r.blob();
  } catch { /* ignore */ }
  // 3) corsproxy.io as absolute last resort
  try {
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(authUrl)}`);
    if (r.ok) return await r.blob();
  } catch { /* exhausted fallbacks */ }
  throw new Error('Could not fetch audio blob');
}
