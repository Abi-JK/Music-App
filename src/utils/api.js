// ---------------------------------------------------------------------------
// SoundAura — JioSaavn primary + multiple API fallbacks
// All audio proxied via Netlify Edge Function
// ---------------------------------------------------------------------------

const SAAVN_APIS = [
  'https://saavn.sumit.co/api',
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
      const res = await fetchWithTimeout(`${api}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`, {}, 8000);
      if (res && res.ok) {
        const data = await res.json();
        const results = data?.data?.results || data?.data || data?.results || [];
        const songs = Array.isArray(results) ? results : [];
        if (songs.length > 0) return songs;
      }
    } catch {}
  }
  try {
    const res = await fetchWithTimeout(`${SAAVN_FB}/search?query=${encodeURIComponent(query)}&limit=${limit}`, {}, 8000);
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

// --- JioSaavn Artist API (paginated, gives 400-500+ songs) ---
async function fetchArtistsByQuery(query, limit = 5) {
  for (const api of SAAVN_APIS) {
    try {
      const res = await fetchWithTimeout(
        `${api}/search/artists?query=${encodeURIComponent(query)}&limit=${limit}`, {}, 6000
      );
      if (res && res.ok) {
        const data = await res.json();
        const artists = data?.data?.results || [];
        if (artists.length > 0) return artists;
      }
    } catch {}
  }
  return [];
}

async function fetchArtistSongsByIdPaged(artistId, maxPages = 50) {
  const allSongs = [];
  const seenIds = new Set();
  let emptyPages = 0;

  for (let page = 1; page <= maxPages; page++) {
    let gotSongs = false;
    for (const api of SAAVN_APIS) {
      try {
        const res = await fetchWithTimeout(
          `${api}/artists/${artistId}/songs?page=${page}`, {}, 15000
        );
        if (res && res.ok) {
          const data = await res.json();
          const songs = data?.data?.songs || data?.data?.results || data?.data || [];
          if (Array.isArray(songs) && songs.length > 0) {
            for (const s of songs) {
              const rawId = String(s.id || '').replace(/^saavn-/, '');
              if (rawId && !seenIds.has(rawId)) {
                seenIds.add(rawId);
                allSongs.push(s);
              }
            }
            gotSongs = true;
            if (songs.length < 5) emptyPages++;
            else emptyPages = 0;
            if (emptyPages >= 2) { page = maxPages + 1; break; }
            break;
          } else {
            emptyPages++;
            if (emptyPages >= 2) { page = maxPages + 1; break; }
            gotSongs = true;
            break;
          }
        }
      } catch {}
    }
    if (!gotSongs) {
      emptyPages++;
      if (emptyPages >= 3) break;
    }
  }
  return allSongs;
}

// --- JioSaavn Album API (full album by ID) ---
async function fetchAlbumSongsById(albumId) {
  for (const api of SAAVN_APIS) {
    try {
      const res = await fetchWithTimeout(`${api}/albums/${albumId}`, {}, 7000);
      if (res && res.ok) {
        const data = await res.json();
        const songs = data?.data?.songs || [];
        if (songs.length > 0) return { songs, info: data?.data };
      }
    } catch {}
  }
  return { songs: [], info: null };
}

export async function fetchAlbumByQuery(albumQuery) {
  for (const api of SAAVN_APIS) {
    try {
      const res = await fetchWithTimeout(
        `${api}/search/albums?query=${encodeURIComponent(albumQuery)}&limit=10`, {}, 6000
      );
      if (res && res.ok) {
        const data = await res.json();
        const albums = data?.data?.results || [];
        if (albums.length > 0) {
          // Try each album until we find one with songs
          for (const album of albums.slice(0, 5)) {
            const { songs, info } = await fetchAlbumSongsById(album.id);
            if (songs.length > 0) {
              return {
                albumId: album.id,
                albumInfo: info || album,
                songs: dedupe(songs.map(normalizeSong).filter(Boolean))
              };
            }
          }
        }
      }
    } catch {}
  }
  return null;
}

async function enrichWithoutAudio(song) {
  const rawId = song._saavnId || String(song.id || '').replace('saavn-', '');
  if (!rawId) return song;
  const full = await fetchSongById(rawId);
  if (!full) return song;
  const fixed = normalizeSong(full);
  if (fixed && fixed.audioUrl) return fixed;
  return song;
}

async function searchAndResolve(query, limit = 50) {
  let searchResults = await fetchSaavnSearchRaw(query, Math.min(limit, 100)).catch(() => []);
  if (searchResults.length === 0) {
    searchResults = await fetchSaavnSearchRaw(`${query} songs`, Math.min(limit, 100)).catch(() => []);
  }
  const normalized = searchResults.map(normalizeSong).filter(Boolean);
  let withAudio = dedupe(normalized.filter(s => s.audioUrl));
  const noAudio = normalized.filter(s => !s.audioUrl && s._saavnId);

  if (noAudio.length > 0) {
    const enriched = await Promise.allSettled(
      dedupe(noAudio).slice(0, 15).map(s => enrichWithoutAudio(s))
    );
    for (const r of enriched) {
      if (r.status === 'fulfilled' && r.value?.audioUrl && !withAudio.some(x => x.id === r.value.id)) {
        withAudio.push(r.value);
      }
    }
  }

  return dedupe(withAudio);
}

const searchCache = new Map();
const artistCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const ARTIST_CACHE_TTL = 30 * 60 * 1000;

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

export async function searchSongs(query, limit = 50) {
  const cacheKey = `songs:${query}:${limit}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const results = await Promise.race([
    searchAndResolve(query, Math.min(limit, 100)),
    new Promise(resolve => setTimeout(() => resolve([]), 15000)),
  ]);
  const deduped = dedupe(results || []);
  setCache(cacheKey, deduped);
  return deduped;
}

export async function searchSaavn(query, limit = 30) {
  return searchSongs(query, limit);
}

export async function searchSaavnWithYoutube(query, limit = 20) {
  return searchSongs(query, limit);
}

async function batchEnrichSongs(songs) {
  const ids = songs.map(s => s._saavnId).filter(Boolean);
  if (ids.length === 0) return [];
  const batches = [];
  for (let i = 0; i < ids.length; i += 20) {
    batches.push(ids.slice(i, i + 20));
  }
  const allFixed = [];
  for (const batch of batches) {
    const fullSongs = await fetchBatchByIds(batch).catch(() => []);
    for (const raw of fullSongs) {
      const norm = normalizeSong(raw);
      if (norm && norm.audioUrl) allFixed.push(norm);
    }
  }
  return allFixed;
}

export async function searchArtistSongs(artistName, limit = 500) {
  const cacheKey = `artist:${artistName}:${limit}`;
  const cachedArtist = artistCache.get(cacheKey);
  if (cachedArtist && Date.now() - cachedArtist.ts < ARTIST_CACHE_TTL) return cachedArtist.data;

  const results = [];
  const seenIds = new Set();

  const addSongs = (songs) => {
    for (const s of songs) {
      if (s && s.id && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        results.push(s);
      }
    }
  };

  try {
    const artists = await fetchArtistsByQuery(artistName, 5);
    if (artists.length > 0) {
      for (const artist of artists.slice(0, 3)) {
        const rawSongs = await fetchArtistSongsByIdPaged(artist.id, 50);
        if (rawSongs.length > 0) {
          const normalized = rawSongs.map(normalizeSong).filter(Boolean);
          const withAudio = normalized.filter(s => s.audioUrl);
          const noAudio = normalized.filter(s => !s.audioUrl && s._saavnId);

          addSongs(withAudio);

          if (noAudio.length > 0) {
            const enriched = await batchEnrichSongs(noAudio.slice(0, 100));
            addSongs(enriched);
          }
        }
      }
    }
  } catch {}

  if (results.length >= limit) return dedupe(results).slice(0, limit);

  const fallbackQueries = [
    `${artistName} songs`, `${artistName} hits`, `${artistName} album`,
    `${artistName} tamil songs`, `${artistName} hindi songs`, `${artistName} kannada songs`,
    `${artistName} telugu songs`, `${artistName} malayalam songs`, `${artistName} bengali songs`,
    `${artistName} punjabi songs`, `${artistName} marathi songs`, `${artistName} old songs`,
    `${artistName} classic`, `${artistName} devotional`, `${artistName} romantic songs`,
    `${artistName} sad songs`, `${artistName} dance songs`, `${artistName} melody songs`,
    `${artistName} duet`, `${artistName} love songs`, `${artistName} evergreen`,
    `${artistName} film songs`, `${artistName} movie songs`,
    `${artistName} 2025`, `${artistName} 2024`, `${artistName} 2023`,
    `${artistName} 2022`, `${artistName} 2021`, `${artistName} 2020`,
    `${artistName} 2019`, `${artistName} 2018`, `${artistName} 2017`,
    `${artistName} 2015`, `${artistName} 2010`, `${artistName} 2005`,
    `${artistName} 2000`, `${artistName} 90s`, `${artistName} 80s`,
    `${artistName} 70s`, `${artistName} 60s`,
  ];

  if (artistName.toLowerCase().includes('yesudas') || artistName.toLowerCase().includes('k.j. yesudas')) {
    fallbackQueries.push('K.J. Yesudas tamil', 'K.J. Yesudas hindi', 'K.J. Yesudas kannada',
      'K.J. Yesudas malayalam', 'K.J. Yesudas telugu', 'K.J. Yesudas devotional',
      'K.J. Yesudas old', 'K.J. Yesudas classic', 'K.J. Yesudas melody',
      'K.J. Yesudas romantic', 'Yesudas hits', 'Yesudas evergreen',
      'K.J. Yesudas bengali', 'K.J. Yesudas konkani', 'K.J. Yesudas tulu',
      'K.J. Yesudas 80s', 'K.J. Yesudas 90s', 'K.J. Yesudas 70s',
      'K.J. Yesudas ghazal', 'K.J. Yesudas bhajan', 'K.J. Yesudas film songs',
      'Yesudas Ilaiyaraaja', 'Yesudas MSV', 'Yesudas KS Chithra',
      'K.J. Yesudas ar Rahman', 'K.J. Yesudas yesudas');
  }
  if (artistName.toLowerCase().includes('ilaiyaraaja') || artistName.toLowerCase().includes('ilayaraja')) {
    fallbackQueries.push('Ilaiyaraaja tamil', 'Ilaiyaraaja hindi', 'Ilaiyaraaja telugu',
      'Ilaiyaraaja kannada', 'Ilaiyaraaja malayalam', 'Ilaiyaraaja bengali',
      'Ilaiyaraaja 80s', 'Ilaiyaraaja 90s', 'Ilaiyaraaja 70s', 'Ilaiyaraaja 2000s',
      'Ilaiyaraaja instrumental', 'Ilaiyaraaja devotional', 'Ilaiyaraaja melody',
      'Ilaiyaraaja romantic', 'Ilaiyaraaja evergreen', 'Ilaiyaraaja classic',
      'Ilaiyaraaja sad songs', 'Ilaiyaraaja love songs', 'Ilaiyaraaja folk',
      'Ilaiyaraaja classical', 'Ilaiyaraaja kuthu', 'Ilaiyaraaja mass',
      'Ilaiyaraaja old tamil', 'Ilaiyaraaja hits', 'Ilaiyaraaja film songs',
      'Ilaiyaraaja yesudas', 'Ilaiyaraaja spb', 'Ilaiyaraaja swarnalatha',
      'Ilaiyaraaja janaki', 'Ilaiyaraaja s.p.b.');
  }
  if (artistName.toLowerCase().includes('sonu nigam')) {
    fallbackQueries.push('Sonu Nigam kannada', 'Sonu Nigam telugu', 'Sonu Nigam tamil',
      'Sonu Nigam devotional', 'Sonu Nigam romantic', 'Sonu Nigam sad',
      'Sonu Nigam melody', 'Sonu Nigam love songs', 'Sonu Nigam film songs',
      'Sonu Nigam 90s', 'Sonu Nigam 2000s', 'Sonu Nigam 2010s',
      'Sonu Nigam old songs', 'Sonu Nigam hits', 'Sonu Nigam best songs',
      'Sonu Nigam duet', 'Sonu Nigam dance', 'Sonu Nigam classical',
      'Sonu Nigam 2024', 'Sonu Nigam 2023', 'Mayavi kannada');
  }
  if (artistName.toLowerCase().includes('sid sriram')) {
    fallbackQueries.push('Sid Sriram telugu', 'Sid Sriram tamil', 'Sid Sriram kannada',
      'Sid Sriram hindi', 'Sid Sriram malayalam', 'Sid Sriram bengali',
      'Sid Sriram 2022', 'Sid Sriram 2023', 'Sid Sriram 2024', 'Sid Sriram 2025',
      'Sid Sriram love', 'Sid Sriram melody', 'Sid Sriram romantic',
      'Sid Sriram enna', 'Sid Sriram thangamey', 'Sid Sriram manikya',
      'Sid Sriram AR Rahman', 'Sid Sriram Anirudh', 'Sid Sriram Ilaiyaraaja',
      'Sid Sriram DSP', 'Sid Sriram Thaman', 'Sid Sriram GV Prakash',
      'Sid Sriram Santhosh Narayanan', 'Sid Sriram Yuvan',
      'Ponniyin Selvan songs', 'Petta songs', 'Master songs', 'Vikram songs',
      'Karthik Subbaraj songs', 'Lokesh Kanagaraj songs',
      'Sid Sriram old songs', 'Sid Sriram film songs', 'Sid Sriram movie songs',
      'Sid Sriram hits', 'Sid Sriram best songs', 'Sid Sriram recent songs');
  }
  if (artistName.toLowerCase().includes('ar rahman') || artistName.toLowerCase().includes('a.r. rahman')) {
    fallbackQueries.push('A.R. Rahman tamil', 'A.R. Rahman hindi', 'A.R. Rahman telugu',
      'A.R. Rahman kannada', 'A.R. Rahman malayalam', 'A.R. Rahman bengali',
      'A.R. Rahman 90s', 'A.R. Rahman 2000s', 'A.R. Rahman 2010s', 'A.R. Rahman 2020s',
      'A.R. Rahman Oscar', 'A.R. Rahman classic', 'A.R. Rahman evergreen',
      'A.R. Rahman romantic', 'A.R. Rahman devotional', 'A.R. Rahman folk',
      'A.R. Rahman film songs', 'A.R. Rahman hits', 'A.R. Rahman old songs',
      'A.R. Rahman new songs', 'A.R. Rahman Roja', 'A.R. Rahman Bombay',
      'A.R. Rahman Dil Se', 'A.R. Rahman Lagaan', 'A.R. Rahman Slumdog');
  }
  if (artistName.toLowerCase().includes('pritam')) {
    fallbackQueries.push('Pritam hindi', 'Pritam bengali', 'Pritam 2024', 'Pritam 2023',
      'Pritam romantic', 'Pritam party', 'Pritam sad');
  }
  if (artistName.toLowerCase().includes('anirudh')) {
    fallbackQueries.push('Anirudh tamil', 'Anirudh telugu', 'Anirudh kannada',
      'Anirudh hindi', 'Anirudh malayalam',
      'Anirudh 2024', 'Anirudh 2023', 'Anirudh 2022', 'Anirudh 2025',
      'Anirudh mass', 'Anirudh melody', 'Anirudh bgm', 'Anirudh romantic',
      'Anirudh love songs', 'Anirudh sad songs', 'Anirudh dance songs',
      'Anirudh film songs', 'Anirudh movie songs', 'Anirudh hits',
      'Anirudh best songs', 'Anirudh old songs', 'Anirudh new songs',
      'Anirudh Vikram', 'Anirudh Jailer', 'Anirudh Leo', 'Anirudh Master');
  }
  if (artistName.toLowerCase().includes('shreya ghoshal') || artistName.toLowerCase().includes('shreya')) {
    fallbackQueries.push('Shreya Ghoshal tamil', 'Shreya Ghoshal hindi', 'Shreya Ghoshal telugu',
      'Shreya Ghoshal kannada', 'Shreya Ghoshal malayalam', 'Shreya Ghoshal bengali',
      'Shreya Ghoshal marathi', 'Shreya Ghoshal punjabi',
      'Shreya Ghoshal romantic', 'Shreya Ghoshal melody', 'Shreya Ghoshal sad',
      'Shreya Ghoshal love songs', 'Shreya Ghoshal film songs', 'Shreya Ghoshal hits',
      'Shreya Ghoshal old songs', 'Shreya Ghoshal new songs',
      'Shreya Ghoshal 2024', 'Shreya Ghoshal 2023', 'Shreya Ghoshal 2022',
      'Shreya Ghoshal duet', 'Shreya Ghoshal classical');
  }
  if (artistName.toLowerCase().includes('spb') || artistName.toLowerCase().includes('balasubrahmanyam')) {
    fallbackQueries.push('S.P. Balasubrahmanyam tamil', 'S.P. Balasubrahmanyam telugu',
      'S.P. Balasubrahmanyam kannada', 'S.P. Balasubrahmanyam hindi',
      'S.P. Balasubrahmanyam malayalam', 'S.P. Balasubrahmanyam bengali',
      'S.P. Balasubrahmanyam evergreen', 'S.P.B. classic', 'S.P.B. old songs',
      'S.P. Balasubrahmanyam romantic', 'S.P. Balasubrahmanyam melody',
      'S.P. Balasubrahmanyam devotional', 'S.P.B. hits',
      'S.P. Balasubrahmanyam film songs', 'S.P.B. Ilaiyaraaja',
      'S.P. Balasubrahmanyam MSV', 'S.P.B. 80s', 'S.P.B. 90s',
      'S.P. Balasubrahmanyam SPB');
  }
  if (artistName.toLowerCase().includes('lata') || artistName.toLowerCase().includes('mangeshkar')) {
    fallbackQueries.push('Lata Mangeshkar hindi', 'Lata Mangeshkar marathi', 'Lata Mangeshkar classic',
      'Lata Mangeshkar evergreen', 'Lata Mangeshkar romantic', 'Lata Mangeshkar sad',
      'Lata Mangeshkar devotional', 'Lata Mangeshkar film songs', 'Lata Mangeshkar hits',
      'Lata Mangeshkar 60s', 'Lata Mangeshkar 70s', 'Lata Mangeshkar 80s',
      'Lata Mangeshkar old songs', 'Lata Mangeshkar best songs', 'Lata Mangeshkar duet',
      'Lata Mangeshkar melody', 'Lata Mangeshkar love songs');
  }
  if (artistName.toLowerCase().includes('kishore kumar')) {
    fallbackQueries.push('Kishore Kumar hindi', 'Kishore Kumar classic', 'Kishore Kumar evergreen',
      'Kishore Kumar romantic', 'Kishore Kumar sad', 'Kishore Kumar devotional',
      'Kishore Kumar film songs', 'Kishore Kumar hits', 'Kishore Kumar best songs',
      'Kishore Kumar 70s', 'Kishore Kumar 80s', 'Kishore Kumar 60s',
      'Kishore Kumar old songs', 'Kishore Kumar duet', 'Kishore Kumar melody',
      'Kishore Kumar dance', 'Kishore Kumar comedy songs');
  }

  const BATCH_SIZE = 8;
  for (let i = 0; i < fallbackQueries.length; i += BATCH_SIZE) {
    if (results.length >= limit) break;
    const batch = fallbackQueries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(q => searchSongs(q, 40).catch(() => [])));
    for (const r of batchResults) addSongs(r);
  }

  const final = dedupe(results).slice(0, limit);
  artistCache.set(cacheKey, { data: final, ts: Date.now() });
  return final;
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
  const normalized = normalizeSong(fullSong);
  if (!normalized || !normalized.audioUrl) return null;
  return normalized;
}

export async function retrySaavnSong(song) {
  return fetchFreshUrls(song);
}

export async function fetchSharedSongs(limit = 200) {
  try {
    const res = await fetchWithTimeout(`/api/shared-songs?limit=${limit}`, {}, 8000);
    if (res && res.ok) {
      const data = await res.json();
      const songs = data.songs || [];
      return songs.map(s => ({
        ...s,
        source: 'shared',
        _sharedQuery: `${s.title} ${s.artist}`,
      }));
    }
  } catch {}
  return [];
}

export async function addSharedSong(song) {
  try {
    const res = await fetch('/api/shared-songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: song.title,
        artist: song.artist,
        album: song.album || '',
        genre: song.genre || '',
        coverUrl: song.coverUrl || '',
        addedBy: 'user',
      }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
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

const tryHindiLyrics = async (title) => {
  try {
    const q = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
    const res = await fetchWithTimeout(`https://lrclib.net/api/search?track_name=${encodeURIComponent(q)}`, {}, 6000);
    if (res && res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const hindi = data.find(l => l.language === 'Hindi') || data[0];
        return hindi.syncedLyrics || hindi.plainLyrics || null;
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
    .replace(/-\s*(Remix|Version|Edited|Reprise|Unplugged|Live|Acoustic|Club|Extended|Remastered|Original|From).*/i, '')
    .replace(/\d{4}/g, '').trim();

  if (!cleanTitle) return null;

  const simpler = songTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/feat\.?.*/i, '').replace(/ft\.?.*/i, '').trim();
  const noYear = cleanTitle.replace(/\d{4}/g, '').trim();

  const titleVariations = [cleanTitle];
  if (simpler && simpler !== cleanTitle) titleVariations.push(simpler);
  if (noYear && noYear !== cleanTitle) titleVariations.push(noYear);
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
    const lrclibNoArtist = await tryLrclib('', title);
    if (lrclibNoArtist) return lrclibNoArtist;
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
    const hindiLyrics = await tryHindiLyrics(title);
    if (hindiLyrics) return hindiLyrics;
  }

  return null;
}

export async function downloadAudioBlob(audioUrl, rawUrls) {
  const urlsToTry = [];
  if (rawUrls?.length) {
    for (const entry of rawUrls) {
      if (entry.url) {
        const proxied = streamProxy(entry.url);
        if (proxied) urlsToTry.push(proxied);
        urlsToTry.push(entry.url);
      }
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

function cleanTitle(t) {
  if (!t) return '';
  return t.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/feat\.?.*/i, '')
    .replace(/ft\.?.*/i, '')
    .replace(/[-–—:|]/g, ' ')
    .replace(/\d{4}/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitleForDedupe(t) {
  if (!t) return '';
  return t.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/feat\.?.*/i, '')
    .replace(/ft\.?.*/i, '')
    .replace(/instrumental|karaoke|ringtone|bgm|theme|background|unplugged|live|acoustic|club|extended|reprise|revisited|cover|tribute|version|edited|remastered|original|promo|teaser|trailer|full audio|full song|official video|lyrical video|video song|motion poster|audio|video|lyrics|jiosaavn|hd|mp3/gi, '')
    .replace(/[-–—:|]/g, ' ')
    .replace(/\d{4}/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupe(sources) {
  const seenIds = new Set();
  const seenNorm = new Set();
  const merged = [];
  for (const s of sources) {
    if (!s || !s.title) continue;
    if (s.id && seenIds.has(s.id)) continue;

    const titleKey = cleanTitleForDedupe(s.title);
    const firstArtist = (s.artist || '').split(',')[0].split('&')[0].split('/')[0].trim();
    const artistKey = cleanTitle(firstArtist).slice(0, 15);
    const normKey = `${titleKey}|${artistKey}`;

    if (normKey.length > 5 && seenNorm.has(normKey)) {
      continue;
    }

    if (s.id) seenIds.add(s.id);
    if (normKey.length > 5) seenNorm.add(normKey);
    merged.push(s);
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
