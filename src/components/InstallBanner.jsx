import React, { useState, useEffect, useCallback } from 'react';

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    if (isStandalone()) setIsInstalled(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  if (isInstalled || dismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-logo-badge">⚡</span>
        <div>
          <h4>Install SoundAura</h4>
          {deferredPrompt ? (
            <p>Tap Install to add to your device</p>
          ) : isMobile() ? (
            <p>Tap the browser menu (⋮) then "Add to Home Screen"</p>
          ) : (
            <p>Install this app on your device for offline access</p>
          )}
        </div>
      </div>
      <div className="install-banner-actions">
        {deferredPrompt && (
          <button className="btn-install" onClick={handleInstall}>
            Install Now
          </button>
        )}
        <button className="btn-dismiss" onClick={() => setDismissed(true)}>✕</button>
      </div>
    </div>
  );
}
