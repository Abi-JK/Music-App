import React, { useState, useEffect } from 'react';

const LogoImage = ({ size = 48 }) => (
  <img 
    src="/icons/icon-128.png" 
    alt="SoundAura Logo" 
    width={size} 
    height={size} 
    style={{ borderRadius: 10, flexShrink: 0 }}
  />
);

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if we captured the prompt early (in index.html script)
    if (window.__installPrompt) {
      setDeferredPrompt(window.__installPrompt);
    }

    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const installed = () => setIsInstalled(true);
    const earlyPrompt = () => {
      if (window.__installPrompt) setDeferredPrompt(window.__installPrompt);
    };

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
      // Trigger the native browser install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS()) {
      // iOS doesn't support beforeinstallprompt — show manual instructions
      setShowIOSGuide(true);
    } else {
      // Fallback: the browser may not support install prompt yet
      // Show instructions for manual install
      setShowIOSGuide(true);
    }
  };

  // Don't show banner if already installed as PWA or dismissed
  if (isInstalled || dismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <LogoImage size={48} />
        <div>
          <span className="install-banner-title">Download SoundAura App</span>
          <span className="install-banner-subtitle" style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginTop: 2 }}>
            All languages • Offline downloads • Persistent liked songs
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn-install" onClick={handleInstall}>
          {deferredPrompt ? '📥 Install App' : isIOS() ? '📥 Add to Home' : '📥 Install App'}
        </button>
        <button className="btn-dismiss" onClick={() => setDismissed(true)} title="Dismiss">✕</button>
      </div>
      {showIOSGuide && (
        <div className="ios-install-guide" style={{
          position: 'fixed', inset: 0, zIndex: 6000,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, maxWidth: 380, width: '100%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: 16, fontSize: 18 }}>
              {isIOS() ? '📱 Install on iPhone/iPad' : '📱 Install SoundAura'}
            </h3>
            {isIOS() ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
                <p><strong>1.</strong> Tap the <strong>Share</strong> button (📤) in Safari</p>
                <p><strong>2.</strong> Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                <p><strong>3.</strong> Tap <strong>"Add"</strong> to install</p>
                <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                  ℹ️ This works best in Safari. Other browsers may not support installation.
                </p>
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
                <p><strong>1.</strong> Open the browser menu (⋮ or ⋯)</p>
                <p><strong>2.</strong> Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                <p><strong>3.</strong> Confirm the installation</p>
                <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                  ℹ️ The app will open independently from the browser with its own icon.
                </p>
              </div>
            )}
            <button onClick={() => setShowIOSGuide(false)} style={{
              marginTop: 16, width: '100%', padding: '10px 0',
              background: 'var(--accent)', color: '#000', border: 'none',
              borderRadius: 500, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14,
            }}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
