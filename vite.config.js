import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import dns from 'dns'

// Force IPv4-first so Windows doesn't route through broken IPv6 paths
dns.setDefaultResultOrder('ipv4first')

export default defineConfig({
  root: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inline service worker registration (replaces manual registration in main.jsx)
      injectRegister: 'inline',
      // Include all assets that need to be pre-cached
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'SoundAura — Free Music for Everyone',
        short_name: 'SoundAura',
        description: '100% free, ad-free music streaming for independent artists worldwide. Offline playback, ringtone cutter, no login required.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#00d4e8',
        background_color: '#070b14',
        categories: ['music', 'entertainment'],
        lang: 'en',
        dir: 'ltr',
        prefer_related_applications: false,
        icons: [
          { src: '/icons/icon-72.png',            sizes: '72x72',   type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-96.png',            sizes: '96x96',   type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-128.png',           sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-144.png',           sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-152.png',           sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192.png',           sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-384.png',           sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png',           sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png',  sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'SoundAura Desktop - Free Music Player'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'SoundAura Mobile - Free Music Player'
          },
        ],
        shortcuts: [
          { name: 'Search Songs', short_name: 'Search',  url: '/?tab=search',    icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
          { name: 'Liked Songs',  short_name: 'Liked',   url: '/?tab=liked',     icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
          { name: 'Downloads',    short_name: 'Offline', url: '/?tab=downloads', icons: [{ src: '/icons/icon-96.png', sizes: '96x96' }] },
        ],
      },
      workbox: {
        // Purge old cached versions so users get the latest code
        cleanupOutdatedCaches: true,
        // Suppress missing glob files warning in dev
        globPatterns: process.env.NODE_ENV === 'development' ? [] : ['**/*.{js,css,html,svg,png,woff2,woff}'],
        // Navigation fallback to index.html for SPA routing
        navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api/, /^\/\.netlify/],
      // Runtime caching strategies
      runtimeCaching: [
        // Edge Function audio stream proxy — network-first (full audio, no size limit)
        {
          urlPattern: /^https:\/\/[^/]+\/api\/stream-audio/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'audio-stream-cache',
            networkTimeoutSeconds: 10,
            expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [0, 200, 206] },
          },
        },
        // JioSaavn API — network-first
        {
          urlPattern: /^https:\/\/(saavn\.sumit\.co|jiosaavn-api\.vercel\.app)/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'jiosaavn-api-cache',
            networkTimeoutSeconds: 8,
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // JioSaavn CDN (cover art + audio) — stale-while-revalidate
        {
          urlPattern: /^https:\/\/(.*\.saavncdn\.com|.*\.jiocdn\.in)/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'jiosaavn-cdn-cache',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // Audius discovery API (search, trending, playlists) — network-first
          {
            urlPattern: /^https:\/\/discoveryprovider[0-9]*\.audius\.co\/v1\/(tracks|playlists)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'audius-api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Audius audio streams — network-first
          {
            urlPattern: /^https:\/\/discoveryprovider[0-9]*\.audius\.co\/v1\/tracks\/.*\/stream/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'audio-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cover art / artwork — stale-while-revalidate
          {
            urlPattern: /^https:\/\/(.*\.audius\.co|.*\.googleapis\.com|.*\.gstatic\.com|.*\.saavncdn\.com|.*\.jiocdn\.in)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Lyrics APIs — network-first with cache fallback
          {
            urlPattern: /^https:\/\/(lrclib\.net|api\.lyrics\.ovh)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lyrics-api-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Enable SW in dev mode so you can test the install banner locally
        enabled: true,
      },
    }),
  ],
  server: {
    port: 5173,
    open: true,
    // No dev-server proxy needed — Audius's discovery API is public and
    // CORS-enabled, so the app calls it directly from the browser.
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
