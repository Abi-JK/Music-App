import React, { useState, useEffect } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setIsInstalled(true); return; }
    if (window.__installPrompt) setDeferredPrompt(window.__installPrompt);
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
      if (outcome === 'accepted') { setIsInstalled(true); setDeferredPrompt(null); }
    }
  };

  if (isInstalled) return null;

  return (
    <div className="install-banner" style={{ background: 'linear-gradient(135deg, #001a2e, #002233)', border: '1px solid #003d5c', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
        <img src="/icons/icon-128.png" alt="" width={44} height={44} style={{ borderRadius: 10, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#00d4e8' }}>Install SoundAura</div>
          <div style={{ fontSize: 12, color: '#8aa', marginTop: 2 }}>
            Background playback + Offline + Data safe
          </div>
        </div>
      </div>
      <button onClick={handleInstall} style={{ padding: '8px 20px', borderRadius: 500, background: '#00d4e8', color: '#000', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        Install
      </button>
    </div>
  );
}
