import React from 'react';
import { Storage } from '../utils/storage';

export default function DataSettings({ showToast }) {

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

  return (
    <div>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 8 }}>
          Export / Import
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

function btnStyle(color) {
  return {
    fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6,
    border: 'none', cursor: 'pointer', background: color,
    color: '#fff', fontFamily: 'inherit',
  };
}
