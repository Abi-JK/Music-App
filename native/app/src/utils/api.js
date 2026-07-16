// API utilities for React Native app — powered by Audius (https://audius.org)
// Free, no API key, no signup, artist-uploaded tracks that are legal to
// stream & download. See src/utils/api.js in the web app for full notes.

const APP_NAME = 'SoundAura';

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
  cachedHost = DISCOVERY_HOSTS[0];
  return cachedHost;
}

async function apiGet(path) {
  const host = await pickHost();
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${host}${path}${sep}app_name=${APP_NAME}`);
  if (!res.ok) {
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

function normSong(t, host) {
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
    language: '',
    genre: t.genre || '',
    mood: t.mood || '',
    label: '',
    copyright: `© ${t.user?.name || 'artist'} — shared via Audius`,
    hasLyrics: false,
    albumUrl: null,
    albumId: null,
    downloadable: !!t.downloadable,
  };
}

export async function searchSongs(query, limit = 40) {
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    const results = data?.data || [];
    return results.map(t => normSong(t, host)).filter(s => s.id && s.audioUrl);
  } catch (err) {
    console.error('searchSongs error:', err);
    return [];
  }
}

export async function getStreamUrl(songId) {
  const host = await pickHost();
  const url = streamUrlFor(host, songId);
  return { audioUrl: url, streamUrl: url };
}

export async function fetchAlbumSongs(playlistId, limit = 30) {
  try {
    const host = await pickHost();
    const data = await apiGet(`/v1/playlists/${playlistId}/tracks?limit=${limit}`);
    const songs = (data?.data || []).map(t => normSong(t, host)).filter(s => s.id && s.audioUrl);
    return songs.slice(0, limit);
  } catch {
    return [];
  }
}

// Audius has no lyrics API — fall back to the free lyrics.ovh lookup.
export async function fetchLyrics(songId, songTitle, artistName) {
  if (!songTitle || !artistName) return null;
  try {
    const cleanArtist = artistName.split(',')[0].split('&')[0].trim();
    const cleanTitle = songTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.lyrics && data.lyrics.trim().length > 10) return data.lyrics;
    }
  } catch { /* no lyrics found */ }
  return null;
}
