const SAavnAPI = '/saavn-search';

async function safeFetch(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(res.status);
  const json = await res.json();
  if (json.status === 'SUCCESS') return json.data;
  throw new Error(json.message || 'API error');
}

function normSong(s) {
  const imageArr = s.image || [];
  const cover = imageArr.find(i => i.quality === '500x500') || imageArr.find(i => i.quality === '150x150') || imageArr[0];
  const dlArr = s.downloadUrl || [];
  const best = dlArr.find(d => d.quality === '320kbps') || dlArr.find(d => d.quality === '160kbps') || dlArr.find(d => d.quality === '96kbps') || dlArr[dlArr.length - 1];
  return {
    id: s.id,
    title: s.name || 'Unknown',
    artist: s.primaryArtists || 'Unknown Artist',
    album: s.album?.name || '',
    year: s.year || '',
    duration: parseInt(s.duration, 10) || 0,
    coverUrl: cover?.link || null,
    audioUrl: best?.link || null,
    language: s.language || '',
    label: s.label || '',
    copyright: s.copyright || '',
    hasLyrics: s.hasLyrics === 'true',
    albumUrl: s.album?.url || null,
    albumId: s.album?.id || null,
  };
}

export async function searchSongs(query, limit = 40) {
  const url = `${SAavnAPI}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
  const data = await safeFetch(url);
  const results = data?.results || [];
  return results.map(normSong).filter(s => s.id && s.audioUrl);
}

export async function getStreamUrl(songId) {
  try {
    const data = await safeFetch(`${SAavnAPI}/songs?id=${songId}`);
    const song = Array.isArray(data) ? data[0] : data;
    if (song) {
      const normed = normSong(song);
      return { audioUrl: normed.audioUrl, streamUrl: normed.audioUrl };
    }
  } catch { /* fallback */ }
  return { audioUrl: null, streamUrl: null };
}

export async function fetchAlbumSongs(albumId, limit = 30) {
  try {
    const data = await safeFetch(`${SAavnAPI}/albums?id=${albumId}`);
    const songs = (data?.songs || []).map(normSong).filter(s => s.id && s.audioUrl);
    return songs.slice(0, limit);
  } catch {
    return [];
  }
}
