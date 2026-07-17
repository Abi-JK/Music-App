// Netlify serverless function — JioSaavn proxy via saavn.sumit.co
// Actions: search (returns songs with download URLs), lyrics
// Audio streaming is handled by Edge Function (/api/stream-audio)

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
      const limit = Math.min(parseInt(params.limit) || 10, 50);

      const searchRes = await fetch(`${SAAVN_API}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`);
      if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status}`);
      const searchData = await searchRes.json();

      const results = searchData?.data?.results || [];
      const songs = results.map(s => {
        const dur = typeof s.duration === 'number' ? s.duration : 0;
        const artists = s.artists?.primary?.map(a => a.name).join(', ')
          || s.artists?.featured?.map(a => a.name).join(', ') || 'Unknown';
        const img500 = s.image?.find(i => i.quality === '500x500')?.url
          || s.image?.find(i => i.quality === '150x150')?.url
          || s.image?.[0]?.url || null;
        const dl = s.downloadUrl || [];
        const url320 = dl.find(u => u.quality === '320kbps')?.url;
        const url160 = dl.find(u => u.quality === '160kbps')?.url;
        const url96 = dl.find(u => u.quality === '96kbps')?.url;
        const rawAudio = url320 || url160 || url96 || null;
        const audioUrl = rawAudio ? `/api/stream-audio?url=${encodeURIComponent(rawAudio)}` : null;
        return {
          id: `saavn-${s.id}`, title: s.name || 'Unknown', artist: artists,
          album: s.album?.name || '', year: s.year || '', duration: dur,
          coverUrl: img500, audioUrl,
          allAudioUrls: [
            ...(url320 ? [{ quality: '320kbps', url: `/api/stream-audio?url=${encodeURIComponent(url320)}` }] : []),
            ...(url160 ? [{ quality: '160kbps', url: `/api/stream-audio?url=${encodeURIComponent(url160)}` }] : []),
            ...(url96 ? [{ quality: '96kbps', url: `/api/stream-audio?url=${encodeURIComponent(url96)}` }] : []),
          ],
          rawAudioUrls: [
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

      // 1. Try jiosaavn-api.vercel.app lyrics (known working)
      try {
        const lr = await fetch(`https://jiosaavn-api.vercel.app/lyrics?id=${id}`);
        if (lr.ok) {
          const ld = await lr.json();
          const lyrics = ld?.lyrics || null;
          if (lyrics) {
            const clean = lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
            return { statusCode: 200, headers, body: JSON.stringify({ lyrics: clean }) };
          }
        }
      } catch { /* try next */ }

      // 2. Try saavn.sumit.co lyrics
      try {
        const res = await fetch(`${SAAVN_API}/songs/${id}/lyrics`);
        if (res.ok) {
          const data = await res.json();
          const lyrics = data?.data?.lyrics || null;
          if (lyrics) {
            const clean = lyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
            return { statusCode: 200, headers, body: JSON.stringify({ lyrics: clean }) };
          }
        }
      } catch { /* no lyrics */ }

      return { statusCode: 200, headers, body: JSON.stringify({ lyrics: null }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    console.error('JioSaavn proxy error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
