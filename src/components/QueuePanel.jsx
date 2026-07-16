import React from 'react';
import { formatTime } from '../utils/helpers';

export default function QueuePanel({ playlist, currentIndex, currentSong, playSong, onClose }) {
  const upcoming = playlist.slice(currentIndex + 1);

  return (
    <div className="lyrics-overlay" onClick={onClose}>
      <div className="lyrics-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="lyrics-header">
          <div>
            <h3>Play Queue</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {playlist.length} songs · {upcoming.length} upcoming
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div className="lyrics-body" style={{ padding: 0 }}>
          {currentSong && (
            <div className="queue-section">
              <div className="queue-label">Now Playing</div>
              <div className="queue-item queue-item--active">
                <div className="queue-item-info">
                  {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="queue-cover" /> : <div className="queue-cover queue-ph">🎵</div>}
                  <div className="queue-text">
                    <h4>{currentSong.title}</h4>
                    <p>{currentSong.artist}</p>
                  </div>
                </div>
                <span className="queue-dur">{formatTime(currentSong.duration)}</span>
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="queue-section">
              <div className="queue-label">Up Next</div>
              {upcoming.map((song, i) => (
                <div key={song.id} className="queue-item" onClick={() => { playSong(song, playlist, currentIndex + 1 + i); onClose(); }}>
                  <div className="queue-item-info">
                    {song.coverUrl ? <img src={song.coverUrl} alt="" className="queue-cover" /> : <div className="queue-cover queue-ph">🎵</div>}
                    <div className="queue-text">
                      <h4>{song.title}</h4>
                      <p>{song.artist}</p>
                    </div>
                  </div>
                  <span className="queue-dur">{formatTime(song.duration)}</span>
                </div>
              ))}
            </div>
          )}
          {upcoming.length === 0 && !currentSong && (
            <div className="empty" style={{ padding: 40 }}>
              <p>Queue is empty. Search and play a song to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
