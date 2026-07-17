// ---------------------------------------------------------------------------
// SoundAura — JioSaavn (full Indian songs) + Audius + iTunes (fallback)
// ---------------------------------------------------------------------------

const APP_NAME = 'SoundAura';

// ── JioSaavn via Netlify proxy (with direct fallback) ──────────────────────
const PROXY_BASE = '/.netlify/functions/jiosaavn';
const SAAVN_DIRECT = 'https://jiosaavn-api.vercel.app';

async function proxySearch(query, limit = 10) {
  // Try Netlify proxy first
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${PROXY_BASE}?action=search&q=${encodeURIComponent(query)}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (data.songs && data.songs.length > 0) return data.songs;
    }
  } catch { /* proxy not available, try direct */ }

  // Fallback: direct JioSaavn API (search only, resolve top 3)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${SAAVN_DIRECT}/search?query=${encodeURIComponent(query)}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.results) return [];

    // Resolve only first 5 tracks (fast)
    const toResolve = data.results.slice(0, Math.min(limit, 5));
    const resolved = await Promise.allSettled(
      toResolve.map(async (r) => {
        const sRes = await fetch(`${SAAVN_DIRECT}/song?id=${r.id}`);
        if (!sRes.ok) return null;
        const d = await sRes.json();
        if (!d?.status || !d.id) return null;
        const durParts = (d.duration || '').split(':');
        const durSec = durParts.length === 2 ? parseInt(durParts[0]) * 60 + parseInt(durParts[1]) : 0;
        return {
          id: `saavn-${d.id}`,
          title: d.song || 'Unknown',
          artist: d.primary_artists || d.singers || 'Unknown',
          album: d.album || '',
          year: d.year || '',
          duration: durSec,
          coverUrl: d.image || null,
          audioUrl: d.media_url || null,
          allAudioUrls: [
            ...(d.media_urls?.['320_KBPS'] ? [{ quality: '320kbps', url: d.media_urls['320_KBPS'] }] : []),
            ...(d.media_url ? [{ quality: '160kbps', url: d.media_url }] : []),
            ...(d.media_urls?.['96_KBPS'] ? [{ quality: '96kbps', url: d.media_urls['96_KBPS'] }] : []),
          ],
          genre: d.language || '',
          source: 'saavn',
          downloadable: true,
        };
      })
    );
    return resolved.filter(r => r.status === 'fulfilled' && r.value && r.value.audioUrl).map(r => r.value);
  } catch { return []; }
}

async function proxyLyrics(id) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const rawId = String(id).replace('saavn-', '');
    const res = await fetch(`${PROXY_BASE}?action=lyrics&id=${rawId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    return data.lyrics || null;
  } catch { return null; }
}

// ── Audius ──────────────────────────────────────────────────────────────────
const DISCOVERY_HOSTS = [
  'https://discoveryprovider.audius.co',
  'https://discoveryprovider2.audius.co',
  'https://discoveryprovider3.audius.co',
  'https://audius-discovery-1.cultur3stake.com',
];

let cachedHost = null;

async function pickHost() {
  if (cachedHost) return cachedHost;
  for (const host of DISCOVERY_HOSTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`${host}/v1/tracks/trending?app_name=${APP_NAME}&limit=1`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) { cachedHost = host; return host; }
    } catch { /* try next */ }
  }
  cachedHost = DISCOVERY_HOSTS[0];
  return cachedHost;
}

async function apiGet(path) {
  const host = await pickHost();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${host}${path}${sep}app_name=${APP_NAME}`;
  const res = await fetch(url);
  if (!res.ok) {
    cachedHost = null;
    const host2 = await pickHost();
    const res2 = await fetch(`${host2}${path}${sep}app_name=${APP_NAME}`);
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    return res2.json();
  }
  return res.json();
}

function normTrack(t, host) {
  const art = t.artwork || {};
  const realStreamUrl = t.stream?.url || null;
  const constructedUrl = `${host}/v1/tracks/${t.id}/stream?app_name=${APP_NAME}`;
  const candidates = [];
  if (realStreamUrl) candidates.push(realStreamUrl);
  candidates.push(constructedUrl);
  if (t.stream?.mirrors && t.track_cid) {
    const mirrors = typeof t.stream.mirrors === 'string' ? t.stream.mirrors.split(' ') : (t.stream.mirrors || []);
    for (const mh of mirrors) {
      if (!mh) continue;
      const mirrorUrl = `https://${mh.replace(/^https?:\/\//, '')}/tracks/cidstream/${t.track_cid}`;
      if (!candidates.includes(mirrorUrl)) candidates.push(mirrorUrl);
    }
  }
  return {
    id: t.id,
    title: t.title || 'Unknown',
    artist: t.user?.name || t.user?.handle || 'Unknown Artist',
    album: t.album_backlink?.title || '',
    year: t.release_date ? new Date(t.release_date).getFullYear() : '',
    duration: t.duration || 0,
    coverUrl: art['480x480'] || art['150x150'] || art['1000x1000'] || null,
    audioUrl: candidates[0] || constructedUrl,
    allAudioUrls: candidates.map(url => ({ quality: 'stream', url })),
    genre: t.genre || '',
    source: 'audius',
    downloadable: !!t.downloadable,
    playCount: t.play_count || 0,
  };
}

// ── iTunes (30s previews — last resort) ────────────────────────────────────
function normITunesTrack(s) {
  const art100 = s.artworkUrl100 || '';
  const coverUrl = art100 ? art100.replace('100x100', '600x600') : null;
  return {
    id: `itunes-${s.trackId}`,
    title: s.trackName || 'Unknown',
    artist: s.artistName || 'Unknown Artist',
    album: s.collectionName || '',
    year: s.releaseDate ? new Date(s.releaseDate).getFullYear() : '',
    duration: s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 0,
    coverUrl,
    audioUrl: s.previewUrl || null,
    allAudioUrls: s.previewUrl ? [{ quality: 'preview', url: s.previewUrl }] : [],
    genre: s.primaryGenreName || '',
    source: 'itunes',
    downloadable: false,
    playCount: 0,
  };
}

async function searchITunes(query, limit = 20) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=${limit}&entity=song&country=IN`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).filter(s => s.previewUrl).map(normITunesTrack);
  } catch {
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function dedupe(sources) {
  const seen = new Set();
  const merged = [];
  for (const s of sources) {
    const key = `${s.title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${s.artist.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }
  return merged;
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve([]), ms))]);
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function searchSongs(query, limit = 40) {
  const [saavnResults, audiusResults, iTunesResults] = await Promise.all([
    withTimeout(proxySearch(query, Math.min(limit, 15)), 18000),
    withTimeout(
      pickHost().then(host =>
        apiGet(`/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`)
          .then(data => (data?.data || []).map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl))
      ),
      8000
    ),
    withTimeout(searchITunes(query, Math.min(limit, 10)), 6000),
  ]);

  return dedupe([...(saavnResults || []), ...(audiusResults || []), ...(iTunesResults || [])]);
}

export async function searchSaavn(query, limit = 15) {
  return proxySearch(query, limit);
}

export async function searchArtistSongs(artistName, limit = 30) {
  const [saavnResults, audiusResults, iTunesResults] = await Promise.all([
    withTimeout(proxySearch(artistName, Math.min(limit, 15)), 18000),
    withTimeout(
      pickHost().then(host =>
        apiGet(`/v1/tracks/search?query=${encodeURIComponent(artistName)}&limit=${limit}`)
          .then(data => (data?.data || []).map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl))
      ),
      8000
    ),
    withTimeout(searchITunes(artistName, Math.min(limit, 10)), 6000),
  ]);

  return dedupe([...(saavnResults || []), ...(audiusResults || []), ...(iTunesResults || [])]);
}

export async function fetchLyrics(songId, songTitle, artistName) {
  if (String(songId).startsWith('saavn-')) {
    const lyrics = await proxyLyrics(songId);
    if (lyrics && lyrics.length > 10) return lyrics;
  }

  if (!songTitle || !artistName) return null;
  const cleanArtist = artistName.split(',')[0].split('&')[0].trim();
  const cleanTitle = songTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  const tryLrclib = async (artist, title) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const best = data.find(l => l.syncedLyrics) || data[0];
          return best.syncedLyrics || best.plainLyrics || null;
        }
      }
    } catch { /* ignore */ }
    return null;
  };

  const titles = [cleanTitle];
  const simplerTitle = cleanTitle.replace(/feat\.?.*/i, '').replace(/ft\.?.*/i, '').trim();
  if (simplerTitle && simplerTitle !== cleanTitle) titles.push(simplerTitle);

  for (const title of titles) {
    const lyrics = await tryLrclib(cleanArtist, title);
    if (lyrics) return lyrics;
  }

  return null;
}

export async function downloadAudioBlob(audioUrl) {
  if (!audioUrl) return null;
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } catch (err) {
    console.error('Download error:', err);
    return null;
  }
}

export function groupTracksByAlbum(tracks) {
  const albumMap = {};
  for (const track of tracks) {
    const albumTitle = track.album || 'Unknown';
    const albumKey = albumTitle.toLowerCase();
    if (!albumMap[albumKey]) {
      albumMap[albumKey] = { id: albumKey, title: albumTitle, artist: track.artist, coverUrl: track.coverUrl, year: track.year, tracks: [] };
    }
    albumMap[albumKey].tracks.push(track);
    if (track.coverUrl && !albumMap[albumKey].coverUrl) albumMap[albumKey].coverUrl = track.coverUrl;
  }
  return Object.values(albumMap).sort((a, b) => b.tracks.length - a.tracks.length);
}
