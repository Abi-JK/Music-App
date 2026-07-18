export default async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const url = new URL(request.url);
  const audioUrl = url.searchParams.get('url');

  if (!audioUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const allowedDomains = [
    'saavncdn.com', 'jiocdn.in', 'saavn.me', 'jioinsights.mediacdn.com',
    'aac.saavncdn.com', 'c.saavncdn.com', 'hls.saavncdn.com',
    'youtube.com', 'yt3.ggpht.com', 'i.ytimg.com',
    'googlevideo.com', 'rr1---', 'rr2---', 'rr3---', 'rr4---', 'rr5---',
    'manifest.googlevideo.com', 'videoplayback',
    'soundcloud.com', 'sndcdn.com',
  ];
  const isAllowed = allowedDomains.some(d => audioUrl.includes(d));
  if (!isAllowed) {
    return new Response(JSON.stringify({ error: 'Domain not allowed', url: audioUrl }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const fetchHeaders: Record<string, string> = {};
  const range = request.headers.get('range');
  if (range) fetchHeaders['Range'] = range;
  fetchHeaders['User-Agent'] = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  fetchHeaders['Referer'] = 'https://www.jiosaavn.com/';
  fetchHeaders['Accept'] = '*/*';
  fetchHeaders['Accept-Encoding'] = 'identity';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(audioUrl, {
      headers: fetchHeaders,
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseHeaders = new Headers();
    const ct = res.headers.get('content-type');
    responseHeaders.set('Content-Type', ct || 'audio/mpeg');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Cache-Control', 'public, max-age=3600');

    const cl = res.headers.get('content-length');
    const cr = res.headers.get('content-range');
    if (cl) responseHeaders.set('Content-Length', cl);
    if (cr) responseHeaders.set('Content-Range', cr);
    if (range && res.status === 206) responseHeaders.set('Status', '206');

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err) {
    clearTimeout(timeout);
    return new Response(JSON.stringify({ error: 'Failed to fetch audio', detail: String(err) }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  }
};

export const config = { path: '/api/stream-audio' };
