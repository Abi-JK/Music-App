import React, { useState } from 'react';
import SongRow from '../components/SongRow';
import { getAlbumSongs } from '../utils/api';

export default function SearchView({ searchLoading, searched, searchResults, currentSong, isPlaying, playSong, handleDownload, toggleLike, isLiked, openRingtone, setDetailSong, addToQueue, showToast, doSearch }) {
  const [albumLoading, setAlbumLoading] = useState(null);

  // Group songs by album name
  const albums = {};
  searchResults.forEach(s => {
    const key = s.album || 'Unknown Album';
    if (!albums[key]) albums[key] = [];
    albums[key].push(s);
  });
  const albumEntries = Object.entries(albums);

  const handlePlayAlbum = (songs, shuffle = false) => {
    const order = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;
    playSong(order[0], order, 0);
  };

  const handleLoadAlbum = async (albumName) => {
    setAlbumLoading(albumName);
    try {
      const res = await getAlbumSongs(albumName);
      if (res?.length) {
        playSong(res[0], res, 0);
        doSearch(albumName);
      } else {
        // Fallback: just search the album name
        doSearch(albumName);
      }
    } catch {
      doSearch(albumName);
    }
    setAlbumLoading(null);
  };

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
        {searchResults.length} results in {albumEntries.length} albums
      </div>
      {albumEntries.map(([album, songs]) => (
        <div key={album} className="album-group">
          <div className="album-group-header">
            <div className="album-group-info">
              <span className="album-group-cover">
                {songs[0]?.coverUrl
                  ? <img src={songs[0].coverUrl} alt="" />
                  : <span>🎵</span>}
              </span>
              <div>
                <div className="album-group-name">{album}</div>
                <div className="album-group-meta">
                  {songs[0]?.language ? `${songs[0].language} • ` : ''}{songs.length} songs
                  {songs[0]?.year ? ` • ${songs[0].year}` : ''}
                </div>
              </div>
            </div>
            <div className="album-group-actions">
              <button className="icon-btn btn-accent" title="Play All"
                onClick={() => handlePlayAlbum(songs)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
              <button className="icon-btn" title="Shuffle Play"
                onClick={() => handlePlayAlbum(songs, true)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                </svg>
              </button>
              <button className="icon-btn" title="Load full album"
                onClick={() => handleLoadAlbum(album)} disabled={albumLoading === album}>
                {albumLoading === album
                  ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                  : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>}
              </button>
            </div>
          </div>
          <div className="song-table">
            {songs.map((song, i) => (
              <SongRow key={song.id} song={song} idx={i}
                isActive={currentSong?.id === song.id} isPlaying={isPlaying}
                onPlay={() => playSong(song, searchResults, searchResults.indexOf(song))}
                onDownload={handleDownload} onLike={toggleLike}
                liked={isLiked(song.id)} onRingtone={openRingtone}
                onDetails={setDetailSong} onAddToQueue={addToQueue}/>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
