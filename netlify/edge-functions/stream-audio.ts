// Netlify Edge Function — streams JioSaavn CDN audio to the browser
// Edge Functions use Deno runtime with no body size limit (streams natively)

export default async (request: Request) => {
  const url = new URL(request.url);
  const audioUrl = url.searchParams.get('url');

  if (!audioUrl || (!audioUrl.includes('saavncdn.com') && !audioUrl.includes('jiocdn.in') && !audioUrl.includes('saavn.me'))) {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const fetchHeaders: Record<string, string> = {};
  const range = request.headers.get('range');
  if (range) fetchHeaders['Range'] = range;

  const res = await fetch(audioUrl, { headers: fetchHeaders });

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', res.headers.get('content-type') || 'audio/mp4');
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Cache-Control', 'public, max-age=86400');

  const cl = res.headers.get('content-length');
  const cr = res.headers.get('content-range');
  if (cl) responseHeaders.set('Content-Length', cl);
  if (cr) responseHeaders.set('Content-Range', cr);

  return new Response(res.body, {
    status: res.status,
    headers: responseHeaders,
  });
};

export const config = { path: '/api/stream-audio' };
