import React from 'react';
import { formatTime } from '../utils/helpers';

export default function DownloadsScreen({ downloadedSongs, currentSong, isPlaying, playSong, removeDownload }) {
  if (!downloadedSongs.length) return (
    <div className="empty">
      <div style={{ fontSize: 48 }}>📥</div>
      <h3>No downloaded songs</h3>
      <p>Download songs to play them offline. Tap the download icon (📥) on any song in search results.</p>
    </div>
  );

  const playAll = () => {
    if (downloadedSongs.length > 0) playSong(downloadedSongs[0], downloadedSongs, 0);
  };

  const shufflePlay = () => {
    if (downloadedSongs.length === 0) return;
    const shuffled = [...downloadedSongs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled, 0);
  };

  return (
    <div className="downloads-screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 className="sec-title" style={{ margin: 0 }}>📥 Downloaded ({downloadedSongs.length})</h3>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button className="icon-btn" onClick={playAll} title="Play All"
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 20, background: 'var(--accent)', color: '#000', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            ▶ Play All
          </button>
          <button className="icon-btn" onClick={shufflePlay} title="Shuffle Play"
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'var(--text)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            🔀 Shuffle
          </button>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        These songs are saved on your device and work offline.
      </p>
      <div className="song-table">
        <div className="table-head">
          <span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span>
        </div>
        {downloadedSongs.map((song, i) => {
          const isActive = currentSong?.id === song.id;
          return (
            <div key={song.id} className={`song-row ${isActive ? 'now-playing' : ''}`}
              onClick={() => playSong(song, downloadedSongs, i)}
              title={`${song.title} — ${song.artist}`}>
              <span className="row-num">
                {isActive && isPlaying ? <div className="eq"><span /><span /><span /></div> : i + 1}
              </span>
              <div className="row-info">
                {song.coverUrl ? <img src={song.coverUrl} alt="" /> : <div className="r-ph">🎵</div>}
                <div className="row-text">
                  <h4 title={song.title}>{song.title}</h4>
                  <p title={song.artist}>{song.artist}</p>
                </div>
              </div>
              <span className="row-album" title={song.album || ''}>{song.album || '—'}</span>
              <span className="row-dur">{formatTime(song.duration)}</span>
              <div className="row-acts">
                {removeDownload && (
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); removeDownload(song.id); }}
                    title="Remove download">
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
