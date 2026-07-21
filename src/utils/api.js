// ---------------------------------------------------------------------------
// SoundAura — JioSaavn primary + multiple API fallbacks
// All audio proxied via Netlify Edge Function
// ---------------------------------------------------------------------------

const SAAVN_APIS = [
  'https://saavn.sumit.co/api',
  'https://api.jiosaavn.com',
];
const SAAVN_FB = 'https://jiosaavn-api.vercel.app';
const LRCLIB = 'https://lrclib.net';

function streamProxy(cdnUrl) {
  if (!cdnUrl) return null;
  return `/api/stream-audio?url=${encodeURIComponent(cdnUrl)}`;
}

function extractId(s) {
  if (!s) return '';
  const raw = s.id || '';
  return String(raw).replace(/^saavn-/, '');
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    return res;
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function fetchSongById(rawId) {
  if (!rawId) return null;
  for (const api of SAAVN_APIS) {
    try {
      const res = await fetchWithTimeout(`${api}/songs/${rawId}`, {}, 4000);
      if (res && res.ok) {
        const data = await res.json();
        const song = Array.isArray(data?.data) ? data.data[0] : data?.data;
        if (song?.id) return song;
        if (data?.data?.id) return data.data;
      }
    } catch {}
  }
  try {
    const res = await fetchWithTimeout(`${SAAVN_FB}/song?id=${rawId}`, {}, 6000);
    if (res && res.ok) {
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
  for (const api of SAAVN_APIS) {
    try {
      const res = await fetchWithTimeout(`${api}/songs/${ids.join(',')}`, {}, 6000);
      if (res && res.ok) {
        const data = await res.json();
        const list = data?.data?.songs || (Array.isArray(data?.data) ? data.data : []);
        if (list.length > 0) return list;
      }
    } catch {}
  }
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
  let artists = 'Unknown';
  if (s.artists?.primary?.length) artists = s.artists.primary.map(a => a.name).join(', ');
  else if (s.artists?.featured?.length) artists = s.artists.featured.map(a => a.name).join(', ');
  else if (s.primaryArtists) artists = s.primaryArtists;
  else if (s.singers) artists = s.singers;
  else if (typeof s.primary_artists === 'string') artists = s.primary_artists;
  else if (s.more_info?.singers) artists = s.more_info.singers;
  else if (s.artist) artists = s.artist;
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
  const rawAudio = url320 || url160 || url96 || s.more_info?.vlink || null;
  const rawId = extractId(s);
  if (!rawAudio) return {
    id: `saavn-${rawId}`,
    title: s.name || s.song || s.title || 'Unknown',
    artist: artists, album, year, duration: dur, coverUrl,
    audioUrl: null, allAudioUrls: [], rawAudioUrls: [],
    genre: s.language || s.more_info?.language || '',
    source: 'saavn', downloadable: false, _saavnId: rawId,
  };
  return {
    id: `saavn-${rawId}`,
    title: s.name || s.song || s.title || 'Unknown',
    artist: artists, album, year, duration: dur, coverUrl,
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
    genre: s.language || s.more_info?.language || '',
    source: 'saavn', downloadable: true, _saavnId: rawId,
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
    const res = await fetchWithTimeout(`https://music.youtube.com/youtubei/v1/search?key=${import.meta.env.VITE_YT_KEY || ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'com.google.android.apps.youtube.music/6.42.52' },
      body: JSON.stringify(body),
    }, 6000);
    if (!res || !res.ok) return [];
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
      results.push({
        id: videoIds[i], title: titles[i] || 'Unknown', channel: '',
        thumbnail: `https://i.ytimg.com/vi/${videoIds[i]}/hqdefault.jpg`,
        duration: 0, url: null,
      });
    }
    return results.map(normalizeYtResult).filter(Boolean).filter(s => s.duration > 10 || s.audioUrl);
  } catch {}
  return [];
}

async function fetchSaavnSearchRaw(query, limit) {
  for (const api of SAAVN_APIS) {
    try {
      const res = await fetchWithTimeout(`${api}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`, {}, 6000);
      if (res && res.ok) {
        const data = await res.json();
        const results = data?.data?.results || [];
        if (results.length > 0) return results;
      }
    } catch {}
  }
  try {
    const res = await fetchWithTimeout(`${SAAVN_FB}/search?query=${encodeURIComponent(query)}&limit=${limit}`, {}, 6000);
    if (res && res.ok) {
      const data = await res.json();
      const results = data?.results || [];
      if (results.length === 0) return [];
      const ids = results.map(r => r.id).filter(Boolean);
      if (ids.length > 0) {
        const fullSongs = await fetchBatchByIds(ids);
        if (fullSongs.length > 0) return fullSongs;
      }
      return results.map(r => ({
        id: r.id,
        name: r.title || r.name,
        duration: r.duration || 0,
        image: r.images ? Object.entries(r.images).map(([q, url]) => ({ quality: q.replace('x', 'x'), url })) : (r.image ? [{ quality: '150x150', url: r.image }] : []),
        downloadUrl: r.download_url ? [{ quality: '320kbps', url: r.download_url }] : [],
        artists: { primary: r.more_info?.singers ? r.more_info.singers.split(', ').map(name => ({ name, role: 'singer' })) : [] },
        album: { name: r.album || '' },
        language: r.more_info?.language || '',
      }));
    }
  } catch {}
  return [];
}

async function fetchSaavnAlbums(query, limit) {
  for (const api of SAAVN_APIS) {
    try {
      const res = await fetchWithTimeout(`${api}/search/albums?query=${encodeURIComponent(query)}&limit=${limit}`, {}, 6000);
      if (res && res.ok) {
        const data = await res.json();
        const albums = data?.data?.results || [];
        if (albums.length > 0) {
          const albumIds = albums.map(a => a.id).filter(Boolean);
          const allSongs = [];
          for (const aid of albumIds.slice(0, 3)) {
            for (const api2 of SAAVN_APIS) {
              try {
                const aRes = await fetchWithTimeout(`${api2}/albums/${aid}`, {}, 6000);
                if (aRes && aRes.ok) {
                  const aData = await aRes.json();
                  const songs = aData?.data?.songs || [];
                  if (songs.length > 0) { allSongs.push(...songs); break; }
                }
              } catch {}
            }
          }
          return allSongs;
        }
      }
    } catch {}
  }
  try {
    const res = await fetchWithTimeout(`${SAAVN_FB}/album?id=${query}`, {}, 6000);
    if (res && res.ok) {
      const data = await res.json();
      return data?.songs || [];
    }
  } catch {}
  return [];
}

async function searchAndResolve(query, limit = 30) {
  const [searchResults, ytResults] = await Promise.all([
    fetchSaavnSearchRaw(query, limit).catch(() => []),
    searchYouTube(query, 10).catch(() => []),
  ]);
  const normalized = searchResults.map(normalizeSong).filter(Boolean);
  const withAudio = normalized.filter(s => s.audioUrl);

  const ytSeen = new Set();
  const addYt = (list) => {
    for (const s of list) {
      const title = (s.title || '').toLowerCase().trim();
      if (!ytSeen.has(title) && !withAudio.some(x =>
        (x.title || '').toLowerCase().trim() === title
      )) {
        ytSeen.add(title);
        withAudio.push(s);
      }
    }
  };
  addYt(ytResults);

  if (withAudio.length < limit) {
    const altQuery = !query.toLowerCase().includes('songs') ? `${query} songs` : `${query} album`;
    const [altResults, altYt] = await Promise.all([
      fetchSaavnSearchRaw(altQuery, Math.min(limit, 15)).catch(() => []),
      searchYouTube(altQuery, 6).catch(() => []),
    ]);
    for (const s of altResults.map(normalizeSong).filter(Boolean).filter(s => s.audioUrl)) {
      if (!withAudio.some(x => x.id === s.id)) withAudio.push(s);
    }
    addYt(altYt);
  }

  if (withAudio.length < 5) {
    const albumSongs = await fetchSaavnAlbums(query, 2).catch(() => []);
    for (const raw of albumSongs) {
      const norm = normalizeSong(raw);
      if (norm && norm.audioUrl && !withAudio.some(x => x.id === norm.id)) withAudio.push(norm);
    }
  }

  if (withAudio.length < 5) {
    const cleanQuery = query.replace(/songs|hits|album|classic/gi, '').trim();
    if (cleanQuery && cleanQuery !== query) {
      const [extraResults, extraYt] = await Promise.all([
        fetchSaavnSearchRaw(cleanQuery, 15).catch(() => []),
        searchYouTube(cleanQuery, 6).catch(() => []),
      ]);
      for (const s of extraResults.map(normalizeSong).filter(Boolean).filter(s => s.audioUrl)) {
        if (!withAudio.some(x => x.id === s.id)) withAudio.push(s);
      }
      addYt(extraYt);
    }
  }

  return withAudio;
}

const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  searchCache.delete(key);
  return null;
}

function setCache(key, data) {
  if (searchCache.size > 200) {
    const oldest = searchCache.keys().next().value;
    searchCache.delete(oldest);
  }
  searchCache.set(key, { data, ts: Date.now() });
}

export async function searchSongs(query, limit = 40) {
  const cacheKey = `songs:${query}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const results = await Promise.race([
    searchAndResolve(query, Math.min(limit, 50)),
    new Promise(resolve => setTimeout(() => resolve([]), 12000)),
  ]);
  const deduped = dedupe(results || []);
  setCache(cacheKey, deduped);
  return deduped;
}

export async function searchSaavn(query, limit = 20) {
  return searchSongs(query, limit);
}

export async function searchSaavnWithYoutube(query, limit = 20) {
  return searchSongs(query, limit);
}

export async function searchArtistSongs(artistName, limit = 50) {
  const queries = [
    `${artistName} songs`, `${artistName} hits`, `${artistName} album`,
    artistName,
    `${artistName} tamil`, `${artistName} hindi`, `${artistName} kannada`,
    `${artistName} telugu`, `${artistName} malayalam`, `${artistName} bengali`,
    `${artistName} punjabi`, `${artistName} marathi`,
  ];
  const results = [];
  for (const q of queries) {
    const batch = await searchSongs(q, Math.ceil(limit / queries.length));
    results.push(...batch);
    if (results.length >= limit) break;
  }
  return dedupe(results).slice(0, limit);
}

export async function searchYouTubeAlbums(albumName, artistName = '', limit = 15) {
  const query = artistName ? `${albumName} ${artistName} album` : `${albumName} album songs`;
  return searchYouTube(query, limit);
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
  for (const api of SAAVN_APIS) {
    try {
      const res = await fetchWithTimeout(`${api}/songs/${rawId}/lyrics`, {}, 8000);
      if (res && res.ok) {
        const data = await res.json();
        const lyrics = data?.data?.lyrics || data?.lyrics || null;
        if (lyrics) {
          const clean = lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
          if (clean.length > 10) return clean;
        }
      }
    } catch {}
  }
  try {
    const res = await fetchWithTimeout(`${SAAVN_FB}/lyrics?id=${rawId}`, {}, 8000);
    if (res && res.ok) {
      const data = await res.json();
      const lyrics = data?.lyrics || null;
      if (lyrics) {
        const clean = lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
        if (clean.length > 10) return clean;
      }
    }
  } catch {}
  return null;
}

const tryLrclib = async (artist, title) => {
  try {
    const params = new URLSearchParams({ track_name: title });
    if (artist) params.set('artist_name', artist);
    const res = await fetchWithTimeout(`${LRCLIB}/api/search?${params.toString()}`, {}, 8000);
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const best = data.find(l => l.syncedLyrics) || data[0];
        return best.syncedLyrics || best.plainLyrics || null;
      }
    }
  } catch {}
  return null;
};

const tryLrclibGet = async (artist, title) => {
  try {
    const params = new URLSearchParams({});
    if (artist) params.set('artist_name', artist);
    params.set('track_name', title);
    const res = await fetchWithTimeout(`${LRCLIB}/api/get?${params.toString()}`, {}, 8000);
    if (res && res.ok) {
      const data = await res.json();
      if (data) return data.syncedLyrics || data.plainLyrics || null;
    }
  } catch {}
  return null;
};

const tryLyricsOvh = async (artist, title) => {
  try {
    const res = await fetchWithTimeout(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {}, 6000);
    if (res && res.ok) {
      const data = await res.json();
      return data?.lyrics || null;
    }
  } catch {}
  return null;
};

const tryNetease = async (artist, title) => {
  try {
    const q = `${artist} ${title}`.trim();
    const res = await fetchWithTimeout(`https://music.163.com/api/search/get/web?s=${encodeURIComponent(q)}&type=1&limit=3`, {}, 6000);
    if (res && res.ok) {
      const data = await res.json();
      const songs = data?.result?.songs || [];
      if (songs.length > 0) {
        const songId = songs[0].id;
        const lrcRes = await fetchWithTimeout(`https://music.163.com/api/song/lyric?id=${songId}&lv=1`, {}, 6000);
        if (lrcRes && lrcRes.ok) {
          const lrcData = await lrcRes.json();
          const lrc = lrcData?.lrc?.lyric;
          if (lrc && lrc.length > 10) return lrc;
        }
      }
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
  const cleanTitle = songTitle
    .replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '')
    .replace(/feat\.?.*/i, '').replace(/ft\.?.*/i, '')
    .replace(/-\s*(Remix|Version|Edited|Reprise|Unplugged|Live|Acoustic|Club|Extended|Remastered|Original).*/i, '')
    .replace(/\d{4}/g, '').trim();

  if (!cleanTitle) return null;

  const simpler = songTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/feat\.?.*/i, '').replace(/ft\.?.*/i, '').trim();

  const titleVariations = [cleanTitle];
  if (simpler && simpler !== cleanTitle) titleVariations.push(simpler);
  if (songTitle !== cleanTitle && songTitle !== simpler) titleVariations.push(songTitle);

  for (const title of titleVariations) {
    const lrclib = await tryLrclib(cleanArtist, title);
    if (lrclib) return lrclib;
  }
  for (const title of titleVariations) {
    const lrclibGet = await tryLrclibGet(cleanArtist, title);
    if (lrclibGet) return lrclibGet;
  }
  for (const title of titleVariations) {
    if (!cleanArtist) continue;
    const ovh = await tryLyricsOvh(cleanArtist, title);
    if (ovh) return ovh;
  }
  for (const title of titleVariations) {
    const netease = await tryNetease(cleanArtist, title);
    if (netease) return netease;
  }
  for (const title of titleVariations) {
    const lrclib = await tryLrclib('', title);
    if (lrclib) return lrclib;
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
