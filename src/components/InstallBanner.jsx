import React, { useState, useEffect } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const installed = () => setIsInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    if (isStandalone()) setIsInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <img src="/favicon.svg" alt="SoundAura" width="48" height="48" style={{ borderRadius: 10 }} />
        <span className="install-banner-title">Install SoundAura</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-install" onClick={handleInstall}>Install Now</button>
        <button className="btn-dismiss" onClick={() => setDismissed(true)} title="Dismiss">✕</button>
      </div>
    </div>
  );
}
