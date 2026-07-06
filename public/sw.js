// SoundAura Service Worker v2.0.0
// Strategy:
//   • Precache the app shell on install (bare minimum so first offline
//     open never shows a blank screen).
//   • On activate, warm up the built /assets bundle by parsing the
//     freshly cached index.html and caching every <script>/<link>.
//   • Runtime: cache-first for hashed assets, stale-while-revalidate for
//     images, network-first for API (/saavn-*), navigation preload for
//     HTML with an offline.html fallback.
//   • Never cache 206 (Range) responses — that corrupts audio playback.
//   • Bumping CACHE_VERSION invalidates every old cache safely.

const CACHE_VERSION = 'soundaura-v2.0.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.svg',
  '/manifest.json',
];

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Precache error:', err))
  );
});

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Drop caches from previous versions
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith('soundaura-') &&
                      k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== IMAGE_CACHE)
        .map((k) => caches.delete(k))
    );

    // 2. Enable navigation preload (faster first paint)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch { /* ignore */ }
    }

    // 3. Warm up hashed assets referenced by index.html so a fully-cold
    //    offline reload actually finds them.
    try {
      const cache = await caches.open(STATIC_CACHE);
      const indexRes = await fetch('/index.html', { cache: 'no-cache' });
      if (indexRes.ok) {
        await cache.put('/index.html', indexRes.clone());
        const html = await indexRes.text();
        const urls = [
          ...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g),
          ...html.matchAll(/<link[^>]+href=["']([^"']+)["']/g),
        ]
          .map((m) => m[1])
          .filter((u) => u.startsWith('/assets/') || u.startsWith('/icons/'));
        await Promise.all(
          urls.map((u) => fetch(u).then((r) => r.ok && cache.put(u, r.clone())).catch(() => {}))
        );
      }
    } catch (err) {
      console.warn('[SW] Asset warm-up skipped:', err);
    }

    await self.clients.claim();
  })());
});

// ── Fetch router ─────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // JioSaavn proxy calls — network-first, never cache 206 responses.
  if (url.pathname.startsWith('/saavn-api') ||
      url.pathname.startsWith('/saavn-search') ||
      url.pathname.startsWith('/saavn-stream')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, /*audio=*/ url.pathname.startsWith('/saavn-stream')));
    return;
  }

  // Images: stale-while-revalidate
  if (request.destination === 'image' ||
      url.hostname.includes('saavncdn.com') ||
      url.hostname.includes('googleusercontent.com')) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Hashed static assets: cache-first
  if (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.woff2') ||
      request.destination === 'font' ||
      request.destination === 'style' ||
      request.destination === 'script') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML navigations: network with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(event));
    return;
  }

  event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// ── Strategies ───────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok && res.status !== 206) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName, isAudio = false) {
  try {
    const res = await fetch(request);
    // Don't cache partial (206) responses — they break media playback.
    // Don't cache audio streams at all (they use IndexedDB via the app).
    if (res.ok && res.status !== 206 && !isAudio) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok && res.status !== 206) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function navigationHandler(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put('/index.html', preload.clone());
      return preload;
    }
    const res = await fetch(event.request);
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put('/index.html', res.clone());
    }
    return res;
  } catch {
    const cachedIndex = await caches.match('/index.html');
    if (cachedIndex) return cachedIndex;
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;
    return new Response(
      '<h1>Offline</h1><p>Please check your connection.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ── Cache size management ────────────────────────────────
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxItems);
  }
}

self.addEventListener('message', (event) => {
  if (event.data === 'TRIM_CACHES') {
    trimCache(IMAGE_CACHE, 120);
    trimCache(DYNAMIC_CACHE, 60);
  }
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
