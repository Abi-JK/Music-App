import React, { useState, useEffect, useRef } from 'react';
import { Storage } from '../utils/storage';

export default function DataSettings({ showToast }) {
  const [opfsAvailable, setOpfsAvailable] = useState(null);
  const [stats, setStats] = useState({ liked: 0, recent: 0, downloads: 0 });
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    Storage.getOpfsStatus().then(ok => setOpfsAvailable(ok));
    loadStats();
  }, []);

  const loadStats = async () => {
    const liked = await Storage.getLikedSongs();
    const recent = await Storage.getRecentlyPlayed();
    const downloads = await Storage.getDownloadedSongs();
    setStats({ liked: liked.length, recent: recent.length, downloads: downloads.length });
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

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 10 }}>
        Data & Backup
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          ❤️ {stats.liked} · 🕐 {stats.recent} · 📥 {stats.downloads}
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
          📤 Export
        </button>
        <button onClick={() => fileInputRef.current?.click()} style={btnStyle('#22c55e')}>
          📥 Import
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        <button onClick={handleSyncOpfs} disabled={syncing || !opfsAvailable} style={btnStyle('#f59e0b', syncing || !opfsAvailable)}>
          {syncing ? '⏳...' : '🔄 Sync OPFS'}
        </button>
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
  };
}
