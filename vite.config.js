import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dns from 'dns'

// Force IPv4-first so Windows doesn't route through broken IPv6 paths
dns.setDefaultResultOrder('ipv4first')

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // ── Official JioSaavn API (song details + generateAuthToken) ──────────
      '/saavn-api': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/saavn-api/, '/api.php'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Referer', 'https://www.jiosaavn.com/')
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
          })
          proxy.on('error', (err) => console.error('[saavn-api proxy]', err.message))
        },
      },

      // ── JioSaavn CDN proxy (signed stream URLs from web.saavncdn.com) ──
      '/saavn-stream': {
        target: 'https://web.saavncdn.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/saavn-stream/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Referer', 'https://www.jiosaavn.com/')
            proxyReq.setHeader('Origin', 'https://www.jiosaavn.com')
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
          })
          proxy.on('error', (err) => console.error('[saavn-stream proxy]', err.message))
        },
      },

      // ── Vercel JioSaavn API wrapper (for search + lyrics) ────────────────
      '/saavn-search': {
        target: 'https://jiosaavn-api-beta.vercel.app',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/saavn-search/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => console.error('[saavn-search proxy]', err.message))
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
