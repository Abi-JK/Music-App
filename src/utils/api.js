// ---------------------------------------------------------------------------
// SoundAura — JioSaavn ONLY (full Indian songs 4-5 min, all languages)
// All JioSaavn audio proxied via Netlify Edge Function (bypasses CDN blocks)
// No Audius, no iTunes — only Indian full songs with lyrics
// ---------------------------------------------------------------------------

// ── JioSaavn (full Indian songs) ──────────────────────────────────────────
const SAAVN_API = 'https://saavn.sumit.co/api';
const SAAVN_FALLBACK = 'https://jiosaavn-api.vercel.app';

function streamProxy(cdnUrl) {
  if (!cdnUrl) return null;
  return `/api/stream-audio?url=${encodeURIComponent(cdnUrl)}`;
}

function normSaavnResult(s) {
  const dur = typeof s.duration === 'number' ? s.duration : 0;
  if (dur > 0 && dur < 60) return null;
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

async function searchSaavnMain(query, limit = 20) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(`${SAAVN_API}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const results = data?.data?.results || [];
      const songs = results.map(normSaavnResult).filter(Boolean).filter(s => s.audioUrl);
      if (songs.length > 0) return songs;
    }
  } catch { /* try fallback */ }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${SAAVN_FALLBACK}/search?query=${encodeURIComponent(query)}&limit=${limit}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.results) return [];
    const toResolve = data.results.slice(0, Math.min(limit, 15));
    const resolved = await Promise.allSettled(
      toResolve.map(async (r) => {
        const sRes = await fetch(`${SAAVN_FALLBACK}/song?id=${r.id}`);
        if (!sRes.ok) return null;
        const d = await sRes.json();
        if (!d?.status || !d.id) return null;
        const durParts = (d.duration || '').split(':');
        const durSec = durParts.length === 2 ? parseInt(durParts[0]) * 60 + parseInt(durParts[1]) : 0;
        if (durSec > 0 && durSec < 60) return null;
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
          rawAudioUrls: [
            ...(raw320 ? [{ quality: '320kbps', url: raw320 }] : []),
            ...(raw160 ? [{ quality: '160kbps', url: raw160 }] : []),
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

async function proxySearch(query, limit = 20) {
  return searchSaavnMain(query, limit);
}

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
      rawAudioUrls: [
        ...(raw320 ? [{ quality: '320kbps', url: raw320 }] : []),
        ...(raw160 ? [{ quality: '160kbps', url: raw160 }] : []),
      ],
    };
  } catch { return null; }
}

export { retrySaavnSong };

async function proxyLyrics(id) {
  const rawId = String(id).replace('saavn-', '');

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://jiosaavn-api.vercel.app/lyrics?id=${rawId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const lyrics = data?.lyrics || null;
      if (lyrics) return lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
    }
  } catch { /* try next */ }

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
  } catch { /* no lyrics */ }

  return null;
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
  const results = await withTimeout(proxySearch(query, Math.min(limit, 50)), 15000);
  return dedupe(results || []);
}

export async function searchSaavn(query, limit = 20) {
  return proxySearch(query, limit);
}

export async function searchArtistSongs(artistName, limit = 50) {
  const results = await withTimeout(proxySearch(artistName, Math.min(limit, 50)), 15000);
  return dedupe(results || []);
}

export async function fetchLyrics(songId, songTitle, artistName) {
  if (String(songId).startsWith('saavn-')) {
    const lyrics = await proxyLyrics(songId);
    if (lyrics && lyrics.length > 10) return lyrics;
  }

  if (!songTitle) return null;
  const cleanArtist = artistName ? artistName.split(',')[0].split('&')[0].trim() : '';
  const cleanTitle = songTitle.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

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
    } catch { /* ignore */ }
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
    } catch { /* ignore */ }
    return null;
  };

  const titleVariations = [cleanTitle];
  const simplerTitle = cleanTitle.replace(/feat\.?.*/i, '').replace(/ft\.?.*/i, '').trim();
  if (simplerTitle && simplerTitle !== cleanTitle) titleVariations.push(simplerTitle);
  const noYearTitle = cleanTitle.replace(/\d{4}/g, '').trim();
  if (noYearTitle && noYearTitle !== cleanTitle) titleVariations.push(noYearTitle);
  const noVersionTitle = cleanTitle.replace(/-\s*(Remix|Version|Edited|Reprise|Unplugged|Live|Acoustic|Club|Extended|Remastered|Original).*/i, '').trim();
  if (noVersionTitle && noVersionTitle !== cleanTitle) titleVariations.push(noVersionTitle);

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
  if (rawUrls && rawUrls.length > 0) {
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
