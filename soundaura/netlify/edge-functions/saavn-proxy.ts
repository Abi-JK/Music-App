// SoundAura — Netlify Edge Function proxy for JioSaavn.
// JioSaavn's official API (www.jiosaavn.com/api.php) and its CDN
// (web.saavncdn.com) reject requests that don't carry a browser-like
// Referer + User-Agent. Plain [[redirects]] in netlify.toml CANNOT set
// request headers, which is why streams/downloads/search all failed in
// production even though `vite dev` (which injects those headers) worked.
//
// This edge function rewrites and forwards the request with the correct
// headers, then relays the upstream response with permissive CORS so the
// SPA can consume it directly.

import type { Context } from "https://edge.netlify.com";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const UPSTREAMS: Record<string, string> = {
  "/saavn-api": "https://www.jiosaavn.com/api.php",
  "/saavn-stream": "https://web.saavncdn.com",
  "/saavn-search": "https://saavn.dev/api", // reliable public mirror
};

export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);

  // Pick the matching upstream
  const prefix = Object.keys(UPSTREAMS).find((p) =>
    url.pathname === p || url.pathname.startsWith(p + "/"),
  );
  if (!prefix) return new Response("Not found", { status: 404 });

  const upstreamBase = UPSTREAMS[prefix];
  const rest = url.pathname.slice(prefix.length); // "" or "/foo/bar"
  const targetUrl =
    prefix === "/saavn-api"
      ? `${upstreamBase}${url.search}`
      : `${upstreamBase}${rest}${url.search}`;

  // Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const headers = new Headers({
    "User-Agent": UA,
    Referer: "https://www.jiosaavn.com/",
    Origin: "https://www.jiosaavn.com",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
  });
  // Forward Range for audio seeking / partial content
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      redirect: "follow",
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "upstream_fetch_failed", message: String(err) }),
      { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } },
    );
  }

  // Build a response with permissive CORS + cache hints for audio
  const outHeaders = new Headers(upstreamRes.headers);
  for (const [k, v] of Object.entries(corsHeaders())) outHeaders.set(k, v);

  // Strip hop-by-hop headers Netlify dislikes
  outHeaders.delete("content-encoding");
  outHeaders.delete("content-length");
  outHeaders.delete("transfer-encoding");

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: outHeaders,
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges",
  };
}

export const config = {
  path: ["/saavn-api", "/saavn-api/*", "/saavn-stream/*", "/saavn-search/*"],
};
