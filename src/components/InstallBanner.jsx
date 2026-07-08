import React, { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner({ showToast }) {
  const { canInstall, promptInstall, isInstalled } = useInstallPrompt();
  const [showGuide, setShowGuide] = useState(false);

  // Only show banner when installable OR when not already installed and service worker is active
  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      showToast('✨ Opening installation prompt...');
      const result = await promptInstall();
      if (result) {
        showToast('🎉 SoundAura installed successfully!');
      } else {
        showToast('ℹ️ Installation cancelled.');
      }
    } else {
      setShowGuide(true);
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
          <p><strong>Chrome/Android:</strong> Tap ⋮ → "Add to Home screen"</p>
          <p><strong>Safari/iOS:</strong> Tap Share → "Add to Home Screen"</p>
          <p><strong>Desktop:</strong> Click the install icon in the address bar</p>
        </div>
      )}
    </div>
  );
}
