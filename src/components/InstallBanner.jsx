import React, { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner({ showToast }) {
  const { canInstall, promptInstall, wasInstalled } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (wasInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      showToast('📲 Check your browser install prompt...');
      await promptInstall();
      showToast('📱 If you tapped Install, please check your app drawer / home screen.');
    } else {
      setShowGuide(v => !v);
    }
  };

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-logo-badge">⚡</span>
        <div>
          <h4>Install SoundAura App</h4>
          <p>Get offline playback, background controls, and lockscreen integration.</p>
        </div>
      </div>
      <div className="install-banner-actions">
        <button className="btn-primary install-btn" onClick={handleInstallClick}>
          {canInstall ? 'Install Now' : 'Manual Install Guide'}
        </button>
        <button className="btn-outline dismiss-btn" onClick={() => setDismissed(true)}>✕</button>
      </div>
      {(showGuide || !canInstall) && (
        <div className="install-guide">
          <p><strong>Chrome / Android:</strong></p>
          <ol style={{ margin: '4px 0 8px 16px', fontSize: 12, lineHeight: 1.6 }}>
            <li>Tap the ⋮ menu (three dots, top-right)</li>
            <li>Tap <strong>"Add to Home screen"</strong></li>
            <li>Tap "Install" — the app icon will appear on your home screen</li>
          </ol>
          <p><strong>Safari / iOS:</strong> Tap Share → "Add to Home Screen"</p>
          <p><strong>Desktop:</strong> Click the install icon in the address bar</p>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            ⚠️ <strong>App not showing up?</strong> On some Android phones, the "Install Now" dialog
            says "Installed" but the app goes to the <strong>app drawer</strong> (not the home screen).
            Open your app drawer and look for the SoundAura icon. You can then long-press it and
            select "Add to Home screen" manually.
          </p>
        </div>
      )}
    </div>
  );
}
