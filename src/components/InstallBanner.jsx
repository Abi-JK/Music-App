import React, { useState, useEffect } from 'react';

const LogoImage = ({ size = 48 }) => (
  <img 
    src="/favicon.png" 
    alt="SoundAura Logo" 
    width={size} 
    height={size} 
    style={{ borderRadius: 10, flexShrink: 0 }}
  />
);

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showNativeOptions, setShowNativeOptions] = useState(false);
  const [apkUrl, setApkUrl] = useState('');
  const [ipaUrl, setIpaUrl] = useState('');

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

  useEffect(() => {
    fetch('/api/install')
      .then(r => r.json())
      .then(({ apkUrl, ipaUrl }) => {
        setApkUrl(apkUrl || '');
        setIpaUrl(ipaUrl || '');
      })
      .catch(console.error);
  }, []);

  const handleInstall = async () => {
    // First try PWA install
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
    
    // Also show React Native download options
    setShowNativeOptions(true);
  };

  // Always show the banner (not dependent on deferredPrompt)
  if (dismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <LogoImage size={48} />
        <span className="install-banner-title">Download SoundAura Mobile App</span>
        <span className="install-banner-subtitle" style={{ fontSize: '0.8rem', color: '#888', marginTop: 4 }}>
          All languages • Offline downloads • Persistent liked songs
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
        <button className="btn-install" onClick={handleInstall}>Download App</button>
        <button className="btn-dismiss" onClick={() => setDismissed(true)} title="Dismiss" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>✕</button>
      </div>
      {showNativeOptions && (apkUrl || ipaUrl) && (
        <div className="native-download-options" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {apkUrl && (
            <a href={apkUrl} className="native-download-btn" style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(45deg, #00d4e8, #0077b6)',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              📱 Download Android APK
            </a>
          )}
          {ipaUrl && (
            <a href={ipaUrl} className="native-download-btn" style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(45deg, #00d4e8, #0077b6)',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              🍎 Download iOS IPA
            </a>
          )}
        </div>
      )}
      {!showNativeOptions && (
        <div className="native-download-options" style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ 
            padding: '0.5rem 1rem',
            background: '#1e1e1e',
            color: '#888',
            borderRadius: '6px',
            fontSize: '0.85rem',
            textAlign: 'center'
          }}>
            📱 App coming soon - Click to be notified
          </div>
        </div>
      )}
    </div>
  );
}
