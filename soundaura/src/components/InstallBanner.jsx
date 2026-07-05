import React from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner({ showToast }) {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  const handleInstallClick = async () => {
    showToast('✨ Opening installation prompt...');
    const result = await promptInstall();
    if (result) {
      showToast('🎉 SoundAura installed successfully!');
    } else {
      showToast('ℹ️ Installation cancelled.');
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
      <button className="btn-primary install-btn" onClick={handleInstallClick}>
        Install Now
      </button>
    </div>
  );
}
