import React from 'react';
import SongRow from '../components/SongRow';

export default function SearchView({ searchLoading, searched, searchResults, currentSong, isPlaying, playSong, handleDownload, toggleLike, isLiked, openRingtone, setDetailSong, addToQueue }) {
  if (searchLoading) return (
    <div className="spinner-wrap">
      <div className="spinner"/>
      <p style={{ color: 'var(--text-muted)' }}>Searching...</p>
    </div>
  );

  if (!searched) return (
    <div className="empty">
      <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <h3>Search songs, movies, artists</h3>
      <p>Type in the search box — live suggestions appear as you type</p>
    </div>
  );

  if (!searchResults.length) return (
    <div className="empty">
      <h3>No results found</h3>
      <p>Try a different query</p>
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: 14, color: 'var(--text-secondary)', fontSize: 12 }}>
        {searchResults.length} results
      </div>
      <div className="table-head">
        <span>#</span>
        <span>SONG</span>
        <span>ALBUM</span>
        <span>DURATION</span>
        <span></span>
      </div>
      <div className="song-table">
        {searchResults.map((song, i) => (
          <SongRow key={song.id} song={song} idx={i}
            isActive={currentSong?.id === song.id} isPlaying={isPlaying}
            onPlay={() => playSong(song, searchResults, i)}
            onDownload={handleDownload} onLike={toggleLike}
            liked={isLiked(song.id)} onRingtone={openRingtone}
            onDetails={setDetailSong} onAddToQueue={addToQueue}/>
        ))}
      </div>
    </>
  );
}
