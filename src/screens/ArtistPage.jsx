import React, { useEffect, useState, useCallback } from 'react';
import { searchArtistSongs, groupTracksByAlbum } from '../utils/api';
import { formatTime } from '../utils/helpers';

const LANG_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Tamil', label: 'Tamil' },
  { key: 'Hindi', label: 'Hindi' },
  { key: 'Kannada', label: 'Kannada' },
  { key: 'Telugu', label: 'Telugu' },
  { key: 'Malayalam', label: 'Malayalam' },
  { key: 'Bengali', label: 'Bengali' },
  { key: 'Punjabi', label: 'Punjabi' },
  { key: 'Marathi', label: 'Marathi' },
];

export default function ArtistPage({ query, playSong, currentSong, isPlaying, onBack, showToast, downloadSong, downloadedIds, downloadingIds, onOpenAlbum }) {
  const [allTracks, setAllTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [langFilter, setLangFilter] = useState('all');
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setLoading(true);
    setSelectedAlbum(null);
    setLangFilter('all');

    searchArtistSongs(query, 500).then(tracks => {
      if (cancelled) return;
      setAllTracks(tracks);
      setAlbums(groupTracksByAlbum(tracks));
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [query]);

  const getLangCounts = useCallback(() => {
    const counts = { all: allTracks.length };
    for (const track of allTracks) {
      const lang = track.genre || 'Unknown';
      counts[lang] = (counts[lang] || 0) + 1;
    }
    return counts;
  }, [allTracks]);

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
      <button className="fs-ringtone-btn" onClick={onBack} style={{ marginTop: 12 }}>Back</button>
    </div>
  );

  const langCounts = getLangCounts();
  const availableLangs = LANG_FILTERS.filter(f => f.key === 'all' || langCounts[f.key]);

  const filteredByLang = langFilter === 'all'
    ? allTracks
    : allTracks.filter(t => (t.genre || 'Unknown') === langFilter);

  const sortedTracks = [...filteredByLang];
  if (sortBy === 'az') sortedTracks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  else if (sortBy === 'duration') sortedTracks.sort((a, b) => (b.duration || 0) - (a.duration || 0));

  const filteredAlbums = langFilter === 'all'
    ? albums
    : albums.filter(a => a.tracks.some(t => (t.genre || 'Unknown') === langFilter));

  const displayTracks = selectedAlbum
    ? (filteredAlbums.find(a => a.id === selectedAlbum)?.tracks || [])
    : sortedTracks;

  return (
    <div className="artist-page">
      <div className="artist-header">
        <button className="icon-btn" onClick={onBack} style={{ fontSize: 18, marginBottom: 12 }}>← Back</button>
        <div className="artist-avatar-row">
          {allTracks[0]?.coverUrl ? (
            <img src={allTracks[0].coverUrl} alt="" className="artist-avatar" />
          ) : (
            <div className="artist-avatar artist-avatar-ph">🎤</div>
          )}
          <div className="artist-meta">
            <span className="artist-badge">Artist</span>
            <h1 className="artist-name">{query}</h1>
            <p className="artist-stats">
              {allTracks.length} songs · {filteredAlbums.length} albums
              {langFilter !== 'all' && ` · ${langFilter}: ${filteredByLang.length}`}
            </p>
          </div>
        </div>
      </div>

      <div className="artist-controls">
        <button className="player-play-btn" style={{ width: 48, height: 48, fontSize: 20 }}
          onClick={() => { if (displayTracks.length > 0) playSong(displayTracks[0], displayTracks, 0); }}>
          ▶
        </button>
        <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
          <button className={`sort-btn ${sortBy === 'default' ? 'active' : ''}`} onClick={() => setSortBy('default')}>Default</button>
          <button className={`sort-btn ${sortBy === 'az' ? 'active' : ''}`} onClick={() => setSortBy('az')}>A-Z</button>
          <button className={`sort-btn ${sortBy === 'duration' ? 'active' : ''}`} onClick={() => setSortBy('duration')}>Duration</button>
        </div>
      </div>

      {availableLangs.length > 2 && (
        <div className="filter-chips" style={{ padding: '0 16px', flexWrap: 'wrap' }}>
          {availableLangs.map(f => (
            <button key={f.key}
              className={`filter-chip ${langFilter === f.key ? 'active' : ''}`}
              onClick={() => { setLangFilter(f.key); setSelectedAlbum(null); }}>
              {f.label} {langCounts[f.key] ? `(${langCounts[f.key]})` : ''}
            </button>
          ))}
        </div>
      )}

      {filteredAlbums.length > 1 && (
        <div className="discography-section">
          <div className="discography-header">
            <h2 className="sec-title" style={{ marginBottom: 0 }}>Discography ({filteredAlbums.length} albums)</h2>
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
          {selectedAlbum
            ? `${filteredAlbums.find(a => a.id === selectedAlbum)?.title || 'Tracks'}`
            : `All Songs (${displayTracks.length})`}
        </h3>
        <div className="song-table">
          <div className="table-head">
            <span>#</span><span>SONG</span><span>ALBUM</span><span>LANG</span><span>DURATION</span><span></span>
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
                <span className="row-lang">{song.genre || '—'}</span>
                <span className="row-dur">{formatTime(song.duration)}</span>
                <div className="row-acts">
                  {downloadSong && (
                    <button
                      className="icon-btn"
                      onClick={(e) => { e.stopPropagation(); if (!isDownloaded && !isDownloading) downloadSong(song); }}
                      title={isDownloaded ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Download'}
                      disabled={isDownloaded || isDownloading}
                      style={{ opacity: isDownloaded ? 0.5 : 1 }}>
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
