import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dns from 'dns'

// Force IPv4-first so Windows doesn't route through broken IPv6 paths
dns.setDefaultResultOrder('ipv4first')

// Shared proxy header injector — mirrors Netlify Edge Function in prod.
const withSaavnHeaders = (proxy) => {
  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.setHeader('Referer', 'https://www.jiosaavn.com/')
    proxyReq.setHeader('Origin', 'https://www.jiosaavn.com')
    proxyReq.setHeader(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    )
  })
  proxy.on('error', (err) => console.error('[saavn proxy]', err.message))
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Official JioSaavn API (song details + generateAuthToken)
      '/saavn-api': {
        target: 'https://www.jiosaavn.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/saavn-api/, '/api.php'),
        configure: withSaavnHeaders,
      },
      // JioSaavn web CDN (signed stream URLs come from web.saavncdn.com)
      '/saavn-stream': {
        target: 'https://web.saavncdn.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/saavn-stream/, ''),
        configure: withSaavnHeaders,
      },
      // Reliable public JioSaavn API mirror (search + lyrics)
      '/saavn-search': {
        target: 'https://saavn.dev/api',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/saavn-search/, ''),
        configure: withSaavnHeaders,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Split vendor for better long-term caching by the service worker
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }
        },
      },
    },
  },
})
