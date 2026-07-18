import React from 'react';
import { formatTime } from '../utils/helpers';

export default function LikedScreen({ likedSongs, currentSong, isPlaying, playSong, toggleLike, downloadSong, downloadedIds, downloadingIds }) {
  if (!likedSongs.length) return (
    <div className="empty">
      <div style={{ fontSize: 48 }}>❤️</div>
      <h3>No liked songs yet</h3>
      <p>Tap the heart icon on any song to save it here</p>
    </div>
  );

  const playAll = () => {
    if (likedSongs.length > 0) playSong(likedSongs[0], likedSongs, 0);
  };

  const shufflePlay = () => {
    if (likedSongs.length === 0) return;
    const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled, 0);
  };

  return (
    <div className="liked-screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 className="sec-title" style={{ margin: 0 }}>❤️ Liked Songs ({likedSongs.length})</h3>
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
      <div className="song-table">
        <div className="table-head">
          <span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span>
        </div>
        {likedSongs.map((song, i) => {
          const isActive = currentSong?.id === song.id;
          const isDownloaded = downloadedIds?.includes(song.id);
          const isDownloading = downloadingIds?.includes(song.id);
          return (
            <div key={song.id} className={`song-row ${isActive ? 'now-playing' : ''}`}
              onClick={() => playSong(song, likedSongs, i)}
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
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                  title="Unlike">❤️</button>
                {downloadSong && (
                  <button
                    className="icon-btn"
                    onClick={(e) => { e.stopPropagation(); if (!isDownloaded && !isDownloading) downloadSong(song); }}
                    title={isDownloaded ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Download for offline'}
                    disabled={isDownloaded || isDownloading}
                    style={{ opacity: isDownloaded ? 0.5 : 1 }}
                  >
                    {isDownloaded ? '✅' : isDownloading ? '⏳' : '📥'}
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
