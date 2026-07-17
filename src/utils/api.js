// ---------------------------------------------------------------------------
// SoundAura — JioSaavn (full Indian songs) + Audius + iTunes (fallback)
// All JioSaavn audio proxied via Netlify Edge Function (bypasses CDN blocks)
// ---------------------------------------------------------------------------

const APP_NAME = 'SoundAura';

// ── JioSaavn (full Indian songs) ──────────────────────────────────────────
const SAAVN_API = 'https://saavn.sumit.co/api';
const SAAVN_FALLBACK = 'https://jiosaavn-api.vercel.app';

function streamProxy(cdnUrl) {
  if (!cdnUrl) return null;
  return `/api/stream-audio?url=${encodeURIComponent(cdnUrl)}`;
}

function normSaavnResult(s) {
  const dur = typeof s.duration === 'number' ? s.duration : 0;
  const artists = s.artists?.primary?.map(a => a.name).join(', ')
    || s.artists?.featured?.map(a => a.name).join(', ')
    || s.primaryArtists || s.singers || 'Unknown';
  const img500 = s.image?.find(i => i.quality === '500x500')?.url
    || s.image?.find(i => i.quality === '150x150')?.url
    || s.image?.[0]?.url || null;
  const downloadUrls = s.downloadUrl || [];
  const url320 = downloadUrls.find(u => u.quality === '320kbps')?.url;
  const url160 = downloadUrls.find(u => u.quality === '160kbps')?.url;
  const url96 = downloadUrls.find(u => u.quality === '96kbps')?.url;
  const rawAudio = url320 || url160 || url96 || null;
  const audioUrl = streamProxy(rawAudio);
  return {
    id: `saavn-${s.id}`,
    title: s.name || 'Unknown',
    artist: artists,
    album: s.album?.name || '',
    year: s.year || s.releaseDate || '',
    duration: dur,
    coverUrl: img500,
    audioUrl,
    allAudioUrls: [
      ...(url320 ? [{ quality: '320kbps', url: streamProxy(url320) }] : []),
      ...(url160 ? [{ quality: '160kbps', url: streamProxy(url160) }] : []),
      ...(url96 ? [{ quality: '96kbps', url: streamProxy(url96) }] : []),
    ],
    rawAudioUrls: [
      ...(url320 ? [{ quality: '320kbps', url: url320 }] : []),
      ...(url160 ? [{ quality: '160kbps', url: url160 }] : []),
      ...(url96 ? [{ quality: '96kbps', url: url96 }] : []),
    ],
    genre: s.language || '',
    source: 'saavn',
    downloadable: true,
    _saavnId: s.id,
  };
}

async function searchSaavnMain(query, limit = 15) {
  // PRIMARY: saavn.sumit.co (search results include download URLs)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`${SAAVN_API}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const results = data?.data?.results || [];
      const songs = results.map(normSaavnResult).filter(s => s.audioUrl);
      if (songs.length > 0) return songs;
    }
  } catch { /* try fallback */ }

  // FALLBACK: jiosaavn-api.vercel.app (needs separate resolve)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${SAAVN_FALLBACK}/search?query=${encodeURIComponent(query)}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.results) return [];
    const toResolve = data.results.slice(0, Math.min(limit, 10));
    const resolved = await Promise.allSettled(
      toResolve.map(async (r) => {
        const sRes = await fetch(`${SAAVN_FALLBACK}/song?id=${r.id}`);
        if (!sRes.ok) return null;
        const d = await sRes.json();
        if (!d?.status || !d.id) return null;
        const durParts = (d.duration || '').split(':');
        const durSec = durParts.length === 2 ? parseInt(durParts[0]) * 60 + parseInt(durParts[1]) : 0;
        const raw320 = d.media_urls?.['320_KBPS'];
        const raw160 = d.media_url;
        return {
          id: `saavn-${d.id}`,
          title: d.song || r.title || 'Unknown',
          artist: d.primary_artists || d.singers || 'Unknown',
          album: d.album || '',
          year: d.year || '',
          duration: durSec,
          coverUrl: d.image || null,
          audioUrl: streamProxy(raw320) || streamProxy(raw160) || null,
          allAudioUrls: [
            ...(raw320 ? [{ quality: '320kbps', url: streamProxy(raw320) }] : []),
            ...(raw160 ? [{ quality: '160kbps', url: streamProxy(raw160) }] : []),
          ],
          genre: d.language || '',
          source: 'saavn',
          downloadable: true,
          _saavnId: d.id,
        };
      })
    );
    return resolved.filter(r => r.status === 'fulfilled' && r.value && r.value.audioUrl).map(r => r.value);
  } catch { return []; }
}

async function proxySearch(query, limit = 15) {
  return searchSaavnMain(query, limit);
}

// Retry a single saavn song via fallback API (gets fresh CDN URL)
async function retrySaavnSong(song) {
  const rawId = String(song._saavnId || song.id).replace('saavn-', '');
  if (!rawId) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SAAVN_FALLBACK}/song?id=${rawId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const d = await res.json();
    if (!d?.status || !d.id) return null;
    const raw320 = d.media_urls?.['320_KBPS'];
    const raw160 = d.media_url;
    const freshUrl = raw320 || raw160;
    if (!freshUrl) return null;
    return {
      ...song,
      audioUrl: streamProxy(raw320) || streamProxy(raw160),
      allAudioUrls: [
        ...(raw320 ? [{ quality: '320kbps', url: streamProxy(raw320) }] : []),
        ...(raw160 ? [{ quality: '160kbps', url: streamProxy(raw160) }] : []),
      ],
    };
  } catch { return null; }
}

export { retrySaavnSong };

async function proxyLyrics(id) {
  const rawId = String(id).replace('saavn-', '');

  // 1. Try jiosaavn-api.vercel.app lyrics (known working)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://jiosaavn-api.vercel.app/lyrics?id=${rawId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const lyrics = data?.lyrics || null;
      if (lyrics) return lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
    }
  } catch { /* try next */ }

  // 2. Try saavn.sumit.co lyrics
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${SAAVN_API}/songs/${rawId}/lyrics`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const lyrics = data?.data?.lyrics || null;
      if (lyrics) return lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
    }
  } catch { /* no lyrics */ }

  return null;
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
    withTimeout(proxySearch(query, Math.min(limit, 50)), 15000),
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
    withTimeout(proxySearch(artistName, Math.min(limit, 50)), 15000),
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
