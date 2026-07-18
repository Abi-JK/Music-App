// ---------------------------------------------------------------------------
// SoundAura — JioSaavn primary + YouTube fallback for missing songs
// All audio proxied via Netlify Edge Function
// ---------------------------------------------------------------------------

const SAAVN_API = 'https://saavn.sumit.co/api';
const SAAVN_FB = 'https://jiosaavn-api.vercel.app';
const YT_PROXIES = [
  'https://yt-dlp-api.onrender.com',
  'https://yt-api.dnd.dev',
];
let activeYtProxy = 0;

function streamProxy(cdnUrl) {
  if (!cdnUrl) return null;
  return `/api/stream-audio?url=${encodeURIComponent(cdnUrl)}`;
}

function extractId(s) {
  if (!s) return '';
  const raw = s.id || '';
  return String(raw).replace(/^saavn-/, '');
}

async function fetchSongById(rawId) {
  if (!rawId) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${SAAVN_API}/songs/${rawId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const song = Array.isArray(data?.data) ? data.data[0] : data?.data;
      if (song?.id) return song;
      if (data?.data?.id) return data.data;
    }
  } catch {}
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${SAAVN_FB}/song?id=${rawId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const d = await res.json();
      const song = Array.isArray(d?.songs) ? d.songs[0] : d;
      if (song?.id || song?.song) return song;
      if (d?.status && d.id) return d;
    }
  } catch {}
  return null;
}

async function fetchBatchByIds(ids) {
  if (!ids.length) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${SAAVN_API}/songs/${ids.join(',')}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const list = data?.data?.songs || (Array.isArray(data?.data) ? data.data : []);
      if (list.length > 0) return list;
    }
  } catch {}
  const results = await Promise.allSettled(ids.map(id => fetchSongById(id)));
  return results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
}

function normalizeSong(s) {
  if (!s) return null;
  let dur = 0;
  if (typeof s.duration === 'number') dur = s.duration;
  else if (typeof s.duration === 'string' && s.duration.includes(':')) {
    const p = s.duration.split(':');
    dur = parseInt(p[0]) * 60 + parseInt(p[1] || 0);
  }
  if (dur > 0 && dur < 30) return null;
  let artists = 'Unknown';
  if (s.artists?.primary?.length) artists = s.artists.primary.map(a => a.name).join(', ');
  else if (s.artists?.featured?.length) artists = s.artists.featured.map(a => a.name).join(', ');
  else if (s.primaryArtists) artists = s.primaryArtists;
  else if (s.singers) artists = s.singers;
  else if (typeof s.primary_artists === 'string') artists = s.primary_artists;
  const album = s.album?.name || s.album || '';
  const year = s.year || s.releaseDate || '';
  let coverUrl = null;
  if (Array.isArray(s.image)) {
    coverUrl = s.image.find(i => i.quality === '500x500')?.url
      || s.image.find(i => i.quality === '150x150')?.url || s.image[0]?.url || null;
  } else if (typeof s.image === 'string') coverUrl = s.image;
  const downloadUrls = Array.isArray(s.downloadUrl) ? s.downloadUrl : [];
  const url320 = downloadUrls.find(u => u.quality === '320kbps')?.url || s.media_urls?.['320_KBPS'] || null;
  const url160 = downloadUrls.find(u => u.quality === '160kbps')?.url || s.media_url || null;
  const url96 = downloadUrls.find(u => u.quality === '96kbps')?.url || null;
  const rawAudio = url320 || url160 || url96;
  if (!rawAudio) return null;
  const rawId = extractId(s);
  return {
    id: `saavn-${rawId}`,
    title: s.name || s.song || 'Unknown',
    artist: artists,
    album, year,
    duration: dur,
    coverUrl,
    audioUrl: streamProxy(rawAudio),
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
    _saavnId: rawId,
  };
}

function normalizeYtResult(item) {
  if (!item || !item.id) return null;
  return {
    id: `yt-${item.id}`,
    title: item.title || item.track || 'Unknown',
    artist: item.channel || item.artist || item.uploader || 'YouTube',
    album: item.album || item.playlist || '',
    year: item.upload_date?.slice(0, 4) || '',
    duration: item.duration || 0,
    coverUrl: item.thumbnail || item.thumbnails?.[0]?.url || null,
    audioUrl: item.url || null,
    allAudioUrls: item.url ? [{ quality: 'best', url: item.url }] : [],
    rawAudioUrls: item.url ? [{ quality: 'best', url: item.url }] : [],
    genre: '',
    source: 'youtube',
    downloadable: true,
    _ytId: item.id,
  };
}

async function searchYouTube(query, limit = 10) {
  try {
    const body = {
      context: {
        client: {
          clientName: 'ANDROID_MUSIC',
          clientVersion: '6.42.52',
          hl: 'en', gl: 'IN',
          androidSdkVersion: 30,
        }
      },
      query,
      params: 'EgIQAQ%3D%3D',
    };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch('https://music.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'com.google.android.apps.youtube.music/6.42.52' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    const str = JSON.stringify(data);
    const videoIds = [];
    const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      if (!videoIds.includes(m[1])) videoIds.push(m[1]);
    }
    if (videoIds.length === 0) return [];
    const titles = [];
    const titleRe = /"text":"([^"]{5,100})"/g;
    while ((m = titleRe.exec(str)) !== null) {
      if (!titles.includes(m[1]) && !m[1].includes('http') && !m[1].includes('Music')) {
        titles.push(m[1]);
      }
    }
    const results = [];
    for (let i = 0; i < Math.min(videoIds.length, limit); i++) {
      const vid = videoIds[i];
      const title = titles[i] || 'Unknown';
      results.push({
        id: vid,
        title: title,
        channel: '',
        thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        duration: 0,
        url: null,
      });
    }
    return results.map(normalizeYtResult).filter(Boolean).filter(s => s.duration > 10 || s.audioUrl);
  } catch {}
  return [];
}

async function fetchSaavnSearch(query, limit) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SAAVN_API}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const results = data?.data?.results || [];
      if (results.length > 0) return results;
    }
  } catch {}
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SAAVN_FB}/search?query=${encodeURIComponent(query)}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      return data?.results || [];
    }
  } catch {}
  return [];
}

async function searchAndResolve(query, limit = 30) {
  const searchResults = await fetchSaavnSearch(query, limit);

  if (searchResults.length > 0) {
    const normalized = searchResults.map(normalizeSong).filter(Boolean);
    const withAudio = normalized.filter(s => s.audioUrl);
    if (withAudio.length >= 3) return withAudio;
  }

  const ytResults = await searchYouTube(query, Math.min(limit, 10));
  const seen = new Set();
  const allSongs = [];
  for (const s of [...searchResults.map(normalizeSong).filter(Boolean).filter(s => s.audioUrl), ...ytResults]) {
    const key = `${(s.title || '').toLowerCase().trim()}|${(s.artist || '').toLowerCase().trim()}|${s.id || ''}`;
    if (!seen.has(key)) { seen.add(key); allSongs.push(s); }
  }
  return allSongs;
}

export async function searchSongs(query, limit = 40) {
  const results = await Promise.race([
    searchAndResolve(query, Math.min(limit, 50)),
    new Promise(resolve => setTimeout(() => resolve([]), 20000)),
  ]);
  return dedupe(results || []);
}

export async function searchSaavn(query, limit = 20) {
  return searchSongs(query, limit);
}

export async function searchArtistSongs(artistName, limit = 50) {
  const queries = [`${artistName} songs`, `${artistName} hits`, `${artistName} album`];
  const results = [];
  for (const q of queries) {
    const batch = await searchSongs(q, Math.ceil(limit / queries.length));
    results.push(...batch);
    if (results.length >= limit) break;
  }
  return dedupe(results).slice(0, limit);
}

export async function fetchFreshUrls(song) {
  if (!song || song.source === 'youtube') return null;
  const rawId = song._saavnId || String(song.id || '').replace('saavn-', '');
  if (!rawId) return null;
  const fullSong = await fetchSongById(rawId);
  if (!fullSong) return null;
  const normalized = normalizeSong(fullSong);
  if (!normalized) return null;
  return {
    audioUrl: normalized.audioUrl,
    allAudioUrls: normalized.allAudioUrls,
    rawAudioUrls: normalized.rawAudioUrls,
  };
}

export async function refreshSongUrl(song) {
  if (!song) return null;
  if (song.source === 'youtube') return null;
  const rawId = song._saavnId || String(song.id || '').replace('saavn-', '');
  if (!rawId) return null;
  const fullSong = await fetchSongById(rawId);
  if (!fullSong) return null;
  return normalizeSong(fullSong);
}

export async function retrySaavnSong(song) {
  return fetchFreshUrls(song);
}

export { fetchSongById };

async function proxyLyrics(rawId) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SAAVN_FB}/lyrics?id=${rawId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const lyrics = data?.lyrics || null;
      if (lyrics) return lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
    }
  } catch {}
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SAAVN_API}/songs/${rawId}/lyrics`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const lyrics = data?.data?.lyrics || null;
      if (lyrics) return lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
    }
  } catch {}
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${SAAVN_API}/songs/${rawId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const song = Array.isArray(data?.data) ? data.data[0] : data?.data;
      if (song?.name) {
        const artist = song.artists?.primary?.[0]?.name || song.primaryArtists || '';
        const lrclib = await tryLrclib(artist, song.name);
        if (lrclib) return lrclib;
      }
    }
  } catch {}
  return null;
}

const tryLrclib = async (artist, title) => {
  try {
    const params = new URLSearchParams({ track_name: title });
    if (artist) params.set('artist_name', artist);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://lrclib.net/api/search?${params.toString()}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const best = data.find(l => l.syncedLyrics) || data[0];
        return best.syncedLyrics || best.plainLyrics || null;
      }
    }
  } catch {}
  return null;
};

const tryLyricsOvh = async (artist, title) => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      return data?.lyrics || null;
    }
  } catch {}
  return null;
};

export async function fetchLyrics(songId, songTitle, artistName) {
  if (String(songId).startsWith('saavn-')) {
    const rawId = String(songId).replace('saavn-', '');
    const lyrics = await proxyLyrics(rawId);
    if (lyrics && lyrics.length > 10) return lyrics;
  }

  if (!songTitle) return null;
  const cleanArtist = artistName ? artistName.split(',')[0].split('&')[0].trim() : '';
  const cleanTitle = songTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

  const titleVariations = [cleanTitle];
  const simpler = cleanTitle.replace(/feat\.?.*/i, '').replace(/ft\.?.*/i, '').trim();
  if (simpler && simpler !== cleanTitle) titleVariations.push(simpler);
  const noYear = cleanTitle.replace(/\d{4}/g, '').trim();
  if (noYear && noYear !== cleanTitle) titleVariations.push(noYear);
  const noVer = cleanTitle.replace(/-\s*(Remix|Version|Edited|Reprise|Unplugged|Live|Acoustic|Club|Extended|Remastered|Original).*/i, '').trim();
  if (noVer && noVer !== cleanTitle) titleVariations.push(noVer);

  for (const title of titleVariations) {
    const lyrics = await tryLrclib(cleanArtist, title);
    if (lyrics) return lyrics;
  }
  for (const title of titleVariations) {
    if (!cleanArtist) continue;
    const lyrics = await tryLyricsOvh(cleanArtist, title);
    if (lyrics) return lyrics;
  }
  for (const title of titleVariations) {
    const lyrics = await tryLrclib('', title);
    if (lyrics) return lyrics;
  }
  return null;
}

export async function downloadAudioBlob(audioUrl, rawUrls) {
  const urlsToTry = [];
  if (rawUrls?.length) {
    for (const entry of rawUrls) {
      if (entry.url) urlsToTry.push(entry.url);
    }
  }
  if (audioUrl) urlsToTry.push(audioUrl);
  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const blob = await response.blob();
      if (blob && blob.size > 100000) return blob;
    } catch { continue; }
  }
  return null;
}

function dedupe(sources) {
  const seen = new Set();
  const merged = [];
  for (const s of sources) {
    const key = `${(s.title || '').toLowerCase().trim()}|${(s.artist || '').toLowerCase().trim()}|${s.id || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }
  return merged;
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
