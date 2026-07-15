import React, { useState, useEffect } from 'react';
import { fetchLyrics } from '../utils/api';

export default function LyricsPanel({ songId, songTitle, onClose }) {
  const [lyrics, setLyrics] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!songId) return;
    setLoading(true);
    setLyrics('');
    fetchLyrics(songId).then(text => {
      setLyrics(text || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [songId]);

  return (
    <div className="lyrics-overlay" onClick={onClose}>
      <div className="lyrics-panel" onClick={e => e.stopPropagation()}>
        <div className="lyrics-header">
          <h3>{songTitle || 'Lyrics'}</h3>
          <button className="icon-btn" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div className="lyrics-body">
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading lyrics...</p></div>
          ) : lyrics ? (
            <pre className="lyrics-text">{lyrics}</pre>
          ) : (
            <div className="empty">
              <div style={{ fontSize: 36 }}>📝</div>
              <h3>No lyrics available</h3>
              <p>Lyrics not found for this song</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
