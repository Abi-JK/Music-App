import React, { useState } from 'react';
import { Storage } from '../utils/storage';
import { CloudSync } from '../utils/cloudSync';

export default function DataSettings({ showToast, backupCode, cloudSyncing, cloudRestoring, lastSync, onSyncNow, onRestore, onCopyCode }) {
  const [restoreCode, setRestoreCode] = useState('');
  const [audioBackup, setAudioBackup] = useState(CloudSync.isAudioBackupEnabled());

  const handleExport = async () => {
    try {
      await Storage.exportBackup();
      showToast('Backup downloaded!');
    } catch {
      showToast('Export failed.');
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Storage.importBackup(file).then(result => {
      showToast(`Restored: ${result.likedCount} liked, ${result.recentCount} recent, ${result.downloadsCount} downloads`);
    }).catch(() => showToast('Import failed.'));
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!restoreCode.trim()) return;
    const ok = await onRestore(restoreCode);
    if (ok) setRestoreCode('');
  };

  const toggleAudioBackup = () => {
    const next = !audioBackup;
    setAudioBackup(next);
    CloudSync.setAudioBackupEnabled(next);
    if (next && onSyncNow) onSyncNow();
  };

  return (
    <div>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 8 }}>
          Cloud Backup
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <code style={{ background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13, letterSpacing: 1, color: 'var(--accent)' }}>
            {backupCode || 'SA-****-****'}
          </code>
          <button
            onClick={() => onCopyCode && onCopyCode(backupCode)}
            style={btnStyle('#6366f1')}
            disabled={!backupCode}
          >
            Copy
          </button>
          <button onClick={() => { if (onSyncNow) onSyncNow(); }} disabled={cloudSyncing || !backupCode} style={btnStyle('#22c55e', cloudSyncing || !backupCode)}>
            {cloudSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
          {lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : 'Not synced yet'}
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 6 }}>
          Restore from code
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <input
            value={restoreCode}
            onChange={e => setRestoreCode(e.target.value)}
            placeholder="SA-XXXX-XXXX"
            style={{ flex: 1, minWidth: 130, padding: '7px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 12, fontFamily: 'inherit', letterSpacing: 1 }}
          />
          <button onClick={handleRestore} disabled={cloudRestoring || !restoreCode.trim()} style={btnStyle('#f59e0b', cloudRestoring || !restoreCode.trim())}>
            {cloudRestoring ? 'Restoring...' : 'Restore'}
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer' }}>
          <input type="checkbox" checked={audioBackup} onChange={toggleAudioBackup} style={{ accentColor: 'var(--accent)' }} />
          Back up audio files to cloud
        </label>
      </div>

      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 8 }}>
          Local Data
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={btnStyle('#6366f1')}>
            Export
          </button>
          <button onClick={(e) => { const inp = e.currentTarget.parentElement.querySelector('input[type=file]'); if (inp) inp.click(); }} style={btnStyle('#22c55e')}>
            Import
          </button>
          <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
}

function btnStyle(color, disabled) {
  return {
    fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? 'var(--bg-elevated)' : color,
    color: disabled ? 'var(--text-dim)' : '#fff',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit',
  };
}
