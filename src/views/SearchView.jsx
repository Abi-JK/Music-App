import React, { useState } from 'react';
import SongRow from '../components/SongRow';
import { getAlbumSongs, searchAlbumSongs } from '../utils/api';

export default function SearchView({ searchLoading, searched, searchResults, searchAlbums, currentSong, isPlaying, playSong, handleDownload, toggleLike, isLiked, openRingtone, setDetailSong, addToQueue, showToast, doSearch }) {
  const [albumLoading, setAlbumLoading] = useState(null);

  const handlePlayAlbum = (songs, shuffle = false) => {
    const order = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;
    playSong(order[0], order, 0);
  };

  const handleAlbumClick = async (album) => {
    setAlbumLoading(album.id);
    showToast(album.isVirtual ? `🎤 Loading: ${album.name}...` : `📂 Loading: ${album.name}...`);
    try {
      let songs;
      if (album.isVirtual) {
        // Virtual album — songs already fetched or search by artist/query
        if (album.songs?.length) {
          songs = album.songs;
        } else {
          songs = await searchAlbumSongs(album.name, 40);
        }
      } else {
        // Real album from API
        songs = await getAlbumSongs(album.id);
      }
      if (songs?.length) {
        playSong(songs[0], songs, 0);
        showToast(`▶️ ${album.name} — ${songs.length} songs`);
      } else {
        showToast('⚠️ No songs found for this album.');
      }
    } catch {
      showToast('⚠️ Could not load album songs.');
    }
    setAlbumLoading(null);
  };

  // Group song results by album
  const albumMap = {};
  searchResults.forEach(s => {
    const key = s.album || 'Other Songs';
    if (!albumMap[key]) albumMap[key] = [];
    albumMap[key].push(s);
  });
  const albumEntries = Object.entries(albumMap);
  const noAlbumCount = searchResults.filter(s => !s.album).length;
  const showFlat = noAlbumCount > searchResults.length * 0.6 && searchResults.length > 5;

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

  if (!searchResults.length && !searchAlbums?.length) return (
    <div className="empty">
      <h3>No results found</h3>
      <p>Try a different query</p>
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: 14, color: 'var(--text-secondary)', fontSize: 12 }}>
        {searchResults.length} songs{searchAlbums?.length ? ` • ${searchAlbums.length} albums` : ''}
      </div>

      {/* Album cards — real + virtual */}
      {searchAlbums?.length > 0 && (
        <div className="album-search-results">
          <div className="sec-title" style={{ fontSize: 15 }}>Albums</div>
          <div className="album-card-grid">
            {searchAlbums.map(album => (
              <div key={album.id} className="album-card" onClick={() => handleAlbumClick(album)}>
                <div className="album-card-img-wrap">
                  {album.image
                    ? <img src={album.image} alt={album.name} />
                    : <div className="album-card-ph">🎵</div>}
                  {albumLoading === album.id && (
                    <div className="album-card-loading">
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    </div>
                  )}
                </div>
                <div className="album-card-info">
                  <h4>{album.name}</h4>
                  <p>{album.songCount} songs{album.year ? ` • ${album.year}` : ''}{album.isVirtual ? ' • auto' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Song results grouped by album */}
      {searchResults.length > 0 && (
        showFlat ? (
          <>
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
        ) : (
          albumEntries.map(([album, songs]) => (
            <div key={album} className="album-group">
              <div className="album-group-header">
                <div className="album-group-info">
                  <span className="album-group-cover">
                    {songs[0]?.coverUrl ? <img src={songs[0].coverUrl} alt="" /> : <span>🎵</span>}
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
          ))
        )
      )}
    </>
  );
}
