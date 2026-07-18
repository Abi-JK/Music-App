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
      if (outcome === 'accepted') { setIsInstalled(true); setDeferredPrompt(null); }
    } else {
      setShowGuide(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <div className="install-banner" style={{ background: 'linear-gradient(135deg, #001a2e, #002233)', border: '1px solid #003d5c', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
          <img src="/icons/icon-128.png" alt="" width={44} height={44} style={{ borderRadius: 10, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#00d4e8' }}>Install SoundAura App</div>
            <div style={{ fontSize: 12, color: '#8aa', marginTop: 2 }}>
              Background playback + Offline + Data safe from Chrome cache clear
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleInstall} style={{ padding: '8px 20px', borderRadius: 500, background: '#00d4e8', color: '#000', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Install Now
          </button>
        </div>
      </div>

      {!isInstalled && (
        <div style={{ background: 'rgba(255,180,0,0.1)', border: '1px solid rgba(255,180,0,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#cc9900', lineHeight: 1.5 }}>
          <strong>Tip:</strong> Install this app for background music playback. Chrome browser stops music when you switch apps — the installed app does NOT.
        </div>
      )}

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowGuide(false)}>
          <div style={{ background: '#0e1520', border: '1px solid #1a2a3a', borderRadius: 14, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#00d4e8', marginBottom: 12, fontSize: 18 }}>Install SoundAura</h3>
            <p style={{ color: '#8ab', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              <strong>Why install?</strong><br/>
              - Music keeps playing when you switch apps or lock screen<br/>
              - Your data (liked songs, downloads) is safe even if you clear Chrome cache<br/>
              - Opens as its own app — no Chrome needed
            </p>
            {isIOS() ? (
              <div style={{ color: '#aab', fontSize: 14, lineHeight: 1.8 }}>
                <p><strong>1.</strong> Open this page in <strong>Safari</strong></p>
                <p><strong>2.</strong> Tap <strong>Share</strong> button (📤)</p>
                <p><strong>3.</strong> Tap <strong>"Add to Home Screen"</strong></p>
                <p><strong>4.</strong> Tap <strong>"Add"</strong></p>
              </div>
            ) : isAndroid() ? (
              <div style={{ color: '#aab', fontSize: 14, lineHeight: 1.8 }}>
                <p><strong>1.</strong> Tap the 3-dot menu (⋮) in Chrome</p>
                <p><strong>2.</strong> Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                <p><strong>3.</strong> Tap <strong>"Install"</strong></p>
              </div>
            ) : (
              <div style={{ color: '#aab', fontSize: 14, lineHeight: 1.8 }}>
                <p><strong>1.</strong> Click the install icon in the address bar</p>
                <p><strong>2.</strong> Or open browser menu → <strong>"Install app"</strong></p>
              </div>
            )}
            <button onClick={() => setShowGuide(false)} style={{ marginTop: 16, width: '100%', padding: '10px 0', background: '#00d4e8', color: '#000', border: 'none', borderRadius: 500, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>Got it!</button>
          </div>
        </div>
      )}
    </>
  );
}
