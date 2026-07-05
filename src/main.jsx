import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Progressive Web App Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registered successfully:', reg.scope);
        
        // Trigger periodic cleanup of dynamic caches
        if (reg.active) {
          reg.active.postMessage('TRIM_CACHES');
        }

        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available; please refresh.
                  console.log('[SW] New version detected! App will update on reload.');
                  // Dispatch custom event so the UI can notify the user
                  window.dispatchEvent(new CustomEvent('sw-update-available'));
                } else {
                  // Content is cached for offline use.
                  console.log('[SW] Content cached for offline use.');
                }
              }
            };
          }
        };
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
