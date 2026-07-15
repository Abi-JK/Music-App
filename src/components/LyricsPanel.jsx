import React, { useState, useEffect } from 'react';
import { fetchLyrics } from '../utils/api';

export default function LyricsPanel({ songId, songTitle, songArtist, onClose }) {
  const [lyrics, setLyrics] = useState('');
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');

  useEffect(() => {
    if (!songId) return;
    setLoading(true);
    setLyrics('');
    setSource('');
    
    fetchLyrics(songId, songTitle, songArtist).then(text => {
      setLyrics(text || '');
      if (text) setSource('');
      setLoading(false);
    }).catch(() => setLoading(false));
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
            <>
              <pre className="lyrics-text">{lyrics}</pre>
              {source && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 16 }}>{source}</p>}
            </>
          ) : (
            <div className="empty">
              <div style={{ fontSize: 36 }}>📝</div>
              <h3>Lyrics not available</h3>
              <p>We searched multiple sources but couldn't find lyrics for this song. Try searching for a different version.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
