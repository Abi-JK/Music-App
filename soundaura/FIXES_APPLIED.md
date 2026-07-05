# SoundAura — Fixes Applied

## 🔥 Critical bug that caused streams / search / downloads to fail

**Root cause:** JioSaavn's official API and CDN reject requests without a
`Referer: https://www.jiosaavn.com/` + browser User-Agent header. Your
`vite.config.js` dev proxy injected those headers, so it worked locally.
But `netlify.toml`'s plain `[[redirects]]` **cannot set request headers**,
so in production every call to `/saavn-api`, `/saavn-stream`, and
`/saavn-search` went out headerless and was blocked. That is why:
  • search returned nothing
  • streams errored and the player auto-skipped to the next song
  • downloads failed

**Fix:** Added `netlify/edge-functions/saavn-proxy.ts`, a Netlify Edge
Function that forwards each request with the correct headers, follows
redirects, forwards Range headers for audio seeking, and adds permissive
CORS. `netlify.toml` now routes `/saavn-*` paths through the edge
function instead of raw redirects.

## API mirror hardening

- Switched search / lyrics mirror from `jiosaavn-api-beta.vercel.app`
  (frequently down) to `saavn.dev` (actively maintained).
- Added an automatic fallback in `src/utils/api.js`: if the same-origin
  proxy is unreachable, calls fall back to `saavn.dev` directly.
- `getStreamUrl` now falls back to `saavn.dev`'s `downloadUrl` list when
  the official token endpoint fails — so playback keeps working even if
  JioSaavn changes their auth scheme.
- Extended `normVercelSong` / `pickBestCover` in `helpers.js` to support
  saavn.dev's nested `artists.primary` + `image[].url` shape.

## Offline / PWA fixes (`public/sw.js` v2.0.0)

- Bumped cache version → automatically evicts every old cache on deploy.
- On activate, the SW now parses `/index.html` and warms up every hashed
  `/assets/*` chunk, so a fully cold offline reload finds them.
- Never caches HTTP 206 (Range) responses — this was silently corrupting
  audio playback from cache.
- Never caches `/saavn-stream/*` responses in the SW (audio blobs live in
  IndexedDB via `offlineStore.js`, which is the right place).
- Enabled navigation preload for faster first paint.
- Navigation handler now falls back to cached `/index.html` first, then
  `/offline.html` — no more blank screens.

## Netlify config

- Added `no-cache` for `/manifest.json` and `/index.html` so PWA updates
  propagate without cache-busting hacks.
- Added `Cache-Control: immutable` for `/icons/*`.
- All JioSaavn proxying moved to `[[edge_functions]]`.

## Vite config

- Shared `withSaavnHeaders` helper (mirrors the edge function).
- `/saavn-search` now points at `https://saavn.dev/api` in dev.
- Added `manualChunks` for `react` / `react-dom` — smaller cacheable
  vendor bundle → better repeat-visit performance.

## Files changed
- `netlify/edge-functions/saavn-proxy.ts`  (NEW)
- `netlify.toml`                            (rewritten)
- `vite.config.js`                          (proxy hardened)
- `public/sw.js`                            (v2.0.0)
- `src/utils/api.js`                        (fallbacks + saavn.dev)
- `src/utils/helpers.js`                    (nested shape support)

## What to test after deploy
1. Load the site online — search, play, download a song offline.
2. Toggle Chrome DevTools → Network → Offline.
3. Reload the app — it should still open (not blank).
4. Play the downloaded song offline.
5. Turn the network back on — search + streaming should work.

## Existing users
The service worker version bump forces every returning browser to drop
old caches automatically on next visit. No user action required.
