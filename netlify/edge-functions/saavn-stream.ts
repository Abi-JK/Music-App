export default async (request) => {
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/saavn-stream/, '');
  const targetUrl = `https://web.saavncdn.com${targetPath}${url.search}`;

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://www.jiosaavn.com/',
        'Origin': 'https://www.jiosaavn.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const respHeaders = new Headers(resp.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    respHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'stream_proxy_error', message: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config = { path: "/saavn-stream/*" };
