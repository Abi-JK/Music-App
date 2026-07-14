import { API, SEARCH } from './constants';
import { decodeHtml, parseDuration, toProxiedStream, formatLyrics } from './helpers';

// CORS proxy fallback — when edge functions aren't deployed
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// ─── Safe JSON fetch with CORS proxy fallback ────────────────────────────────
async function safeJsonFetch(primaryUrl, fallbackUrls, signal) {
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

// ─── Normalize a song from JioSaavn API ──────────────────────────────────────
function normSong(s) {
  const primary = decodeHtml(s.primary_artists || s.singers || '');
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
    copyright: decodeHtml(s.copyright_text || ''),
    hasLyrics: s.has_lyrics === 'true' || s.has_lyrics === true,
    mediaPreview: s.media_preview_url || null,
    albumUrl: s.album_url || null,
  };
}

// ─── Fetch songs by PIDs (batch) ─────────────────────────────────────────────
async function fetchSongsByPids(pids, signal) {
  if (!pids.length) return [];
  const batches = [];
  for (let i = 0; i < pids.length; i += 20) {
    batches.push(pids.slice(i, i + 20));
  }
  const results = [];
  for (const batch of batches) {
    try {
      const j = await safeJsonFetch(
        `${API}?__call=song.getDetails&pids=${batch.join(',')}&_format=json&_marker=0&ctx=web6dot0`,
        CORS_PROXIES,
        signal
      );
      if (j.songs) results.push(...j.songs);
    } catch { /* skip batch */ }
  }
  return results.map(normSong);
}

// ─── SEARCH: search.getResults (multi-page) + autocomplete fallback ──────────
export async function searchSongs(query, limit = 80) {
  try {
    // Step 1: search.getResults — fetch 2 pages for more coverage
    const pages = limit > 40 ? 3 : 1;
    const pageFetches = [];
    for (let p = 1; p <= pages; p++) {
      pageFetches.push(
        safeJsonFetch(
          `${API}?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&cc=in&p=${p}&n=40`,
          CORS_PROXIES
        ).catch(() => ({ results: [] }))
      );
    }
    const pageResults = await Promise.all(pageFetches);
    const seen = new Set();
    const directSongs = [];
    for (const pageRes of pageResults) {
      for (const s of (pageRes.results || [])) {
        if (s?.id && s?.song && !seen.has(s.id)) {
          seen.add(s.id);
          directSongs.push(s);
        }
      }
    }
    if (directSongs.length > 0) {
      return directSongs.map(normSong).slice(0, limit);
    }

    // Step 2: Fallback — autocomplete.get → extract song_pids → song.getDetails
    const auto = await safeJsonFetch(
      `${API}?__call=autocomplete.get&query=${encodeURIComponent(query)}&_format=json&_marker=0&cc=in&includeMetaTags=1`,
      CORS_PROXIES
    );

    const allPids = [];
    const albums = auto.albums?.data || [];
    for (const album of albums) {
      const pids = album.more_info?.song_pids;
      if (pids) {
        pids.split(',').map(p => p.trim()).filter(Boolean).forEach(pid => {
          if (!allPids.includes(pid)) allPids.push(pid);
        });
      }
    }

    if (allPids.length > 0) {
      const songs = await fetchSongsByPids(allPids.slice(0, limit));
      if (songs.length > 0) return songs;
    }

    return [];
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
    ...normSong(detail),
    audioUrl: authUrl,
    streamUrl: toProxiedStream(authUrl),
  };
}

// ─── PLAYLIST: Get songs from a curated playlist ────────────────────────────
export async function fetchPlaylistSongs(playlistId, limit = 50) {
  try {
    const j = await safeJsonFetch(
      `${API}?__call=playlist.getDetails&listid=${playlistId}&_format=json&_marker=0&ctx=web6dot0&offset=0&n=${limit}`,
      CORS_PROXIES
    );
    return (j.songs || []).map(normSong).slice(0, limit);
  } catch {
    return [];
  }
}

// ─── ALBUM SONGS: Get songs from autocomplete album PIDs ─────────────────────
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
