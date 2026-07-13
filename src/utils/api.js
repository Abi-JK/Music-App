import { API, SEARCH } from './constants';
import { decodeHtml, parseDuration, toProxiedStream, normVercelSong, formatLyrics } from './helpers';

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
  try {
    const res = await fetch(
      `${API}?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&ctx=web6dot0&p=1&n=${limit}`
    );
    if (!res.ok) return [];
    const j = await res.json();
    return (j.results || []).map(normSong);
  } catch {
    return [];
  }
}

// ─── PLAYBACK: Get fresh signed stream URL ───────────────────────────────────
export async function getStreamUrl(songId, signal) {
  const fetchDetails = () =>
    fetch(`${API}?__call=song.getDetails&pids=${songId}&_format=json&_marker=0&ctx=web6dot0`, { signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

  const fetchToken = (encUrl) =>
    fetch(`${API}?__call=song.generateAuthToken&url=${encodeURIComponent(encUrl)}&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`, { signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });

  let detJson;
  try {
    detJson = await fetchDetails();
  } catch {
    detJson = await fetchDetails(); // retry once
  }
  const detail = detJson.songs?.[0];
  if (!detail) throw new Error('Song not found');

  let tokJson;
  try {
    tokJson = await fetchToken(detail.encrypted_media_url);
  } catch {
    tokJson = await fetchToken(detail.encrypted_media_url); // retry once
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
  // Try Vercel lyrics API first
  try {
    const res = await fetch(`${SEARCH}/lyrics?id=${songId}`);
    if (res.ok) {
      const j = await res.json();
      const f = formatLyrics(j.data?.lyrics || j.lyrics);
      if (f) return f;
    }
  } catch { /* fall through */ }

  // Fallback: main JioSaavn API
  try {
    const res = await fetch(
      `${API}?__call=lyrics.getLyrics&lyrics_id=${songId}&_format=json&_marker=0&ctx=web6dot0`
    );
    if (res.ok) {
      const j = await res.json();
      const f = formatLyrics(j.lyrics);
      if (f) return f;
    }
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
