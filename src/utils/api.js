// ---------------------------------------------------------------------------
// SoundAura audio backend — powered by Audius (https://audius.org)
//
// Audius is a decentralized, artist-first music platform. Every track here is
// uploaded directly by the artist and is free to stream & download by design
// — there's no scraping, no unofficial mirrors, and no licensing issue. It's
// a real (if smaller/more independent) music catalog: electronic, hip-hop,
// lo-fi, indie, ambient, and a growing set of regional/world artists.
//
// No API key or signup required. Full docs: https://docs.audius.org/api
// ---------------------------------------------------------------------------

const APP_NAME = 'SoundAura';

// Audius is served by many independent "discovery nodes". We try a short
// list in order and fall back automatically if one is slow/unreachable.
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
      if (res.ok) {
        cachedHost = host;
        return host;
      }
    } catch { /* try next host */ }
  }
  // Last resort — just use the first one and let calls fail gracefully
  cachedHost = DISCOVERY_HOSTS[0];
  return cachedHost;
}

async function apiGet(path) {
  const host = await pickHost();
  const sep = path.includes('?') ? '&' : '?';
  const url = `${host}${path}${sep}app_name=${APP_NAME}`;
  const res = await fetch(url);
  if (!res.ok) {
    // one retry against a different host in case this node is unhealthy
    cachedHost = null;
    const host2 = await pickHost();
    const res2 = await fetch(`${host2}${path}${sep}app_name=${APP_NAME}`);
    if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
    return res2.json();
  }
  return res.json();
}

function streamUrlFor(host, trackId) {
  return `${host}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
}

function normTrack(t, host) {
  const art = t.artwork || {};
  return {
    id: t.id,
    title: t.title || 'Unknown',
    artist: t.user?.name || t.user?.handle || 'Unknown Artist',
    album: t.album_backlink?.title || '',
    year: t.release_date ? new Date(t.release_date).getFullYear() : '',
    duration: t.duration || 0,
    coverUrl: art['480x480'] || art['150x150'] || art['1000x1000'] || null,
    audioUrl: streamUrlFor(host, t.id),
    allAudioUrls: [{ quality: 'stream', url: streamUrlFor(host, t.id) }],
    language: '', // Audius doesn't tag tracks by language — genre/mood below instead
    genre: t.genre || '',
    mood: t.mood || '',
    label: '',
    copyright: `© ${t.user?.name || 'artist'} — shared via Audius`,
    hasLyrics: false, // Audius has no lyrics API; we fall back to lyrics.ovh by title/artist
    albumUrl: null,
    albumId: null,
    downloadable: !!t.downloadable,
    playCount: t.play_count || 0,
  };
}

export function getProxiedUrl(url) {
  // Audius stream endpoints are CORS-enabled and don't need proxying.
  return url;
}

export async function searchSongs(query, limit = 40) {
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    const results = data?.data || [];
    return results.map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl);
  } catch (err) {
    console.error('searchSongs error:', err);
    return [];
  }
}

export async function getTrending(genre = '', limit = 20) {
  try {
    const host = await pickHost();
    const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : '';
    const data = await apiGet(`/v1/tracks/trending?limit=${limit}${genreParam}`);
    const results = data?.data || [];
    return results.map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl);
  } catch (err) {
    console.error('getTrending error:', err);
    return [];
  }
}

export async function getStreamUrl(songId) {
  // Audius doesn't need a lookup — the stream URL is deterministic from the id.
  const host = await pickHost();
  const url = streamUrlFor(host, songId);
  return { audioUrl: url, streamUrl: url, allUrls: [{ quality: 'stream', url }] };
}

// Audius doesn't have "film albums" — this fetches a user-made Audius playlist instead.
export async function fetchAlbumSongs(playlistId, limit = 30) {
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/playlists/${playlistId}/tracks?limit=${limit}`);
    const songs = (data?.data || []).map(t => normTrack(t, host)).filter(s => s.id && s.audioUrl);
    return songs.slice(0, limit);
  } catch {
    return [];
  }
}

// Lyrics: Audius has no lyrics API, so we go straight to the free lyrics.ovh
// lookup by title + artist (works best for well-known songs/covers).
export async function fetchLyrics(songId, songTitle, artistName) {
  if (!songTitle || !artistName) return null;

  const tryLookup = async (artist, title) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data?.lyrics && data.lyrics.trim().length > 10) return data.lyrics;
      }
    } catch { /* ignore, try next */ }
    return null;
  };

  const cleanArtist = artistName.split(',')[0].split('&')[0].trim();
  const cleanTitle = songTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  let lyrics = await tryLookup(cleanArtist, cleanTitle);
  if (lyrics) return lyrics;

  const simplerTitle = cleanTitle.replace(/feat\.?.*/i, '').replace(/ft\.?.*/i, '').trim();
  if (simplerTitle && simplerTitle !== cleanTitle) {
    lyrics = await tryLookup(cleanArtist, simplerTitle);
    if (lyrics) return lyrics;
  }

  return null;
}

// Download audio as a blob for offline storage / the ringtone cutter.
export async function downloadAudioBlob(audioUrl) {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } catch (err) {
    console.error('Download error:', err);
    return null;
  }
}
