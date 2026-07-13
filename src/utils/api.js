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

// ─── Normalize a song from the main JioSaavn API search results ──────────────
function normJioSaavnSearchSong(s) {
  const mi = s.more_info || {};
  const primary = decodeHtml(s.primary_artists || s.singers || mi.singers || '');
  const image   = (s.image || '').replace('150x150', '500x500');
  return {
    id:        s.id,
    title:     decodeHtml(s.song || s.title || 'Unknown'),
    artist:    primary || 'Unknown Artist',
    singers:   primary,
    album:     decodeHtml(s.album || ''),
    year:      s.year || '',
    duration:  parseDuration(s.duration),
    coverUrl:  image || null,
    audioUrl:  null,
    quality:   '320kbps',
    language:  s.language || '',
    label:     decodeHtml(s.label || ''),
    copyright: '',
    hasLyrics: s.has_lyrics === 'true' || s.has_lyrics === true,
  };
}

// ─── SEARCH: Try Vercel API first, fallback to main JioSaavn API ─────────────
export const searchSongs = async (query, limit = 24) => {
  // Try Vercel search API
  try {
    const res = await fetch(
      `${SEARCH}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (res.ok) {
      const j = await res.json();
      const results = (j.data?.results || j.results || []).map(normVercelSong);
      if (results.length > 0) return results;
    }
  } catch { /* fall through */ }

  // Fallback: main JioSaavn API
  try {
    const res = await fetch(
      `${API}?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&ctx=web6dot0&p=1&n=${limit}`
    );
    if (res.ok) {
      const j = await res.json();
      const results = (j.results || []).map(normJioSaavnSearchSong);
      if (results.length > 0) return results;
    }
  } catch { /* fall through */ }

  return [];
};

// ─── SEARCH with multiple variations for maximum results ──────────────────────
export const searchSongsDeep = async (query, limit = 40) => {
  const variations = [
    query,
    `${query} songs`,
    `${query} hits`,
  ];
  const results = await Promise.all(
    variations.map(q => searchSongs(q, limit).catch(() => []))
  );
  const seen = new Set();
  return results.flat().filter(s => {
    if (!s?.id || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
};

// ─── LYRICS API ──────────────────────────────────────────────────────────────
export const fetchLyrics = async (songId) => {
  // Try Vercel search API first
  try {
    const res = await fetch(`${SEARCH}/lyrics?id=${songId}`);
    if (res.ok) {
      const j = await res.json();
      const raw = j.data?.lyrics || j.lyrics;
      const f = formatLyrics(raw);
      if (f) return f;
    }
  } catch {
    // fall through to next source
  }
  // Fallback: fetch via main JioSaavn API
  try {
    const res = await fetch(
      `${API}?__call=lyrics.getLyrics&lyrics_id=${songId}&_format=json&_marker=0&ctx=web6dot0`
    );
    if (res.ok) {
      const j = await res.json();
      const raw = j.lyrics || '';
      if (raw) {
        const f = formatLyrics(raw);
        if (f) return f;
      }
    }
  } catch {
    // lyrics are optional
  }
  return null;
};

// ─── ALBUM SEARCH ────────────────────────────────────────────────────────────
export const searchAlbums = async (query, limit = 10) => {
  const res = await fetch(
    `${SEARCH}/search/albums?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Album search failed: ${res.status}`);
  const j = await res.json();
  return (j.data?.results || j.results || []).map(normalizeAlbum);
};

export const getAlbumSongs = async (albumId) => {
  const res = await fetch(`${SEARCH}/albums?id=${albumId}`);
  if (!res.ok) throw new Error(`Album fetch failed: ${res.status}`);
  const j = await res.json();
  const data = j.data || j;
  const songs = data.songs || [];
  return songs.map(normVercelSong);
};

// Search album by name — uses deep search for more results, then filters
export const searchAlbumSongs = async (albumName, limit = 40) => {
  const songs = await searchSongsDeep(albumName, limit);
  if (songs.length > 0) {
    const nameLower = albumName.toLowerCase();
    const exact = songs.filter(s => s.album?.toLowerCase().includes(nameLower));
    return exact.length >= 3 ? exact : songs;
  }
  return songs;
};

function normalizeAlbum(a) {
  return {
    id: a.id,
    name: a.name || a.title || '',
    image: a.image ? (typeof a.image === 'string' ? a.image.replace('150x150', '500x500') : '') : '',
    songCount: a.songCount || a.songs?.length || 0,
    year: a.year || '',
    primaryArtists: a.primaryArtists || a.artist || '',
    isVirtual: false,
    queryType: 'album',
  };
}

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
