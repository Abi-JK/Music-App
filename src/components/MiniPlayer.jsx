import React, { useCallback } from 'react';

export default function MiniPlayer({ currentSong, isPlaying, setIsPlaying, onPlayPrev, onPlayNext, curTime, dur, onExpand, onShowLyrics, downloadSong, currentSongDownloaded }) {
  const onSeek = useCallback((e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const audioEl = document.getElementById('main-audio');
    if (audioEl && dur) audioEl.currentTime = pct * dur;
  }, [dur]);

  if (!currentSong) return null;

  const prog = dur ? (curTime / dur) * 100 : 0;

  return (
    <div className="mini-player">
      <div className="mini-progress" onClick={onSeek} style={{ cursor: 'pointer' }}>
        <div className="mini-progress-bar" style={{ width: `${isPlaying ? prog : 0}%` }} />
      </div>
      <div className="mini-inner">
        {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="mini-cover" onClick={onExpand} /> : <div className="mini-cover mini-ph" onClick={onExpand}>🎵</div>}
        <div className="mini-info" onClick={onExpand}>
          <div className="mini-title">{currentSong.title}</div>
          <div className="mini-artist">{currentSong.artist}</div>
        </div>
        {onPlayPrev && (
          <button className="mini-play-btn" onClick={onPlayPrev} style={{ fontSize: 16 }}>⏮</button>
        )}
        <button className="mini-play-btn" onClick={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="mini-next-btn" onClick={onPlayNext}>⏭</button>
        {downloadSong && (
          <button
            className="icon-btn"
            onClick={() => { if (!currentSongDownloaded) downloadSong(currentSong); }}
            title={currentSongDownloaded ? 'Downloaded' : 'Download'}
            style={{ fontSize: 14, padding: 4, opacity: currentSongDownloaded ? 0.5 : 1 }}
            disabled={currentSongDownloaded}
          >
            {currentSongDownloaded ? '✅' : '📥'}
          </button>
        )}
        {onShowLyrics && (
          <button className="icon-btn" onClick={onShowLyrics} title="Lyrics" style={{ fontSize: 14, padding: 4 }}>📝</button>
        )}
      </div>
    </div>
  );
}
