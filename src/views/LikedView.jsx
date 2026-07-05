import React from 'react';
import SongRow from '../components/SongRow';

export default function LikedView({ likedSongs, currentSong, isPlaying, playSong, handleDownload, toggleLike, isLiked, openRingtone, setDetailSong }) {
  if (likedSongs.length === 0) return (
    <div className="empty">
      <span style={{ fontSize: 48 }}>❤️</span>
      <h3>No liked songs yet</h3>
      <p>Tap ❤️ on any song to save it here</p>
    </div>
  );

  return (
    <>
      <div className="sec-title">❤️ Liked Songs ({likedSongs.length})</div>
      <div className="table-head">
        <span>#</span>
        <span>SONG</span>
        <span>ALBUM</span>
        <span>DURATION</span>
        <span></span>
      </div>
      <div className="song-table">
        {likedSongs.map((song, i) => (
          <SongRow key={song.id} song={song} idx={i}
            isActive={currentSong?.id === song.id} isPlaying={isPlaying}
            onPlay={() => playSong(song, likedSongs, i)}
            onDownload={handleDownload} onLike={toggleLike}
            liked={isLiked(song.id)} onRingtone={openRingtone}
            onDetails={setDetailSong}/>
        ))}
      </div>
    </>
  );
}
