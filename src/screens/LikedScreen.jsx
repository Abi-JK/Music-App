import React from 'react';
import { formatTime } from '../utils/helpers';

export default function LikedScreen({ likedSongs, currentSong, isPlaying, playSong, toggleLike }) {
  if (!likedSongs.length) return (
    <div className="empty">
      <div style={{ fontSize: 48 }}>❤️</div>
      <h3>No liked songs yet</h3>
      <p>Tap the heart icon on any song to save it here</p>
    </div>
  );

  return (
    <div className="liked-screen">
      <h3 className="sec-title" style={{ marginBottom: 16 }}>❤️ Liked Songs ({likedSongs.length})</h3>
      <div className="song-table">
        <div className="table-head">
          <span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span>
        </div>
        {likedSongs.map((song, i) => {
          const isActive = currentSong?.id === song.id;
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
