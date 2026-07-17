// ---------------------------------------------------------------------------
// SoundAura — JioSaavn (full Indian songs) + Audius + iTunes (fallback)
// ---------------------------------------------------------------------------

const APP_NAME = 'SoundAura';

// ── JioSaavn API ────────────────────────────────────────────────────────────
const SAAVN_INSTANCES = [
  'https://jiosaavn-api.vercel.app',
];

async function fetchSaavn(path) {
  for (const base of SAAVN_INSTANCES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${base}${path}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return await res.json();
    } catch { /* try next */ }
  }
  return null;
}

function normSaavnSearch(r) {
  return {
    id: `saavn-${r.id}`,
    title: r.title || 'Unknown',
    artist: r.more_info?.singers || r.description?.split(' – ')[1] || 'Unknown Artist',
    album: r.album || '',
    year: '',
    duration: 0,
    coverUrl: r.images?.['500x500'] || r.images?.['150x150'] || r.image || null,
    audioUrl: null,
    allAudioUrls: [],
    genre: r.more_info?.language || '',
    source: 'saavn',
    downloadable: true,
    playCount: 0,
    _saavnId: r.id,
  };
}

async function resolveSaavnTrack(songId) {
  const data = await fetchSaavn(`/song?id=${songId}`);
  if (!data?.status) return null;
  const mediaUrl = data.media_urls?.['320_KBPS'] || data.media_url || null;
  const durParts = (data.duration || '').split(':');
  const durSec = durParts.length === 2 ? parseInt(durParts[0]) * 60 + parseInt(durParts[1]) : 0;
  return {
    id: `saavn-${data.id}`,
    title: data.song || 'Unknown',
    artist: data.primary_artists || data.singers || 'Unknown Artist',
    album: data.album || '',
    year: data.year ? Number(data.year) : '',
    duration: durSec,
    coverUrl: data.images?.['500x500'] || data.image || null,
    audioUrl: mediaUrl,
    allAudioUrls: [
      ...(data.media_urls?.['320_KBPS'] ? [{ quality: '320kbps', url: data.media_urls['320_KBPS'] }] : []),
      ...(data.media_url ? [{ quality: '160kbps', url: data.media_url }] : []),
      ...(data.media_urls?.['96_KBPS'] ? [{ quality: '96kbps', url: data.media_urls['96_KBPS'] }] : []),
    ],
    genre: data.language || '',
    source: 'saavn',
    downloadable: true,
    playCount: 0,
    _saavnLyrics: data.lyrics || null,
  };
}

export async function searchSaavn(query, limit = 20) {
  const data = await fetchSaavn(`/search?query=${encodeURIComponent(query)}&limit=${limit}`);
  if (!data?.status || !data.results) return [];
  const searchResults = data.results.map(normSaavnSearch);

  // Resolve full track details for each result (gets streaming URLs)
  const resolved = await Promise.allSettled(
    searchResults.map(s => resolveSaavnTrack(s._saavnId))
  );
  return resolved
    .filter(r => r.status === 'fulfilled' && r.value && r.value.audioUrl)
    .map(r => r.value);
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

// ── iTunes Search API (30s previews — last resort) ─────────────────────────
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
export function getProxiedUrl(url) { return url; }

export { searchITunes };

export async function searchSongs(query, limit = 40) {
  // Search JioSaavn + Audius + iTunes in parallel
  const [saavnResults, audiusResults, iTunesResults] = await Promise.all([
    withTimeout(searchSaavn(query, Math.min(limit, 20)), 12000),
    withTimeout(
      pickHost().then(host =>
        apiGet(`/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`)
          .then(data => (data?.data || []).map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl))
      ),
      8000
    ),
    withTimeout(searchITunes(query, Math.min(limit, 15)), 6000),
  ]);

  // Priority: JioSaavn (full songs) > Audius (full songs) > iTunes (30s preview)
  return dedupe([...(saavnResults || []), ...(audiusResults || []), ...(iTunesResults || [])]);
}

export async function searchArtistSongs(artistName, limit = 30) {
  const [saavnResults, audiusResults, iTunesResults] = await Promise.all([
    withTimeout(searchSaavn(artistName, Math.min(limit, 20)), 12000),
    withTimeout(
      pickHost().then(host =>
        apiGet(`/v1/tracks/search?query=${encodeURIComponent(artistName)}&limit=${limit}`)
          .then(data => (data?.data || []).map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl))
      ),
      8000
    ),
    withTimeout(searchITunes(artistName, Math.min(limit, 15)), 6000),
  ]);

  return dedupe([...(saavnResults || []), ...(audiusResults || []), ...(iTunesResults || [])]);
}

export async function getTrending(genre = '', limit = 20) {
  try {
    const host = await pickHost();
    const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : '';
    const data = await apiGet(`/v1/tracks/trending?limit=${limit}${genreParam}`);
    return (data?.data || []).map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl);
  } catch (err) {
    console.error('getTrending error:', err);
    return [];
  }
}

export async function getStreamUrl(songId) {
  if (String(songId).startsWith('itunes-')) {
    return { audioUrl: null, streamUrl: null, allUrls: [] };
  }
  if (String(songId).startsWith('saavn-')) {
    const track = await resolveSaavnTrack(songId.replace('saavn-', ''));
    if (track) return { audioUrl: track.audioUrl, streamUrl: track.audioUrl, allUrls: track.allAudioUrls };
    return { audioUrl: null, streamUrl: null, allUrls: [] };
  }
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/tracks/${songId}?app_name=${APP_NAME}`);
    const track = data?.data;
    if (track) {
      const realUrl = track.stream?.url;
      const fallbackUrl = `${host}/v1/tracks/${songId}/stream?app_name=${APP_NAME}`;
      const url = realUrl || fallbackUrl;
      return { audioUrl: url, streamUrl: url, allUrls: realUrl ? [{ quality: 'stream', url: realUrl }] : [] };
    }
  } catch (err) { console.error('getStreamUrl error:', err); }
  const host = await pickHost();
  const url = `${host}/v1/tracks/${songId}/stream?app_name=${APP_NAME}`;
  return { audioUrl: url, streamUrl: url, allUrls: [] };
}

export async function fetchAlbumSongs(playlistId, limit = 30) {
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/playlists/${playlistId}/tracks?limit=${limit}`);
    return (data?.data || []).map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl).slice(0, limit);
  } catch { return []; }
}

// ── Lyrics ──────────────────────────────────────────────────────────────────
export async function fetchLyrics(songId, songTitle, artistName) {
  // 1. Try JioSaavn lyrics API (best for Indian songs — Tamil, Hindi, Telugu, etc.)
  if (String(songId).startsWith('saavn-')) {
    try {
      const data = await fetchSaavn(`/lyrics?id=${songId.replace('saavn-', '')}`);
      if (data?.status && data.lyrics) {
        const clean = data.lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
        if (clean.length > 10) return clean;
      }
    } catch { /* ignore */ }
  }

  if (!songTitle || !artistName) return null;
  const cleanArtist = artistName.split(',')[0].split('&')[0].trim();
  const cleanTitle = songTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  // 2. Try lrclib.net
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

  // Try lrclib with just title
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}`, { signal: ctrl.signal });
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

export async function searchArtists(query, limit = 5) {
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/users/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    return (data?.data || []).filter(u => u.track_count > 0).map(u => ({
      id: u.id, name: u.name || u.handle, handle: u.handle,
      trackCount: u.track_count, followerCount: u.follower_count || 0,
      avatarUrl: u.profile_picture?.['480x480'] || u.profile_picture?.['150x150'] || null,
    }));
  } catch { return []; }
}

export async function getArtistTracks(artistId, limit = 50) {
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/tracks?user_id=${artistId}&limit=${limit}`);
    return (data?.data || []).map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl);
  } catch { return []; }
}

export async function getArtistAlbums(artistId, limit = 20) {
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/users/${artistId}/playlists?limit=${limit}`);
    return (data?.data || []).filter(p => p.playlist_contents?.id?.length > 0).map(p => ({
      id: p.id, title: p.playlist_name || 'Untitled',
      trackCount: p.playlist_contents?.id?.length || 0,
      coverUrl: p.playlist_img_coverart || null, isAlbum: p.is_album || false,
    }));
  } catch { return []; }
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
