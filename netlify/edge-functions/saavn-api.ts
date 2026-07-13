export default async (request) => {
  const url = new URL(request.url);
  const targetUrl = `https://www.jiosaavn.com/api.php${url.search}`;

  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'Referer': 'https://www.jiosaavn.com/',
        'Origin': 'https://www.jiosaavn.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const respHeaders = new Headers();
    respHeaders.set('Content-Type', 'application/json; charset=utf-8');
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Cache-Control', 'public, max-age=300');

    return new Response(resp.body, {
      status: resp.status,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'proxy_error', message: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config = { path: "/saavn-api" };
