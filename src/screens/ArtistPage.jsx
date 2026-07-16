import React, { useEffect, useState } from 'react';
import { searchArtists, getArtistTracks, getArtistAlbums, groupTracksByAlbum } from '../utils/api';
import { formatTime } from '../utils/helpers';

export default function ArtistPage({ query, playSong, currentSong, isPlaying, onBack, showToast }) {
  const [artist, setArtist] = useState(null);
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

    searchArtists(query, 3).then(async (artists) => {
      if (cancelled) return;
      if (artists.length === 0) {
        setLoading(false);
        return;
      }
      const topArtist = artists[0];
      setArtist(topArtist);

      const [tracks, artistAlbums] = await Promise.all([
        getArtistTracks(topArtist.id, 50),
        getArtistAlbums(topArtist.id, 20),
      ]);

      if (cancelled) return;
      setAllTracks(tracks);
      const grouped = groupTracksByAlbum(tracks);
      setAlbums(grouped);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [query]);

  if (loading) return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Finding artist...</p>
    </div>
  );

  if (!artist) return (
    <div className="empty">
      <p style={{ fontSize: 36 }}>🎤</p>
      <h3>No artist found for "{query}"</h3>
      <p>Try searching for a different artist name</p>
      <button className="fs-ringtone-btn" onClick={onBack} style={{ marginTop: 12 }}>← Back to Search</button>
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
        <button className="icon-btn" onClick={onBack} style={{ fontSize: 18, marginBottom: 12 }}>← Back</button>
        <div className="artist-avatar-row">
          {artist.avatarUrl ? (
            <img src={artist.avatarUrl} alt="" className="artist-avatar" />
          ) : (
            <div className="artist-avatar artist-avatar-ph">🎤</div>
          )}
          <div className="artist-meta">
            <span className="artist-badge">Artist</span>
            <h1 className="artist-name">{artist.name}</h1>
            <p className="artist-stats">{artist.trackCount} songs · {artist.followerCount.toLocaleString()} followers</p>
          </div>
        </div>
      </div>

      <div className="artist-controls">
        <button className="player-play-btn" style={{ width: 48, height: 48, fontSize: 20 }}
          onClick={() => {
            if (allTracks.length > 0) {
              playSong(allTracks[0], allTracks, 0);
            }
          }}>
          ▶
        </button>
      </div>

      {albums.length > 0 && (
        <div className="discography-section">
          <div className="discography-header">
            <h2 className="sec-title" style={{ marginBottom: 0 }}>Discography</h2>
            {albums.length > 4 && (
              <button className="icon-btn" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Show all</button>
            )}
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
                <p className="album-meta">{album.year || ''} · Album · {album.tracks.length} songs</p>
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
                <div className="row-acts" />
              </div>
            );
          })}
          {displayTracks.length === 0 && (
            <div className="empty" style={{ padding: 30 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tracks available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
