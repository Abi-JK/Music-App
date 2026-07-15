import React from 'react';

export default function MiniPlayer({ currentSong, isPlaying, setIsPlaying, onPlayNext, curTime, dur, onExpand }) {
  if (!currentSong) return null;

  const prog = dur ? (curTime / dur) * 100 : 0;

  return (
    <div className="mini-player">
      <div className="mini-progress"><div className="mini-progress-bar" style={{ width: `${isPlaying ? prog : 0}%` }} /></div>
      <div className="mini-inner">
        {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="mini-cover" onClick={onExpand} /> : <div className="mini-cover mini-ph" onClick={onExpand}>🎵</div>}
        <div className="mini-info" onClick={onExpand}>
          <div className="mini-title">{currentSong.title}</div>
          <div className="mini-artist">{currentSong.artist}</div>
        </div>
        <button className="mini-play-btn" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="mini-next-btn" onClick={onPlayNext}>⏭</button>
      </div>
    </div>
  );
}
