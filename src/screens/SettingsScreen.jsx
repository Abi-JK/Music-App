import React from 'react';
import DataSettings from '../components/DataSettings';

export default function SettingsScreen(props) {
  return (
    <div className="settings-screen" style={{ paddingBottom: 120 }}>
      <div style={{ padding: '20px 20px 4px' }}>
        <h2 style={{ margin: 0, fontSize: 22, color: 'var(--text)', fontWeight: 800 }}>Settings</h2>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          Export and import your data backup.
        </p>
      </div>
      <div style={{ marginTop: 12, background: 'var(--bg-panel)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <DataSettings {...props} />
      </div>
    </div>
  );
}
