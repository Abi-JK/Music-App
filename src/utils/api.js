import { API } from './constants';
import { decodeHtml, parseDuration } from './helpers';

const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function safeFetch(url, signal) {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(res.status);
    const text = await res.text();
    if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) throw new Error('HTML');
    return JSON.parse(text);
  } catch {
    if (signal?.aborted) throw new Error('Aborted');
  }
  for (const makeProxy of CORS_PROXIES) {
    try {
      const res = await fetch(makeProxy(url), { signal });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) continue;
      return JSON.parse(text);
    } catch { /* next */ }
  }
  throw new Error('All endpoints failed');
}

function normSong(s) {
  const artist = decodeHtml(s.primary_artists || s.singers || '');
  const image = (s.image || '').replace('150x150', '500x500');
  return {
    id: s.id,
    title: decodeHtml(s.song || s.title || 'Unknown'),
    artist: artist || 'Unknown Artist',
    album: decodeHtml(s.album || ''),
    year: s.year || '',
    duration: parseDuration(s.duration),
    coverUrl: image || null,
    audioUrl: null,
    quality: '320kbps',
    language: s.language || '',
    label: decodeHtml(s.label || ''),
    hasLyrics: s.has_lyrics === 'true' || s.has_lyrics === true,
    mediaPreview: s.media_preview_url || null,
    albumUrl: s.album_url || null,
  };
}

export async function searchSongs(query, limit = 40) {
  const pageSize = Math.min(limit, 40);
  const pages = limit > 40 ? 2 : 1;
  const fetches = [];
  for (let p = 1; p <= pages; p++) {
    fetches.push(
      safeFetch(`${API}?__call=search.getResults&q=${encodeURIComponent(query)}&_format=json&_marker=0&cc=in&p=${p}&n=${pageSize}`).catch(() => ({ results: [] }))
    );
  }
  const results = await Promise.all(fetches);
  const seen = new Set();
  const songs = [];
  for (const page of results) {
    for (const s of (page.results || [])) {
      if (s?.id && s?.song && !seen.has(s.id)) {
        seen.add(s.id);
        songs.push(normSong(s));
      }
    }
  }
  if (songs.length > 0) return songs.slice(0, limit);

  // Fallback: autocomplete -> getDetails
  try {
    const auto = await safeFetch(`${API}?__call=autocomplete.get&cc=in&includeMetaTags=1&_format=json&_marker=0&q=${encodeURIComponent(query)}`);
    const pids = (auto?.songs?.data || []).map(s => s.id).filter(Boolean).slice(0, limit);
    if (!pids.length) return [];
    const detail = await safeFetch(`${API}?__call=song.getDetails&pids=${pids.join(',')}&_format=json&_marker=0&ctx=web6dot0`);
    return (detail?.songs || []).map(normSong).filter(s => s.id).slice(0, limit);
  } catch {
    return [];
  }
}

export async function getStreamUrl(songId) {
  try {
    const j = await safeFetch(`${API}?__call=song.getDetails&pids=${songId}&_format=json&_marker=0&ctx=web6dot0`);
    const song = j?.songs?.[0];
    if (song?.media_url) {
      const streamUrl = `/saavn-stream${new URL(song.media_url).pathname}`;
      return { audioUrl: song.media_url, streamUrl };
    }
  } catch { /* fallback */ }
  return { audioUrl: null, streamUrl: null };
}

export async function fetchPlaylistSongs(listId, limit = 20) {
  try {
    const j = await safeFetch(`${API}?__call=playlist.getDetails&id=${listId}&_format=json&_marker=0&cc=in&includeMetaTags=1`);
    const songs = (j?.songs || []).map(normSong).filter(s => s.id);
    return songs.slice(0, limit);
  } catch {
    return [];
  }
}
