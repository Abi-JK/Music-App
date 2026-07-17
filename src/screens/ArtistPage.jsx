import React, { useEffect, useState } from 'react';
import { searchArtistSongs, groupTracksByAlbum } from '../utils/api';
import { formatTime } from '../utils/helpers';

export default function ArtistPage({ query, playSong, currentSong, isPlaying, onBack, showToast, downloadSong, downloadedIds, downloadingIds }) {
  const [albums, setAlbums] = useState([]);
  const [allTracks, setAllTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setSelectedAlbum(null);

    searchArtistSongs(query, 50).then(tracks => {
      if (cancelled) return;
      setAllTracks(tracks);
      setAlbums(groupTracksByAlbum(tracks));
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [query]);

  if (loading) return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Finding songs by {query}...</p>
    </div>
  );

  if (allTracks.length === 0) return (
    <div className="empty">
      <p style={{ fontSize: 36 }}>🎤</p>
      <h3>No songs found for "{query}"</h3>
      <p>Try searching for a different artist name</p>
      <button className="fs-ringtone-btn" onClick={onBack} style={{ marginTop: 12 }}>Back to Search</button>
    </div>
  );

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'singles', label: 'Singles' },
    { key: 'albums', label: 'Albums' },
  ];

  const filteredAlbums = activeFilter === 'all' ? albums
    : activeFilter === 'singles' ? albums.filter(a => a.tracks.length <= 3)
    : albums.filter(a => a.tracks.length > 3);

  const displayTracks = selectedAlbum
    ? albums.find(a => a.id === selectedAlbum)?.tracks || []
    : allTracks;

  return (
    <div className="artist-page">
      <div className="artist-header">
        <button className="icon-btn" onClick={onBack} style={{ fontSize: 18, marginBottom: 12 }}>Back</button>
        <div className="artist-avatar-row">
          {allTracks[0]?.coverUrl ? (
            <img src={allTracks[0].coverUrl} alt="" className="artist-avatar" />
          ) : (
            <div className="artist-avatar artist-avatar-ph">🎤</div>
          )}
          <div className="artist-meta">
            <span className="artist-badge">Artist</span>
            <h1 className="artist-name">{query}</h1>
            <p className="artist-stats">{allTracks.length} songs · {albums.length} albums</p>
          </div>
        </div>
      </div>

      <div className="artist-controls">
        <button className="player-play-btn" style={{ width: 48, height: 48, fontSize: 20 }}
          onClick={() => { if (allTracks.length > 0) playSong(allTracks[0], allTracks, 0); }}>
          ▶
        </button>
      </div>

      {albums.length > 1 && (
        <div className="discography-section">
          <div className="discography-header">
            <h2 className="sec-title" style={{ marginBottom: 0 }}>Discography</h2>
          </div>
          <div className="filter-chips">
            {filters.map(f => (
              <button key={f.key}
                className={`filter-chip ${activeFilter === f.key ? 'active' : ''}`}
                onClick={() => { setActiveFilter(f.key); setSelectedAlbum(null); }}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="album-scroll">
            {filteredAlbums.map(album => (
              <div key={album.id}
                className={`album-card ${selectedAlbum === album.id ? 'active' : ''}`}
                onClick={() => setSelectedAlbum(selectedAlbum === album.id ? null : album.id)}>
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt="" className="album-cover" />
                ) : (
                  <div className="album-cover album-ph">🎵</div>
                )}
                <h4 className="album-title">{album.title}</h4>
                <p className="album-meta">{album.year || ''} · {album.tracks.length} songs</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="artist-tracks-section">
        <h3 className="sec-title">
          {selectedAlbum ? `${albums.find(a => a.id === selectedAlbum)?.title || 'Tracks'}` : `All Songs (${allTracks.length})`}
        </h3>
        <div className="song-table">
          <div className="table-head">
            <span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span>
          </div>
          {displayTracks.map((song, i) => {
            const isActive = currentSong?.id === song.id;
            const isDownloaded = downloadedIds?.includes(song.id);
            const isDownloading = downloadingIds?.includes(song.id);
            return (
              <div key={song.id}
                className={`song-row ${isActive ? 'now-playing' : ''}`}
                onClick={() => playSong(song, displayTracks, i)}
                title={`${song.title} — ${song.artist}`}>
                <span className="row-num">
                  {isActive && isPlaying ? <div className="eq"><span /><span /><span /></div> : i + 1}
                </span>
                <div className="row-info">
                  {song.coverUrl ? <img src={song.coverUrl} alt="" /> : <div className="r-ph">🎵</div>}
                  <div className="row-text">
                    <h4 title={song.title}>{song.title}</h4>
                    <p title={song.artist}>{song.artist}</p>
                  </div>
                </div>
                <span className="row-album" title={song.album || ''}>{song.album || '—'}</span>
                <span className="row-dur">{formatTime(song.duration)}</span>
                <div className="row-acts">
                  {downloadSong && (
                    <button
                      className="icon-btn"
                      onClick={(e) => { e.stopPropagation(); if (!isDownloaded && !isDownloading) downloadSong(song); }}
                      title={isDownloaded ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Download for offline'}
                      disabled={isDownloaded || isDownloading}
                      style={{ opacity: isDownloaded ? 0.5 : 1 }}
                    >
                      {isDownloaded ? '✅' : isDownloading ? '⏳' : '📥'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
