import React, { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner({ showToast }) {
  const { canInstall, promptInstall, wasInstalled } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (wasInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      showToast('📲 Please use the ⋮ menu → "Add to Home screen" method below — it works on all phones.');
    }
  };

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-logo-badge">⚡</span>
        <div>
          <h4>Install SoundAura</h4>
        </div>
      </div>

      <div className="install-guide">
        <p style={{ fontSize: 12, marginBottom: 2 }}><strong>Add to Home Screen (works on every phone):</strong></p>
        <ol style={{ margin: '0 0 6px 16px', fontSize: 12, lineHeight: 1.7 }}>
          <li>Open <strong>Chrome</strong> browser</li>
          <li>Tap <strong>⋮</strong> (three dots, top-right)</li>
          <li>Tap <strong>"Add to Home screen"</strong> → then tap <strong>"Add"</strong></li>
          <li>The SoundAura icon will appear on your home screen ✅</li>
        </ol>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
          ⚠️ If the <strong>"Install via Chrome"</strong> button above shows "Installed" but no icon appears,
          it is a known Chrome bug on Xiaomi/Oppo/Vivo/Realme phones. Always use the
          <strong> ⋮ → "Add to Home screen"</strong> method instead — it works every time.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          If you still cannot find the icon, try <strong>Chrome ⋮ → Share → "Add to Home screen"</strong>
        </p>
      </div>

      <div className="install-banner-actions">
        {canInstall && (
          <button className="btn-primary install-btn" onClick={handleInstallClick}>
            Try Install via Chrome
          </button>
        )}
        <button className="btn-outline dismiss-btn" onClick={() => setDismissed(true)}>✕</button>
      </div>
    </div>
  );
}
