import React from 'react';
import SongRow from '../components/SongRow';

export default function DownloadsView({ downloadedSongs, currentSong, isPlaying, playSong, handleDownload, toggleLike, isLiked, openRingtone, setDetailSong, handleDeleteOffline }) {
  if (downloadedSongs.length === 0) return (
    <div className="empty">
      <span style={{ fontSize: 48 }}>📴</span>
      <h3>No offline songs yet</h3>
      <p>Click ⬇️ on any song to save it for offline use</p>
      <small style={{ color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>
        Plays without internet once saved!
      </small>
    </div>
  );

  return (
    <>
      <div className="sec-title">📴 Offline Library ({downloadedSongs.length} songs)</div>
      <div className="table-head">
        <span>#</span>
        <span>SONG</span>
        <span>ALBUM</span>
        <span>DURATION</span>
        <span></span>
      </div>
      <div className="song-table">
        {downloadedSongs.map((song, i) => (
          <SongRow key={song.id} song={song} idx={i}
            isActive={currentSong?.id === song.id} isPlaying={isPlaying}
            onPlay={() => playSong(song, downloadedSongs, i)}
            onDownload={handleDownload} onLike={toggleLike}
            liked={isLiked(song.id)} onRingtone={openRingtone}
            onDetails={setDetailSong}
            onDelete={handleDeleteOffline}/>
        ))}
      </div>
    </>
  );
}
