import React, { useState, useEffect, useRef } from 'react';
import { Storage } from '../utils/storage';
import { CloudSync } from '../utils/cloudSync';

export default function DataSettings({ showToast, backupCode, cloudSyncing, cloudRestoring, lastSync, onSyncNow, onRestore, onCopyCode }) {
  const [opfsAvailable, setOpfsAvailable] = useState(null);
  const [stats, setStats] = useState({ liked: 0, recent: 0, downloads: 0, custom: 0 });
  const [syncing, setSyncing] = useState(false);
  const [restoreCode, setRestoreCode] = useState('');
  const [audioBackup, setAudioBackup] = useState(CloudSync.isAudioBackupEnabled());
  const fileInputRef = useRef(null);

  useEffect(() => {
    Storage.getOpfsStatus().then(ok => setOpfsAvailable(ok));
    loadStats();
  }, []);

  const loadStats = async () => {
    const [liked, recent, downloads, custom] = await Promise.all([
      Storage.getLikedSongs(),
      Storage.getRecentlyPlayed(),
      Storage.getDownloadedSongs(),
      Storage.getCustomSongs(),
    ]);
    setStats({ liked: liked.length, recent: recent.length, downloads: downloads.length, custom: custom.length });
  };

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
      loadStats();
    }).catch(() => showToast('Import failed. Invalid file.'));
    e.target.value = '';
  };

  const handleSyncOpfs = async () => {
    setSyncing(true);
    try {
      const ok = await Storage.forceSyncToOpfs();
      showToast(ok ? 'Synced to OPFS ✅' : 'OPFS not available');
    } catch {
      showToast('Sync failed.');
    }
    setSyncing(false);
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
    showToast(next ? 'Downloaded songs will be backed up to the cloud.' : 'Audio backup turned off. Metadata still syncs.');
  };

  return (
    <div>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 10 }}>
          ☁️ Cloud Backup (Chrome-clear safe)
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 10 }}>
          Your liked songs, downloads & My Songs are saved on the server. Even if Chrome's data is cleared,
          enter your backup code below to get everything back.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <code style={{ background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: 14, letterSpacing: 1, color: 'var(--accent)' }}>
            {backupCode || 'SA-••••-••••'}
          </code>
          <button
            onClick={() => onCopyCode && onCopyCode(backupCode)}
            style={btnStyle('#6366f1')}
            disabled={!backupCode}
          >
            📋 Copy
          </button>
          <button onClick={() => { if (onSyncNow) onSyncNow(); }} disabled={cloudSyncing || !backupCode} style={btnStyle('#22c55e', cloudSyncing || !backupCode)}>
            {cloudSyncing ? '⏳...' : '🔄 Sync Now'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 12 }}>
          {lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : 'Not synced yet'}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 6 }}>
          Restore from code
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <input
            value={restoreCode}
            onChange={e => setRestoreCode(e.target.value)}
            placeholder="SA-XXXX-XXXX"
            style={{ flex: 1, minWidth: 150, padding: '9px 12px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', letterSpacing: 1 }}
          />
          <button onClick={handleRestore} disabled={cloudRestoring || !restoreCode.trim()} style={btnStyle('#f59e0b', cloudRestoring || !restoreCode.trim())}>
            {cloudRestoring ? '⏳...' : '♻️ Restore'}
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer', marginBottom: 4 }}>
          <input type="checkbox" checked={audioBackup} onChange={toggleAudioBackup} />
          Back up downloaded audio files to the cloud
        </label>
      </div>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 10 }}>
          Local Data & Files
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            ❤️ {stats.liked} · 🕐 {stats.recent} · 📥 {stats.downloads} · 🎵 {stats.custom}
          </span>
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: opfsAvailable ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            color: opfsAvailable ? '#22c55e' : '#ef4444',
            fontWeight: 600,
          }}>
            {opfsAvailable === null ? 'Checking...' : opfsAvailable ? 'OPFS Active ✅' : 'OPFS Off ❌'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={btnStyle('#6366f1')}>
            📤 Export file
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={btnStyle('#22c55e')}>
            📥 Import file
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          <button onClick={handleSyncOpfs} disabled={syncing || !opfsAvailable} style={btnStyle('#f59e0b', syncing || !opfsAvailable)}>
            {syncing ? '⏳...' : '🔄 Sync local'}
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(color, disabled) {
  return {
    fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 6,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? 'var(--bg-elevated)' : color,
    color: disabled ? 'var(--text-dim)' : '#fff',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit',
  };
}
