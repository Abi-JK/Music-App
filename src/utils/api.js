// ---------------------------------------------------------------------------
// SoundAura audio backend — powered by Audius (https://audius.org)
// ---------------------------------------------------------------------------

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

  // Build a list of URLs to try — real URL first, then constructed fallback
  const candidates = [];
  if (realStreamUrl) candidates.push(realStreamUrl);
  candidates.push(constructedUrl);

  // Add mirror hosts as further fallbacks (space-separated hostnames)
  if (t.stream?.mirrors && t.track_cid) {
    const mirrors = typeof t.stream.mirrors === 'string' ? t.stream.mirrors.split(' ') : (t.stream.mirrors || []);
    for (const mh of mirrors) {
      if (!mh) continue;
      const mirrorUrl = `https://${mh.replace(/^https?:\/\//, '')}/tracks/cidstream/${t.track_cid}`;
      if (!candidates.includes(mirrorUrl)) candidates.push(mirrorUrl);
    }
  }

  const audioUrl = candidates[0] || constructedUrl;

  return {
    id: t.id,
    title: t.title || 'Unknown',
    artist: t.user?.name || t.user?.handle || 'Unknown Artist',
    album: t.album_backlink?.title || '',
    year: t.release_date ? new Date(t.release_date).getFullYear() : '',
    duration: t.duration || 0,
    coverUrl: art['480x480'] || art['150x150'] || art['1000x1000'] || null,
    audioUrl: audioUrl,
    allAudioUrls: candidates.map(url => ({ quality: 'stream', url })),
    genre: t.genre || '',
    mood: t.mood || '',
    copyright: `© ${t.user?.name || 'artist'} — shared via Audius`,
    downloadable: !!t.downloadable,
    playCount: t.play_count || 0,
  };
}

export function getProxiedUrl(url) {
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
  } catch (err) {
    console.error('getStreamUrl error:', err);
  }
  const host = await pickHost();
  const url = `${host}/v1/tracks/${songId}/stream?app_name=${APP_NAME}`;
  return { audioUrl: url, streamUrl: url, allUrls: [] };
}

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

export async function fetchLyrics(songId, songTitle, artistName) {
  if (!songTitle || !artistName) return null;

  const tryLookup = async (artist, title) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
        { signal: ctrl.signal }
      );
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data?.lyrics && data.lyrics.trim().length > 10) return data.lyrics;
      }
    } catch { /* ignore */ }
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
