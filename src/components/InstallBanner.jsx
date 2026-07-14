import React, { useState, useEffect, useCallback } from 'react';

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
    } else {
      window.open('https://soundaura.netlify.app', '_blank');
    }
  }, [deferredPrompt]);

  if (isInstalled || dismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <svg width="48" height="48" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="108" fill="#080c18"/>
          <rect x="100" y="280" width="32" height="110" rx="16" fill="#006878"/>
          <rect x="148" y="220" width="32" height="170" rx="16" fill="var(--accent)"/>
          <rect x="196" y="160" width="32" height="230" rx="16" fill="var(--accent)"/>
          <rect x="244" y="120" width="32" height="270" rx="16" fill="var(--accent)"/>
          <rect x="292" y="170" width="32" height="220" rx="16" fill="var(--accent)"/>
          <rect x="340" y="230" width="32" height="160" rx="16" fill="var(--accent)"/>
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
