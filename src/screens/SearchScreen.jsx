import React from 'react';
import { formatTime } from '../utils/helpers';

export default function SearchScreen({ searchResults, searchLoading, searched, currentSong, isPlaying, playSong, toggleLike, liked, downloadSong, downloadedIds, downloadingIds, onOpenArtist }) {
  if (searchLoading) return (
    <div className="spinner-wrap"><div className="spinner" /><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Searching all languages...</p></div>
  );

  if (!searched) return (
    <div className="empty">
      <div style={{ fontSize: 48 }}>🔍</div>
      <h3>Search songs, movies, artists, albums</h3>
      <p>Type anything to find music in all Indian languages</p>
    </div>
  );

  if (!searchResults.length) return (
    <div className="empty">
      <h3>No results found</h3>
      <p>Try a different query or check your connection</p>
    </div>
  );

  const topArtist = searchResults.length > 0 ? searchResults[0].artist : null;
  const artistCount = topArtist ? searchResults.filter(s => s.artist === topArtist).length : 0;

  const playable = searchResults.filter(s => s.audioUrl);
  const nonPlayable = searchResults.filter(s => !s.audioUrl);

  const playAll = () => {
    const list = playable.length > 0 ? playable : searchResults;
    if (list.length > 0) playSong(list[0], list, 0);
  };

  const shufflePlay = () => {
    const list = playable.length > 0 ? playable : searchResults;
    if (list.length === 0) return;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled, 0);
  };

  return (
    <div className="search-screen">
      {topArtist && artistCount >= 1 && onOpenArtist && (
        <div className="artist-card" onClick={() => onOpenArtist(topArtist)}>
          <div className="artist-card-left">
            {searchResults[0].coverUrl ? (
              <img src={searchResults[0].coverUrl} alt="" className="artist-card-img" />
            ) : (
              <div className="artist-card-img artist-card-ph">🎤</div>
            )}
            <div className="artist-card-info">
              <span className="artist-card-badge">Artist</span>
              <h3>{topArtist}</h3>
              <p>{searchResults.length} songs · Tap to view discography</p>
            </div>
          </div>
          <span className="artist-card-arrow">→</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span className="search-count" style={{ margin: 0 }}>{searchResults.length} songs found</span>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button className="icon-btn" onClick={playAll} title="Play All"
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 20, background: 'var(--accent)', color: '#000', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            ▶ Play All
          </button>
          <button className="icon-btn" onClick={shufflePlay} title="Shuffle Play"
            style={{ fontSize: 13, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'var(--text)', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
            🔀 Shuffle
          </button>
        </div>
      </div>
      <div className="song-table">
        <div className="table-head">
          <span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span>
        </div>
        {searchResults.map((song, i) => {
          const isActive = currentSong?.id === song.id;
          const isLiked = liked ? liked(song.id) : false;
          const isDownloaded = downloadedIds ? downloadedIds.includes(song.id) : false;
          const isDownloading = downloadingIds ? downloadingIds.includes(song.id) : false;
          const noAudio = !song.audioUrl;
          return (
            <div key={song.id} className={`song-row ${isActive ? 'now-playing' : ''} ${noAudio ? 'song-row-disabled' : ''}`}
              onClick={() => { if (!noAudio) playSong(song, searchResults, i); }}
              title={`${song.title} — ${song.artist}${noAudio ? ' (audio unavailable)' : ''}`}>
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
              <span className="row-dur">{song.duration ? formatTime(song.duration) : '—'}</span>
              <div className="row-acts">
                {toggleLike && (
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                    title={isLiked ? 'Unlike' : 'Like'}>
                    {isLiked ? '❤️' : '🤍'}
                  </button>
                )}
                {downloadSong && song.audioUrl && (
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
  );
}
