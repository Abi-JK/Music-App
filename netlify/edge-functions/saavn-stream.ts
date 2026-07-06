export default async (request: Request) => {
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/saavn-stream/, '');
  const targetUrl = `https://web.saavncdn.com${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Referer', 'https://www.jiosaavn.com/');
  headers.set('Origin', 'https://www.jiosaavn.com');
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const resp = await fetch(targetUrl, { headers });

  const respHeaders = new Headers(resp.headers);
  respHeaders.set('Access-Control-Allow-Origin', '*');
  respHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  respHeaders.set('Access-Control-Allow-Headers', '*');

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: respHeaders,
  });
};
