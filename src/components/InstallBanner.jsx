import React, { useState, useEffect } from 'react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setIsInstalled(true); return; }
    try {
      const dismissed = sessionStorage.getItem('sa_install_modal_dismissed');
      if (!dismissed) {
        const t = setTimeout(() => setShowModal(true), 2000);
        return () => clearTimeout(t);
      }
    } catch {
      const t = setTimeout(() => setShowModal(true), 2000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (window.__installPrompt) setDeferredPrompt(window.__installPrompt);
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const installed = () => setIsInstalled(true);
    const earlyPrompt = () => { if (window.__installPrompt) setDeferredPrompt(window.__installPrompt); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('installpromptready', earlyPrompt);
    if (isStandalone()) setIsInstalled(true);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('installpromptready', earlyPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setIsInstalled(true); setDeferredPrompt(null); setShowModal(false); }
    } else {
      setShowGuide(true);
    }
  };

  const dismissModal = () => {
    setShowModal(false);
    try { sessionStorage.setItem('sa_install_modal_dismissed', '1'); } catch {}
  };

  if (isInstalled) return null;

  return (
    <>
      <div className="install-banner" style={{ background: 'linear-gradient(135deg, #001a2e, #002233)', border: '1px solid #003d5c', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
          <img src="/icons/icon-128.png" alt="" width={44} height={44} style={{ borderRadius: 10, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#00d4e8' }}>Install SoundAura</div>
            <div style={{ fontSize: 12, color: '#8aa', marginTop: 2 }}>
              Background playback + Offline + Data safe from Chrome clear
            </div>
          </div>
        </div>
        <button onClick={handleInstall} style={{ padding: '8px 20px', borderRadius: 500, background: '#00d4e8', color: '#000', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          Install Now
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0a1018', border: '1px solid #1a2a3a', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <img src="/icons/icon-128.png" alt="" width={56} height={56} style={{ borderRadius: 14, margin: '0 auto 12px' }} />
              <h3 style={{ color: '#00d4e8', fontSize: 20, marginBottom: 6 }}>Protect Your Music</h3>
              <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                Chrome browser clears your data when you clear browsing data.
              </p>
              <p style={{ color: '#8ab', fontSize: 13, lineHeight: 1.6 }}>
                <strong>Install this app</strong> so your liked songs, downloads, and playlists are stored safely in the app — not in Chrome. Only uninstalling the app removes your data.
              </p>
            </div>

            <div style={{ background: 'rgba(0,212,232,0.08)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ color: '#00d4e8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>After installing:</div>
              <div style={{ color: '#8ab', fontSize: 12, lineHeight: 1.6 }}>
                - Music plays in background &amp; lock screen<br/>
                - Data survives Chrome cache clear<br/>
                - Works offline<br/>
                - Feels like a native app
              </div>
            </div>

            <button onClick={handleInstall} style={{ width: '100%', padding: '12px 0', background: '#00d4e8', color: '#000', border: 'none', borderRadius: 500, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
              Install SoundAura Now
            </button>

            <button onClick={() => { setShowGuide(true); }} style={{ width: '100%', padding: '10px 0', background: 'none', color: '#8ab', border: '1px solid #1e293b', borderRadius: 500, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>
              How to install
            </button>

            <button onClick={dismissModal} style={{ width: '100%', padding: '8px 0', background: 'none', color: '#64748b', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Skip for now (your data is at risk)
            </button>
          </div>
        </div>
      )}

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6500, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowGuide(false)}>
          <div style={{ background: '#0e1520', border: '1px solid #1a2a3a', borderRadius: 14, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#00d4e8', marginBottom: 12, fontSize: 18 }}>How to Install</h3>
            {isIOS() ? (
              <div style={{ color: '#aab', fontSize: 14, lineHeight: 1.8 }}>
                <p><strong>1.</strong> Open this page in <strong>Safari</strong></p>
                <p><strong>2.</strong> Tap <strong>Share</strong> button</p>
                <p><strong>3.</strong> Tap <strong>"Add to Home Screen"</strong></p>
                <p><strong>4.</strong> Tap <strong>"Add"</strong></p>
              </div>
            ) : isAndroid() ? (
              <div style={{ color: '#aab', fontSize: 14, lineHeight: 1.8 }}>
                <p><strong>1.</strong> Tap the 3-dot menu in Chrome</p>
                <p><strong>2.</strong> Tap <strong>"Install app"</strong></p>
                <p><strong>3.</strong> Tap <strong>"Install"</strong></p>
              </div>
            ) : (
              <div style={{ color: '#aab', fontSize: 14, lineHeight: 1.8 }}>
                <p><strong>1.</strong> Click the install icon in the address bar</p>
                <p><strong>2.</strong> Or menu → <strong>"Install app"</strong></p>
              </div>
            )}
            <button onClick={() => setShowGuide(false)} style={{ marginTop: 16, width: '100%', padding: '10px 0', background: '#00d4e8', color: '#000', border: 'none', borderRadius: 500, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Got it!</button>
          </div>
        </div>
      )}
    </>
  );
}
