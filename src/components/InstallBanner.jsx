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
        <svg width="48" height="48" viewBox="0 0 512 512" fill="none">
          <rect width="512" height="512" rx="108" fill="#080c18"/>
          <rect x="100" y="280" width="32" height="110" rx="16" fill="#006878"/>
          <rect x="148" y="220" width="32" height="170" rx="16" fill="#00d4e8"/>
          <rect x="196" y="160" width="32" height="230" rx="16" fill="#00d4e8"/>
          <rect x="244" y="120" width="32" height="270" rx="16" fill="#00d4e8"/>
          <rect x="292" y="170" width="32" height="220" rx="16" fill="#00d4e8"/>
          <rect x="340" y="230" width="32" height="160" rx="16" fill="#00d4e8"/>
          <rect x="388" y="290" width="32" height="100" rx="16" fill="#006878"/>
        </svg>
        <span className="install-banner-title">Install SoundAura</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-install" onClick={handleInstall}>Install Now</button>
        <button className="btn-dismiss" onClick={() => setDismissed(true)} title="Dismiss">✕</button>
      </div>
    </div>
  );
}
