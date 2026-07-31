// SoundAura user data sync — persistent storage via Netlify Blobs
// Survives Chrome "clear data & cache" because data lives on the server, not the browser.
//
// API:
//   GET  /api/user-data?code=SA-XXXX-XXXX                 -> { ok, data: { liked, recent, downloads, custom, updatedAt } }
//   GET  /api/user-data?code=SA-XXXX-XXXX&audio=<songId>  -> audio blob (binary)
//   PUT  /api/user-data?code=SA-XXXX-XXXX                 -> save JSON metadata { liked, recent, downloads, custom }
//   PUT  /api/user-data?code=SA-XXXX-XXXX&audio=<songId>  -> save audio blob (binary body)
//   DELETE /api/user-data?code=SA-XXXX-XXXX&audio=<songId>-> delete one audio blob
//   DELETE /api/user-data?code=SA-XXXX-XXXX&all=1         -> delete ALL data for that code

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'soundaura-userdata';
const MAX_META_BODY = 3_000_000; // ~3MB JSON cap for metadata
const MAX_AUDIO_BODY = 25_000_000; // ~25MB per audio blob (typical 320kbps song)

function corsHeaders(contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (contentType) h['Content-Type'] = contentType;
  return h;
}

function normalizeCode(raw: string | null): string | null {
  if (!raw) return null;
  const code = raw.toUpperCase().replace(/\s+/g, '').replace(/-/g, '');
  if (!/^SA[A-Z0-9]{8}$/.test(code)) return null;
  return `${code.slice(0, 2)}-${code.slice(2, 6)}-${code.slice(6, 10)}`;
}

const metaKey = (code: string) => `u:${code}`;
const audioKey = (code: string, id: string) => `u:${code}:audio:${id}`;

export default async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  const code = normalizeCode(url.searchParams.get('code'));
  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing or invalid backup code' }), {
      status: 400,
      headers: corsHeaders('application/json'),
    });
  }

  let store;
  try {
    store = getStore(STORE_NAME);
  } catch {
    return new Response(JSON.stringify({ error: 'Storage unavailable' }), {
      status: 503,
      headers: corsHeaders('application/json'),
    });
  }

  const audioId = url.searchParams.get('audio');
  const deleteAll = url.searchParams.get('all') === '1';

  // ---- GET ----
  if (request.method === 'GET') {
    if (audioId) {
      const safeId = String(audioId).slice(0, 300);
      const blob = await store.get(audioKey(code, safeId), { type: 'stream' }).catch(() => null);
      if (!blob) {
        return new Response(JSON.stringify({ error: 'Audio not found' }), {
          status: 404,
          headers: corsHeaders('application/json'),
        });
      }
      const responseHeaders = corsHeaders('application/octet-stream');
      responseHeaders['Accept-Ranges'] = 'bytes';
      responseHeaders['Cache-Control'] = 'public, max-age=86400';
      const reader = blob.getReader();
      const stream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) { controller.close(); return; }
          controller.enqueue(value);
        },
        cancel() { reader.cancel(); },
      });
      return new Response(stream, { status: 200, headers: responseHeaders });
    }

    const data = await store.get(metaKey(code), { type: 'json' }).catch(() => null);
    return new Response(JSON.stringify({
      ok: true,
      data: data || { liked: [], recent: [], downloads: [], custom: [], updatedAt: null },
    }), { status: 200, headers: corsHeaders('application/json') });
  }

  // ---- PUT ----
  if (request.method === 'PUT') {
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (audioId) {
      const safeId = String(audioId).slice(0, 300);
      const body = await request.arrayBuffer();
      if (body.byteLength === 0) {
        return new Response(JSON.stringify({ error: 'Empty body' }), {
          status: 400,
          headers: corsHeaders('application/json'),
        });
      }
      if (body.byteLength > MAX_AUDIO_BODY) {
        return new Response(JSON.stringify({ error: 'Audio too large' }), {
          status: 413,
          headers: corsHeaders('application/json'),
        });
      }
      await store.set(audioKey(code, safeId), new Blob([body]));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders('application/json'),
      });
    }

    if (contentLength > MAX_META_BODY) {
      return new Response(JSON.stringify({ error: 'Body too large' }), {
        status: 413,
        headers: corsHeaders('application/json'),
      });
    }
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: corsHeaders('application/json'),
      });
    }
    if (!body || !Array.isArray(body.liked) || !Array.isArray(body.recent) ||
        !Array.isArray(body.downloads) || !Array.isArray(body.custom)) {
      return new Response(JSON.stringify({ error: 'Missing required arrays' }), {
        status: 400,
        headers: corsHeaders('application/json'),
      });
    }
    const payload = {
      liked: body.liked.slice(0, 2000),
      recent: body.recent.slice(0, 2000),
      downloads: body.downloads.slice(0, 2000),
      custom: body.custom.slice(0, 2000),
      updatedAt: new Date().toISOString(),
    };
    await store.set(metaKey(code), JSON.stringify(payload));
    return new Response(JSON.stringify({ ok: true, savedAt: payload.updatedAt }), {
      status: 200,
      headers: corsHeaders('application/json'),
    });
  }

  // ---- DELETE ----
  if (request.method === 'DELETE') {
    if (deleteAll) {
      const list = await store.list({ prefix: `u:${code}` });
      await Promise.all(list.blobs.map((b: any) => store.delete(b.key).catch(() => {})));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders('application/json'),
      });
    }
    if (audioId) {
      const safeId = String(audioId).slice(0, 300);
      await store.delete(audioKey(code, safeId));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: corsHeaders('application/json'),
      });
    }
    return new Response(JSON.stringify({ error: 'Missing audio id' }), {
      status: 400,
      headers: corsHeaders('application/json'),
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders('application/json'),
  });
};

export const config = { path: '/api/user-data' };
