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
  // Try Vercel API first
  let apiAlbums = [];
  try {
    const res = await fetch(
      `${SEARCH}/search/albums?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (res.ok) {
      const j = await res.json();
      apiAlbums = (j.data?.results || j.results || []).map(normalizeAlbum);
    }
  } catch { /* fall through */ }

  // If API returned enough albums, use them
  if (apiAlbums.length >= 2) return apiAlbums;

  // Fallback: search songs and create virtual albums from artists/query
  try {
    const songs = await searchSongs(query, 50);
    if (!songs.length) return apiAlbums;

    const virtualAlbums = [];
    const queryLC = query.toLowerCase();

    // 1) Virtual album for the search query itself (e.g. movie name)
    const querySongs = songs.filter(s =>
      s.album?.toLowerCase().includes(queryLC) ||
      s.title?.toLowerCase().includes(queryLC)
    );
    if (querySongs.length >= 2) {
      virtualAlbums.push({
        id: `virtual_query_${query.replace(/\s+/g, '_')}`,
        name: query,
        image: querySongs[0].coverUrl || '',
        songCount: querySongs.length,
        year: querySongs.find(s => s.year)?.year || '',
        primaryArtists: '',
        isVirtual: true,
        queryType: 'query',
        songs: querySongs,
      });
    }

    // 2) One virtual album per top artist (with 3+ songs in results)
    const artistGroups = {};
    songs.forEach(s => {
      const artist = s.artist || 'Unknown';
      if (!artistGroups[artist]) artistGroups[artist] = [];
      artistGroups[artist].push(s);
    });
    Object.entries(artistGroups)
      .filter(([, s]) => s.length >= 3)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 4)
      .forEach(([artist, s]) => {
        virtualAlbums.push({
          id: `virtual_artist_${artist.replace(/\s+/g, '_')}`,
          name: artist,
          image: s[0].coverUrl || '',
          songCount: s.length,
          year: s.find(s2 => s2.year)?.year || '',
          primaryArtists: artist,
          isVirtual: true,
          queryType: 'artist',
          songs: s,
        });
      });

    // Merge: API albums first, then virtual ones (avoid duplicates by name)
    const apiNames = new Set(apiAlbums.map(a => a.name.toLowerCase()));
    const merged = [...apiAlbums];
    virtualAlbums.forEach(va => {
      if (!apiNames.has(va.name.toLowerCase())) {
        merged.push(va);
        apiNames.add(va.name.toLowerCase());
      }
    });
    return merged;
  } catch {
    return apiAlbums;
  }
};

export const getAlbumSongs = async (albumId) => {
  const res = await fetch(`${SEARCH}/albums?id=${albumId}`);
  if (!res.ok) throw new Error(`Album fetch failed: ${res.status}`);
  const j = await res.json();
  const data = j.data || j;
  const songs = data.songs || [];
  return songs.map(normVercelSong);
};

// Search album by name — tries multiple strategies to find album songs
export const searchAlbumSongs = async (albumName, limit = 30) => {
  const songs = await searchSongs(albumName, limit);
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
