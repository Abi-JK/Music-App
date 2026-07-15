import React, { useState, useEffect } from 'react';

const LogoSVG = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 10, flexShrink: 0 }}>
    <defs>
      <linearGradient id="ib-g1" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#006878"/>
        <stop offset="50%" stopColor="#00b0cc"/>
        <stop offset="100%" stopColor="#00eaff"/>
      </linearGradient>
      <linearGradient id="ib-g2" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#004d5a"/>
        <stop offset="100%" stopColor="#0090aa"/>
      </linearGradient>
      <linearGradient id="ib-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#080c18"/>
        <stop offset="100%" stopColor="#0a1020"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="108" fill="url(#ib-bg)"/>
    <circle cx="256" cy="268" r="195" fill="none" stroke="#00d4e8" strokeWidth="2" opacity="0.08"/>
    <rect x="100" y="280" width="32" height="110" rx="16" fill="url(#ib-g2)"/>
    <rect x="148" y="220" width="32" height="170" rx="16" fill="url(#ib-g1)"/>
    <rect x="196" y="160" width="32" height="230" rx="16" fill="url(#ib-g1)"/>
    <rect x="244" y="120" width="32" height="270" rx="16" fill="url(#ib-g1)"/>
    <rect x="292" y="170" width="32" height="220" rx="16" fill="url(#ib-g1)"/>
    <rect x="340" y="230" width="32" height="160" rx="16" fill="url(#ib-g1)"/>
    <rect x="388" y="290" width="32" height="100" rx="16" fill="url(#ib-g2)"/>
    <circle cx="260" cy="300" r="60" fill="#00d4e8" opacity="0.04"/>
  </svg>
);

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
        <LogoSVG size={48} />
        <span className="install-banner-title">Install SoundAura as App</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-install" onClick={handleInstall}>Install Now</button>
        <button className="btn-dismiss" onClick={() => setDismissed(true)} title="Dismiss">✕</button>
      </div>
    </div>
  );
}
