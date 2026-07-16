import React, { useState, useEffect } from 'react';
import { fetchLyrics } from '../utils/api';

export default function LyricsPanel({ songId, songTitle, songArtist, onClose }) {
  const [lyrics, setLyrics] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!songId || !songTitle) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setLyrics('');

    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
    const lyricsPromise = fetchLyrics(songId, songTitle, songArtist);

    Promise.race([lyricsPromise, timeout]).then(text => {
      if (!cancelled) {
        setLyrics(text || '');
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [songId, songTitle, songArtist]);

  return (
    <div className="lyrics-overlay" onClick={onClose}>
      <div className="lyrics-panel" onClick={e => e.stopPropagation()}>
        <div className="lyrics-header">
          <div>
            <h3>{songTitle || 'Lyrics'}</h3>
            {songArtist && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{songArtist}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div className="lyrics-body">
          {loading ? (
            <div className="spinner-wrap">
              <div className="spinner" />
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Searching for lyrics...</p>
            </div>
          ) : lyrics ? (
            <pre className="lyrics-text">{lyrics}</pre>
          ) : (
            <div className="empty">
              <div style={{ fontSize: 36 }}>📝</div>
              <h3>Lyrics not available</h3>
              <p>Lyrics for independent artists may not be available yet. Try searching for a well-known song to see lyrics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
