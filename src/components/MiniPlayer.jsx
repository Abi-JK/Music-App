import React from 'react';

export default function MiniPlayer({ currentSong, isPlaying, setIsPlaying, onPlayNext, onOpenDetails, loading }) {
  if (!currentSong) return null;

  return (
    <div className="mini-player" onClick={onOpenDetails}>
      <div className="mini-player-left">
        {currentSong.coverUrl ? (
          <img src={currentSong.coverUrl} alt="" className="mini-player-img" />
        ) : (
          <div className="mini-player-img-ph">🎵</div>
        )}
        <div className="mini-player-info">
          <h4>{currentSong.title}</h4>
          <p>{currentSong.artist}</p>
        </div>
      </div>
      <div className="mini-player-right" onClick={e => e.stopPropagation()}>
        <button className="mini-ctrl-btn" onClick={onPlayNext} title="Next">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>
        <button className="mini-play-btn" onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? 'Pause' : 'Play'}>
          {loading ? (
            <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
          ) : isPlaying ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
