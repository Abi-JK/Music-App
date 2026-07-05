import React from 'react';

export default function SongCard({ song, isActive, isPlaying, onPlay, onDetails }) {
  return (
    <div className={`song-card ${isActive ? 'now-playing' : ''}`}
      onClick={() => { onPlay(); onDetails(song); }}>
      {song.coverUrl ? <img src={song.coverUrl} alt="" loading="lazy"/> : <div className="sc-ph">🎵</div>}
      <button className="card-play" onClick={e => { e.stopPropagation(); onPlay(); }}>
        {isActive && isPlaying
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="black"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>}
      </button>
      {song.offline && <span className="card-offline-badge">📴</span>}
      <h4 style={{ color: isActive ? 'var(--accent)' : undefined }}>{song.title}</h4>
      <p>{song.artist}</p>
    </div>
  );
}
