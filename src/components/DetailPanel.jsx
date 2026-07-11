import React, { useState, useEffect } from 'react';
import { fmt } from '../utils/helpers';
import { fetchLyrics, searchSongs } from '../utils/api';

export default function DetailPanel({ song, onClose, liked, toggleLike, onPlay, isPlaying, showToast, onDownload, onRingtone, onAddToQueue, onSearchArtist, onPlaySong }) {
  const [lyrics, setLyrics]     = useState(null);
  const [lyricsBusy, setLyBusy] = useState(false);
  const [lyricsNone, setLyNone] = useState(false);
  const [related, setRelated]   = useState([]);

  useEffect(() => {
    if (!song) return;
    let cancelled = false;
    setLyrics(null); setLyNone(false);
    if (song.hasLyrics === false) { setLyNone(true); return; }
    setLyBusy(true);
    fetchLyrics(song.id)
      .then(txt => { if (!cancelled) { setLyrics(txt); if (!txt) setLyNone(true); } })
      .catch(() => { if (!cancelled) setLyNone(true); })
      .finally(() => { if (!cancelled) setLyBusy(false); });
    return () => { cancelled = true; };
  }, [song?.id, song?.hasLyrics]);

  // Fetch related songs based on artist + album
  useEffect(() => {
    if (!song) return;
    let cancelled = false;
    const q = [song.artist, song.album].filter(Boolean).join(' ').trim() || song.title;
    searchSongs(q, 12)
      .then(songs => {
        if (!cancelled) setRelated(songs.filter(s => s.id !== song.id).slice(0, 8));
      })
      .catch(() => { if (!cancelled) setRelated([]); });
    return () => { cancelled = true; };
  }, [song?.id, song?.artist, song?.album, song?.title]);

  if (!song) return null;
  const isLiked = liked(song.id);

  return (
    <div className="detail-panel">
      <div className="panel-header">
        <h3>Now Playing</h3>
        <button className="close-btn" onClick={onClose}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="panel-scroll">
        {song.coverUrl
          ? <img src={song.coverUrl} alt="" className="panel-cover"/>
          : <div className="panel-cover-ph">🎵</div>}

        <div className="panel-info">
          <div className="panel-top-row">
            <div className="panel-titles">
              <div className="panel-title">{song.title}</div>
              <div className="panel-artist">
                {onSearchArtist
                  ? <span className="p-artist-link" onClick={() => { onSearchArtist(song.artist); onClose(); }}>{song.artist}</span>
                  : song.artist}
              </div>
            </div>
            <button className={`icon-btn ${isLiked ? 'liked' : ''}`} onClick={() => toggleLike(song)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>

          <div className="panel-action-row">
            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onPlay}>
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button className="btn-outline" onClick={() => onDownload(song)}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {song.offline ? 'Saved ✓' : 'Save'}
            </button>
            <button className="btn-outline" onClick={() => onRingtone(song)} title="Make Ringtone">✂️</button>
            {onAddToQueue && (
              <button className="btn-outline" onClick={() => { onAddToQueue(song); showToast('➕ Added to queue'); }} title="Add to Queue">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Queue
              </button>
            )}
          </div>

          <div className="panel-meta">
            {song.album    && <div className="meta-row"><span className="meta-label">Album</span><span className="meta-value">{song.album}</span></div>}
            {song.year     && <div className="meta-row"><span className="meta-label">Year</span><span className="meta-value">{song.year}</span></div>}
            {song.duration > 0 && <div className="meta-row"><span className="meta-label">Duration</span><span className="meta-value">{fmt(song.duration)}</span></div>}
            {song.singers  && <div className="meta-row"><span className="meta-label">Singers</span><span className="meta-value">{song.singers}</span></div>}
            {song.language && <div className="meta-row"><span className="meta-label">Language</span><span className="meta-value" style={{ textTransform: 'capitalize' }}>{song.language}</span></div>}
          </div>

          {/* Related songs */}
          {related.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="panel-section-title">RELATED SONGS</div>
              {related.map((rs, i) => (
                <div key={rs.id} className="related-row"
                  onClick={() => { if (onPlaySong) onPlaySong(rs); }}>
                  <div className="related-idx" style={{ color: 'var(--text-muted)', fontSize: 11, width: 20, flexShrink: 0 }}>{i + 1}</div>
                  <div className="row-info" style={{ flex: 1, minWidth: 0 }}>
                    {rs.coverUrl
                      ? <img src={rs.coverUrl} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0, background: 'var(--bg-card)' }}/>
                      : <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🎵</div>}
                    <div style={{ marginLeft: 8, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rs.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rs.artist}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{fmt(rs.duration)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Lyrics */}
          <div className="lyrics-section">
            <div className="panel-section-title">LYRICS</div>
            {lyricsBusy ? (
              <div className="lyrics-loading">
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/>
                <span>Loading lyrics...</span>
              </div>
            ) : lyrics ? (
              <div className="lyrics-text">
                {lyrics.split('\n').map((line, i) => (
                  <p key={i} className="lyrics-line">{line || <br/>}</p>
                ))}
              </div>
            ) : lyricsNone ? (
              <div className="lyrics-empty"><span>🎵</span><p>Lyrics not available.</p></div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
