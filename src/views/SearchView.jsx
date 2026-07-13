import React, { useState } from 'react';
import SongRow from '../components/SongRow';
import { searchSongs, searchAlbumSongs } from '../utils/api';

function deriveAlbums(songs, query) {
  if (!songs?.length) return [];
  const albums = [];
  albums.push({
    id: `vq_${(query || 'search').replace(/[^a-z0-9]/gi, '_')}`,
    name: query || songs[0]?.album || 'All Songs',
    image: songs[0]?.coverUrl || '',
    songCount: songs.length,
    year: songs.find(s => s.year)?.year || '',
    isVirtual: true,
    songs: songs.slice(),
  });
  const groups = {};
  songs.forEach(s => {
    const a = s.artist || 'Unknown';
    if (!groups[a]) groups[a] = [];
    groups[a].push(s);
  });
  Object.entries(groups)
    .filter(([, ss]) => ss.length >= 3)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 4)
    .forEach(([artist, ss]) => {
      albums.push({
        id: `va_${artist.replace(/[^a-z0-9]/gi, '_')}`,
        name: artist,
        image: ss[0]?.coverUrl || '',
        songCount: ss.length,
        year: ss.find(s2 => s2.year)?.year || '',
        isVirtual: true,
        songs: ss.slice(),
      });
    });
  return albums;
}

export default function SearchView({ searchLoading, searched, searchResults, currentSong, isPlaying, playSong, handleDownload, toggleLike, isLiked, openRingtone, setDetailSong, addToQueue, showToast, doSearch, userAlbums, onAddToAlbum, onCreateAlbum }) {
  const [albumLoading, setAlbumLoading] = useState(null);
  const [viewAlbum, setViewAlbum] = useState(null);
  const [albumPickerSong, setAlbumPickerSong] = useState(null);

  const albums = React.useMemo(() => deriveAlbums(searchResults, ''), [searchResults]);

  const handlePlayAlbum = (songs, shuffle = false) => {
    const order = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs;
    playSong(order[0], order, 0);
  };

  const handleAlbumClick = async (album) => {
    if (viewAlbum?.id === album.id) { setViewAlbum(null); return; }
    setAlbumLoading(album.id);
    try {
      const [fresh, filtered] = await Promise.all([
        searchSongs(album.name, 80).catch(() => []),
        searchAlbumSongs(album.name, 80).catch(() => []),
      ]);
      const seen = new Set();
      const merged = [...fresh, ...filtered, ...album.songs]
        .filter(s => { if (!s?.id || seen.has(s.id)) return false; seen.add(s.id); return true; })
        .slice(0, 100);
      const songs = merged.length > 0 ? merged : album.songs;
      setViewAlbum({ ...album, songs });
      if (songs.length) {
        playSong(songs[0], songs, 0);
      }
    } catch {}
    setAlbumLoading(null);
  };

  const handleAddToAlbumClick = (song) => {
    setAlbumPickerSong(song);
  };

  const handleAddToAlbumConfirm = (albumId) => {
    if (albumPickerSong) {
      onAddToAlbum(albumPickerSong, albumId);
      showToast(`➕ Added to album`);
    }
    setAlbumPickerSong(null);
  };

  const handleCreateNewAlbum = () => {
    const name = prompt('New album name:');
    if (name && name.trim()) {
      const album = onCreateAlbum(name.trim());
      if (albumPickerSong) {
        onAddToAlbum(albumPickerSong, album.id);
        showToast(`📀 Created & added to "${name}"`);
      }
    }
    setAlbumPickerSong(null);
  };

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
      <p>Album cards appear for every result — click to explore</p>
    </div>
  );

  if (!searchResults.length) return (
    <div className="empty">
      <h3>No results found</h3>
      <p>Try a different query</p>
    </div>
  );

  if (viewAlbum) {
    const songs = viewAlbum.songs || [];
    return (
      <div className="search-songs-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="icon-btn" onClick={() => setViewAlbum(null)} title="Back">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{viewAlbum.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{songs.length} songs</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => handlePlayAlbum(songs)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Play All
          </button>
          <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => handlePlayAlbum(songs, true)}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
            Shuffle
          </button>
          <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12, background: 'var(--accent)', color: '#000', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { if (onCreateAlbum) { const a = onCreateAlbum(viewAlbum.name); songs.forEach(s => onAddToAlbum(s, a.id)); showToast(`📀 Saved "${viewAlbum.name}" as album`); } }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Save as Album
          </button>
        </div>
        <div className="table-head">
          <span>#</span>
          <span>SONG</span>
          <span>ALBUM</span>
          <span>DURATION</span>
          <span></span>
        </div>
        <div className="song-table">
          {songs.map((song, i) => (
            <SongRow key={song.id} song={song} idx={i}
              isActive={currentSong?.id === song.id} isPlaying={isPlaying}
              onPlay={() => playSong(song, songs, i)}
              onDownload={handleDownload} onLike={toggleLike}
              liked={isLiked(song.id)} onRingtone={openRingtone}
              onDetails={setDetailSong} onAddToQueue={addToQueue}
              onAddToAlbum={handleAddToAlbumClick}/>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="search-songs-wrap">
      <div style={{ marginBottom: 14, color: 'var(--text-secondary)', fontSize: 12 }}>
        {searchResults.length} songs · {albums.length} albums
      </div>

      {albums.length > 0 && (
        <div className="album-search-results">
          <div className="sec-title" style={{ fontSize: 15 }}>Albums</div>
          <div className="album-card-grid">
            {albums.map(album => (
              <div key={album.id} className={`album-card ${viewAlbum?.id === album.id ? 'active' : ''}`}
                onClick={() => handleAlbumClick(album)}>
                <div className="album-card-img-wrap">
                  {album.image ? <img src={album.image} alt={album.name} /> : <div className="album-card-ph">🎵</div>}
                  {albumLoading === album.id && (
                    <div className="album-card-loading"><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /></div>
                  )}
                </div>
                <div className="album-card-info">
                  <h4>{album.name}</h4>
                  <p>{album.songCount} songs{album.year ? ` • ${album.year}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showFlat ? (
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
                onDetails={setDetailSong} onAddToQueue={addToQueue}
                onAddToAlbum={handleAddToAlbumClick}/>
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
                <button className="icon-btn btn-accent" title="Play All" onClick={() => handlePlayAlbum(songs)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <button className="icon-btn" title="Shuffle Play" onClick={() => handlePlayAlbum(songs, true)}>
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
                  onDetails={setDetailSong} onAddToQueue={addToQueue}
                  onAddToAlbum={handleAddToAlbumClick}/>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Album picker modal */}
      {albumPickerSong && (
        <div className="album-picker-overlay" onClick={() => setAlbumPickerSong(null)}>
          <div className="album-picker" onClick={e => e.stopPropagation()}>
            <div className="album-picker-header">
              <h4>Add to Album</h4>
              <button className="icon-btn" onClick={() => setAlbumPickerSong(null)}>✕</button>
            </div>
            <p className="album-picker-song">"{albumPickerSong.title}"</p>
            <div className="album-picker-list">
              {(!userAlbums || userAlbums.length === 0) && (
                <p style={{ color: 'var(--text-muted)', padding: 12, fontSize: 12 }}>No albums yet. Create one!</p>
              )}
              {userAlbums?.map(a => (
                <button key={a.id} className="album-picker-item" onClick={() => handleAddToAlbumConfirm(a.id)}>
                  <span className="album-picker-item-name">{a.name}</span>
                  <span className="album-picker-item-count">{a.songs.length} songs</span>
                </button>
              ))}
            </div>
            <button className="album-picker-new" onClick={handleCreateNewAlbum}>
              + New Album
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
