// Netlify serverless function — JioSaavn proxy via saavn.sumit.co
// Search results include download URLs (no separate resolve needed)

const SAAVN_API = 'https://saavn.sumit.co/api';

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

      const searchRes = await fetch(`${SAAVN_API}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);
      if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status}`);
      const searchData = await searchRes.json();

      const results = searchData?.data?.results || [];
      const songs = results.map(s => {
        const dur = typeof s.duration === 'number' ? s.duration : 0;
        const artists = s.artists?.primary?.map(a => a.name).join(', ')
          || s.artists?.featured?.map(a => a.name).join(', ') || 'Unknown';
        const img500 = s.image?.find(i => i.quality === '500x500')?.url
          || s.image?.[0]?.url || null;
        const dl = s.downloadUrl || [];
        const url320 = dl.find(u => u.quality === '320kbps')?.url;
        const url160 = dl.find(u => u.quality === '160kbps')?.url;
        const url96 = dl.find(u => u.quality === '96kbps')?.url;
        return {
          id: `saavn-${s.id}`, title: s.name || 'Unknown', artist: artists,
          album: s.album?.name || '', year: s.year || '', duration: dur,
          coverUrl: img500, audioUrl: url320 || url160 || url96 || null,
          allAudioUrls: [
            ...(url320 ? [{ quality: '320kbps', url: url320 }] : []),
            ...(url160 ? [{ quality: '160kbps', url: url160 }] : []),
            ...(url96 ? [{ quality: '96kbps', url: url96 }] : []),
          ],
          genre: s.language || '', source: 'saavn', downloadable: true,
        };
      }).filter(s => s.audioUrl);

      return { statusCode: 200, headers, body: JSON.stringify({ songs }) };

    } else if (action === 'lyrics') {
      const id = (params.id || '').replace('saavn-', '');
      const res = await fetch(`${SAAVN_API}/songs/${id}/lyrics`);
      if (!res.ok) throw new Error(`Lyrics failed: ${res.status}`);
      const data = await res.json();
      const lyrics = data?.data?.lyrics || null;
      const cleanLyrics = lyrics ? lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim() : null;
      return { statusCode: 200, headers, body: JSON.stringify({ lyrics: cleanLyrics }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    console.error('JioSaavn proxy error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
