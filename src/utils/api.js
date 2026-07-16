const SAavnAPI = '/saavn-search';

async function safeFetch(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(res.status);
  const json = await res.json();
  if (json.status === 'SUCCESS') return json.data;
  throw new Error(json.message || 'API error');
}

function decodeHtml(str) {
  if (!str) return '';
  return str.replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&#039;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
}

function normSong(s) {
  const imageArr = s.image || [];
  const cover = imageArr.find(i => i.quality === '500x500') || imageArr.find(i => i.quality === '150x150') || imageArr[0];
  const dlArr = s.downloadUrl || [];
  const best = dlArr.find(d => d.quality === '320kbps') || dlArr.find(d => d.quality === '160kbps') || dlArr.find(d => d.quality === '96kbps') || dlArr[dlArr.length - 1];

  const allUrls = dlArr.map(d => ({ quality: d.quality, url: d.link })).filter(d => d.url);

  return {
    id: s.id,
    title: decodeHtml(s.name || 'Unknown'),
    artist: decodeHtml(s.primaryArtists || s.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist'),
    album: decodeHtml(s.album?.name || ''),
    year: s.year || '',
    duration: parseInt(s.duration, 10) || 0,
    coverUrl: cover?.link || null,
    audioUrl: best?.link || null,
    allAudioUrls: allUrls,
    language: s.language || '',
    label: s.label || '',
    copyright: s.copyright || '',
    hasLyrics: s.hasLyrics === 'true' || s.hasLyrics === true,
    albumUrl: s.album?.url || null,
    albumId: s.album?.id || null,
  };
}

function proxyAudioUrl(url) {
  if (!url) return null;
  if (url.includes('saavncdn.com')) {
    return url.replace(/^https:\/\/[^/]+\.saavncdn\.com/, '/saavn-stream');
  }
  return url;
}

export function getProxiedUrl(url) {
  return proxyAudioUrl(url);
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
    const songs = Array.isArray(data) ? data : [data];
    const song = songs[0];
    if (song) {
      const normed = normSong(song);
      return { 
        audioUrl: normed.audioUrl, 
        streamUrl: normed.audioUrl,
        allUrls: normed.allAudioUrls 
      };
    }
  } catch { /* fallback */ }
  return { audioUrl: null, streamUrl: null, allUrls: [] };
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

// Multi-source lyrics fetcher
export async function fetchLyrics(songId, songTitle, artistName) {
  // Source 1: JioSaavn API lyrics
  try {
    const data = await safeFetch(`${SAavnAPI}/lyrics?id=${songId}`);
    if (data?.lyrics && data.lyrics.trim().length > 10) {
      return data.lyrics;
    }
  } catch { /* try next source */ }

  // Source 2: lyrics.ovh free API (uses song title + artist)
  if (songTitle && artistName) {
    try {
      // Clean up artist name — take first artist only
      const cleanArtist = artistName.split(',')[0].trim();
      const cleanTitle = songTitle.replace(/\(.*?\)/g, '').trim();
      const lyricsRes = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`
      );
      if (lyricsRes.ok) {
        const lyricsData = await lyricsRes.json();
        if (lyricsData?.lyrics && lyricsData.lyrics.trim().length > 10) {
          return lyricsData.lyrics;
        }
      }
    } catch { /* try next source */ }
  }

  // Source 3: Try with simplified title (remove featuring, remix etc.)
  if (songTitle && artistName) {
    try {
      const cleanArtist = artistName.split(',')[0].split('&')[0].trim();
      const cleanTitle = songTitle
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/feat\.?.*/i, '')
        .replace(/ft\.?.*/i, '')
        .trim();
      if (cleanTitle !== songTitle.trim()) {
        const lyricsRes = await fetch(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`
        );
        if (lyricsRes.ok) {
          const lyricsData = await lyricsRes.json();
          if (lyricsData?.lyrics && lyricsData.lyrics.trim().length > 10) {
            return lyricsData.lyrics;
          }
        }
      }
    } catch { /* no more sources */ }
  }

  return null;
}

// Download audio as blob for offline storage / ringtone cutter
// Uses proxy path to avoid CORS issues with CDN
export async function downloadAudioBlob(audioUrl) {
  const proxyUrl = proxyAudioUrl(audioUrl) || audioUrl;
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    return blob;
  } catch (err) {
    // Fallback: try direct URL if proxy failed
    if (proxyUrl !== audioUrl) {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.blob();
      } catch (err2) {
        console.error('Download error (both proxy and direct failed):', err, err2);
      }
    } else {
      console.error('Download error:', err);
    }
    return null;
  }
}
