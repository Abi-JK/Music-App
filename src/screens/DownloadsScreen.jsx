import React from 'react';
import { formatTime } from '../utils/helpers';

export default function DownloadsScreen({ downloadedSongs, currentSong, isPlaying, playSong, removeDownload }) {
  if (!downloadedSongs.length) return (
    <div className="empty">
      <div style={{ fontSize: 48 }}>📥</div>
      <h3>No downloaded songs</h3>
      <p>Download songs to play them offline. Tap the download icon (⬇) on any song in search results.</p>
    </div>
  );

  return (
    <div className="downloads-screen">
      <h3 className="sec-title" style={{ marginBottom: 16 }}>📥 Downloaded Songs ({downloadedSongs.length})</h3>
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
              onClick={() => playSong(song, downloadedSongs, i)}>
              <span className="row-num">
                {isActive && isPlaying ? <div className="eq"><span /><span /><span /></div> : i + 1}
              </span>
              <div className="row-info">
                {song.coverUrl ? <img src={song.coverUrl} alt="" /> : <div className="r-ph">🎵</div>}
                <div className="row-text">
                  <h4>{song.title}</h4>
                  <p>{song.artist}</p>
                </div>
              </div>
              <span className="row-album">{song.album || '—'}</span>
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
