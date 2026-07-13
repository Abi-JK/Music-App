import React, { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner({ showToast }) {
  const { canInstall, promptInstall, isInstalled } = useInstallPrompt();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      showToast('📲 Opening browser install prompt...');
      const result = await promptInstall();
      if (result) {
        showToast('✅ App installed! Check your app drawer / home screen.');
      } else {
        showToast('ℹ️ Installation cancelled.');
      }
    } else {
      setShowGuide(!showGuide);
    }
  };

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-logo-badge">⚡</span>
        <div>
          <h4>Install SoundAura App</h4>
          <p>Get fast offline playback, background controls, and lockscreen integration.</p>
        </div>
      </div>
      <div className="install-banner-actions">
        <button className="btn-primary install-btn" onClick={handleInstallClick}>
          {canInstall ? 'Install Now' : 'How to Install'}
        </button>
        <button className="btn-outline dismiss-btn" onClick={() => setShowGuide(false)}>✕</button>
      </div>
      {showGuide && (
        <div className="install-guide">
          <p><strong>Chrome/Android:</strong> Open ⋮ menu → "Add to Home screen"</p>
          <p><strong>Safari/iOS:</strong> Tap Share → "Add to Home Screen"</p>
          <p><strong>Desktop:</strong> Click the install icon in the address bar</p>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Note: If "Install Now" says installed but app is not visible, check your 
            <strong> app drawer</strong> (not just home screen) and manually add a shortcut.
          </p>
        </div>
      )}
    </div>
  );
}
