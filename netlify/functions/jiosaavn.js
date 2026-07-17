// Netlify serverless function — proxy JioSaavn via community API
// Handles CORS + resolves search + song details in one call

const SAAVN_API = 'https://jiosaavn-api.vercel.app';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};
  const action = params.action || 'search';

  try {
    if (action === 'search') {
      const query = params.q || '';
      const limit = Math.min(parseInt(params.limit) || 10, 20);

      const searchRes = await fetch(`${SAAVN_API}/search?query=${encodeURIComponent(query)}&limit=${limit}`);
      if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status}`);
      const searchData = await searchRes.json();

      if (!searchData?.results) {
        return { statusCode: 200, headers, body: JSON.stringify({ songs: [] }) };
      }

      // Resolve songs in batches of 3
      const resolvedSongs = [];
      const ids = searchData.results.map(r => r.id).filter(Boolean);

      for (let i = 0; i < ids.length; i += 3) {
        const batch = ids.slice(i, i + 3);
        const results = await Promise.allSettled(
          batch.map(async (id) => {
            const res = await fetch(`${SAAVN_API}/song?id=${id}`);
            if (!res.ok) return null;
            const d = await res.json();
            if (!d?.status || !d.id) return null;
            const durParts = (d.duration || '').split(':');
            const durSec = durParts.length === 2 ? parseInt(durParts[0]) * 60 + parseInt(durParts[1]) : 0;
            return {
              id: `saavn-${d.id}`,
              title: d.song || 'Unknown',
              artist: d.primary_artists || d.singers || 'Unknown',
              album: d.album || '',
              year: d.year || '',
              duration: durSec,
              coverUrl: d.image || null,
              audioUrl: d.media_url || null,
              allAudioUrls: [
                ...(d.media_urls?.['320_KBPS'] ? [{ quality: '320kbps', url: d.media_urls['320_KBPS'] }] : []),
                ...(d.media_url ? [{ quality: '160kbps', url: d.media_url }] : []),
                ...(d.media_urls?.['96_KBPS'] ? [{ quality: '96kbps', url: d.media_urls['96_KBPS'] }] : []),
              ],
              genre: d.language || '',
              source: 'saavn',
              downloadable: true,
            };
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) resolvedSongs.push(r.value);
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ songs: resolvedSongs }) };

    } else if (action === 'song') {
      const id = params.id || '';
      const res = await fetch(`${SAAVN_API}/song?id=${id}`);
      if (!res.ok) throw new Error(`Song failed: ${res.status}`);
      const d = await res.json();
      if (!d?.status || !d.id) {
        return { statusCode: 200, headers, body: JSON.stringify({ song: null }) };
      }
      const durParts = (d.duration || '').split(':');
      const durSec = durParts.length === 2 ? parseInt(durParts[0]) * 60 + parseInt(durParts[1]) : 0;
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          song: {
            id: `saavn-${d.id}`, title: d.song, artist: d.primary_artists || d.singers,
            album: d.album, year: d.year, duration: durSec, coverUrl: d.image,
            audioUrl: d.media_url,
            allAudioUrls: [
              ...(d.media_urls?.['320_KBPS'] ? [{ quality: '320kbps', url: d.media_urls['320_KBPS'] }] : []),
              ...(d.media_url ? [{ quality: '160kbps', url: d.media_url }] : []),
            ],
            genre: d.language, source: 'saavn', downloadable: true,
          },
        }),
      };

    } else if (action === 'lyrics') {
      const id = params.id || '';
      const res = await fetch(`${SAAVN_API}/lyrics?id=${id}`);
      if (!res.ok) throw new Error(`Lyrics failed: ${res.status}`);
      const data = await res.json();
      const lyrics = data?.lyrics || null;
      const cleanLyrics = lyrics ? lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim() : null;
      return { statusCode: 200, headers, body: JSON.stringify({ lyrics: cleanLyrics }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    console.error('JioSaavn proxy error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
