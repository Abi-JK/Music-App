import React, { useState, useEffect } from 'react';
import DataSettings from '../components/DataSettings';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function SettingsScreen(props) {
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    const handler = (e) => { e.preventDefault(); window.__installPrompt = e; };
    const installedHandler = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    const prompt = window.__installPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
    }
  };

  return (
    <div className="settings-screen" style={{ paddingBottom: 120 }}>
      <div style={{ padding: '20px 20px 4px' }}>
        <h2 style={{ margin: 0, fontSize: 22, color: 'var(--text)', fontWeight: 800 }}>Settings</h2>
      </div>

      {!installed && (
        <div style={{ margin: '12px 16px', background: 'var(--bg-panel)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px' }}>
            <button onClick={handleInstall} style={{ width: '100%', padding: '12px 0', borderRadius: 500, background: '#00d4e8', color: '#000', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Install SoundAura
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, background: 'var(--bg-panel)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <DataSettings {...props} />
      </div>
    </div>
  );
}
