import React, { useState, useEffect, useCallback } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

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
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  }, [deferredPrompt]);

  if (isInstalled || !deferredPrompt) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <svg width="48" height="48" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="512" height="512" rx="96" fill="#0a0e1a"/>
          <path d="M140 290 C140 155, 372 155, 372 290" fill="none" stroke="var(--accent)" stroke-width="30" strokeLinecap="round"/>
          <rect x="110" y="260" width="62" height="86" rx="18" fill="var(--accent)"/>
          <rect x="340" y="260" width="62" height="86" rx="18" fill="var(--accent)"/>
          <rect x="215" y="278" width="10" height="36" rx="5" fill="var(--accent-light)" opacity="0.7"/>
          <rect x="235" y="268" width="10" height="56" rx="5" fill="var(--accent-light)" opacity="0.85"/>
          <rect x="255" y="260" width="10" height="72" rx="5" fill="var(--accent)"/>
          <rect x="275" y="268" width="10" height="56" rx="5" fill="var(--accent-light)" opacity="0.85"/>
          <rect x="295" y="278" width="10" height="36" rx="5" fill="var(--accent-light)" opacity="0.7"/>
        </svg>
        <span className="install-banner-title">Install SoundAura</span>
      </div>
      <button className="btn-install" onClick={handleInstall}>Install Now</button>
    </div>
  );
}
