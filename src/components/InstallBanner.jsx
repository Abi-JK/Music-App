import React, { useState } from 'react';

export default function InstallBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-logo-badge">⚡</span>
        <div>
          <h4>Install SoundAura on Your Phone</h4>
        </div>
      </div>
      <div className="install-guide">
        <p style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-secondary)' }}>
          The app won't install from <code>localhost</code> or <code>192.168.x.x</code>.
          You need to <strong>deploy it to Netlify first</strong> (free, 2 minutes):
        </p>
        <ol style={{ margin: '0 0 8px 16px', fontSize: 12, lineHeight: 1.7 }}>
          <li>Run <code>npm run build</code> in your terminal</li>
          <li>Go to <strong>netlify.com</strong> → drag & drop the <code>dist/</code> folder</li>
          <li>Open the HTTPS URL on your phone</li>
          <li>Tap <strong>⋮ → "Add to Home screen"</strong> → it will work ✅</li>
        </ol>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 0 }}>
          PWA install requires HTTPS. The free Netlify plan gives you HTTPS automatically.
        </p>
      </div>
      <div className="install-banner-actions" style={{ marginTop: 8 }}>
        <button className="btn-outline dismiss-btn" onClick={() => setDismissed(true)}>✕ Dismiss</button>
      </div>
    </div>
  );
}
