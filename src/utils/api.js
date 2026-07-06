import { API, SEARCH } from './constants';
import { decodeHtml, parseDuration, toProxiedStream, normVercelSong, formatLyrics } from './helpers';

// ─── CORE API: Get fresh signed stream URL ───────────────────────────────────
export async function getStreamUrl(songId, signal) {
  const detRes = await fetch(
    `${API}?__call=song.getDetails&pids=${songId}&_format=json&_marker=0&ctx=web6dot0`,
    { signal }
  );
  if (!detRes.ok) throw new Error(`Song details failed: ${detRes.status}`);
  const detJson = await detRes.json();
  const detail  = detJson.songs?.[0];
  if (!detail) throw new Error('Song not found in API response');

  const encUrl   = encodeURIComponent(detail.encrypted_media_url);
  const tokRes   = await fetch(
    `${API}?__call=song.generateAuthToken&url=${encUrl}&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`,
    { signal }
  );
  if (!tokRes.ok) throw new Error(`Auth token failed: ${tokRes.status}`);
  const tokJson  = await tokRes.json();
  const authUrl  = tokJson.auth_url;
  if (!authUrl) throw new Error('No auth_url in token response');

  const streamUrl = toProxiedStream(authUrl);

  const primary = decodeHtml(detail.primary_artists || '');
  const image   = (detail.image || '').replace('150x150', '500x500');
  const song = {
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

  return song;
}

// ─── SEARCH API ──────────────────────────────────────────────────────────────
export const searchSongs = async (query, limit = 24) => {
  const res = await fetch(
    `${SEARCH}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const j = await res.json();
  return (j.data?.results || j.results || []).map(normVercelSong);
};

// ─── LYRICS API ──────────────────────────────────────────────────────────────
export const fetchLyrics = async (songId) => {
  try {
    const res = await fetch(`${SEARCH}/lyrics?id=${songId}`);
    if (res.ok) {
      const j = await res.json();
      const raw = j.data?.lyrics || j.lyrics;
      const f = formatLyrics(raw);
      if (f) return f;
    }
  } catch {
    // Silently fail — lyrics are optional
  }
  return null;
};

// ─── DOWNLOAD: fetch blob through proxy ──────────────────────────────────────
export async function fetchStreamBlob(authUrl) {
  const proxied = toProxiedStream(authUrl);
  try {
    const r = await fetch(proxied);
    if (r.ok) return await r.blob();
    console.warn('Proxy fetch status:', r.status);
  } catch (e) {
    console.warn('Proxy fetch error:', e.message);
  }
  // Fallback: try corsproxy.io
  try {
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(authUrl)}`);
    if (r.ok) return await r.blob();
  } catch { /* exhausted fallbacks */ }
  throw new Error('Could not fetch audio blob');
}
