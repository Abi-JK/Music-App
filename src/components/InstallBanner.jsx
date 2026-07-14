import React, { useState, useEffect, useCallback } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    if (window.__installPrompt) {
      setDeferredPrompt(window.__installPrompt);
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);
    const onReady = () => setDeferredPrompt(window.__installPrompt);
    window.addEventListener('installpromptready', onReady);

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      window.__installPrompt = null;
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    if (isStandalone()) setIsInstalled(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('installpromptready', onReady);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("App can't be installed automatically right now.\\n\\nIf you are on an iPhone/iPad: Tap the Share icon (square with an arrow) and select 'Add to Home Screen'.\\n\\nIf you are on Android/PC: Look for the install icon in the URL bar or browser menu.");
    }
  }, [deferredPrompt]);

  if (isInstalled || dismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <img src="/icons/icon-96.png?v=3" alt="SoundAura Logo" style={{ width: 44, height: 44, borderRadius: 12 }} />
        <span className="install-banner-title">Install SoundAura</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-install" onClick={handleInstall}>Install Now</button>
        <button className="btn-dismiss" onClick={() => setDismissed(true)} title="Dismiss">✕</button>
      </div>
    </div>
  );
}
