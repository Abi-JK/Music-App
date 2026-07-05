import React from 'react';
import { fmt } from '../utils/helpers';

export default function SongRow({ song, idx, isActive, isPlaying, onPlay, onDownload, onLike, liked, onRingtone, onDetails, onDelete }) {
  return (
    <div className={`song-row ${isActive ? 'now-playing' : ''}`}
      onClick={() => { onPlay(); onDetails(song); }}>
      <div className="row-num">
        {isActive && isPlaying
          ? <div className="eq"><span/><span/><span/></div>
          : <span style={{ color: isActive ? 'var(--accent)' : undefined }}>{idx + 1}</span>}
      </div>
      <div className="row-info">
        {song.coverUrl ? <img src={song.coverUrl} alt="" loading="lazy"/> : <div className="r-ph">🎵</div>}
        <div className="row-text">
          <h4 style={{ color: isActive ? 'var(--accent)' : undefined }}>{song.title}</h4>
          <p>{song.artist}{song.year ? ` • ${song.year}` : ''}{song.offline ? ' 📴' : ''}</p>
        </div>
      </div>
      <div className="row-album">{song.album}</div>
      <div className="row-dur">{song.duration > 0 ? fmt(song.duration) : '—'}</div>
      <div className="row-acts">
        <button className={`icon-btn ${liked ? 'liked' : ''}`} onClick={e => { e.stopPropagation(); onLike(song); }} title={liked ? "Unlike" : "Like"}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        <button className={`icon-btn ${song.offline ? 'saved' : ''}`} title="Save offline" onClick={e => { e.stopPropagation(); onDownload(song); }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={song.offline ? "2.5" : "2"} viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            {song.offline 
              ? <polyline points="20 6 9 17 4 12" stroke="var(--accent)"/>
              : <><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>}
          </svg>
        </button>
        {onRingtone && (
          <button className="icon-btn" title="Ringtone Cutter" onClick={e => { e.stopPropagation(); onRingtone(song); }}>✂️</button>
        )}
        {onDelete && (
          <button className="icon-btn delete-btn" title="Remove" onClick={e => { e.stopPropagation(); onDelete(song); }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
