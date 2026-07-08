import React, { useState } from 'react';
import SongRow from '../components/SongRow';

export default function LikedView({ likedSongs, currentSong, isPlaying, playSong, handleDownload, toggleLike, isLiked, openRingtone, setDetailSong, addToQueue }) {
  const [filter, setFilter] = useState('');

  const filtered = likedSongs.filter(s =>
    !filter.trim() ||
    s.title?.toLowerCase().includes(filter.toLowerCase()) ||
    s.artist?.toLowerCase().includes(filter.toLowerCase()) ||
    s.album?.toLowerCase().includes(filter.toLowerCase())
  );

  if (likedSongs.length === 0) return (
    <div className="empty">
      <span style={{ fontSize: 48 }}>❤️</span>
      <h3>No liked songs yet</h3>
      <p>Tap ❤️ on any song to save it here</p>
    </div>
  );

  const handleShuffleAll = () => {
    const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled, 0);
  };

  return (
    <>
      <div className="sec-title">❤️ Liked Songs ({likedSongs.length})</div>

      <div className="liked-toolbar">
        <div className="liked-search-wrap" style={{ marginBottom: 0, flex: 1 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" placeholder="Search in liked songs..."
            value={filter} onChange={e => setFilter(e.target.value)}
          />
          {filter && <button className="clear-btn" onClick={() => setFilter('')}>✕</button>}
        </div>
        <button className="btn-primary liked-shuffle-btn" onClick={handleShuffleAll} title="Shuffle play all liked songs">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
          </svg>
          Shuffle
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty" style={{ paddingTop: 20 }}>
          <p>No songs match your search</p>
        </div>
      ) : (
        <>
          <div className="table-head">
            <span>#</span>
            <span>SONG</span>
            <span>ALBUM</span>
            <span>DURATION</span>
            <span></span>
          </div>
          <div className="song-table">
            {filtered.map((song, i) => (
              <SongRow key={song.id} song={song} idx={likedSongs.indexOf(song)}
                isActive={currentSong?.id === song.id} isPlaying={isPlaying}
                onPlay={() => playSong(song, likedSongs, likedSongs.indexOf(song))}
                onDownload={handleDownload} onLike={toggleLike}
                liked={isLiked(song.id)} onRingtone={openRingtone}
                onDetails={setDetailSong} onAddToQueue={addToQueue}/>
            ))}
          </div>
        </>
      )}
    </>
  );
}
