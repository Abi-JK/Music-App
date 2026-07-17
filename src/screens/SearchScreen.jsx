import React from 'react';
import { formatTime } from '../utils/helpers';

export default function SearchScreen({ searchResults, searchLoading, searched, currentSong, isPlaying, playSong, toggleLike, liked, downloadSong, downloadedIds, downloadingIds, onOpenArtist }) {
  if (searchLoading) return (
    <div className="spinner-wrap"><div className="spinner" /><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Searching...</p></div>
  );

  if (!searched) return (
    <div className="empty">
      <div style={{ fontSize: 48 }}>🔍</div>
      <h3>Search songs, movies, artists</h3>
      <p>Type anything to find music in all languages</p>
    </div>
  );

  if (!searchResults.length) return (
    <div className="empty">
      <h3>No results found</h3>
      <p>Try a different query</p>
    </div>
  );

  const topArtist = searchResults.length > 0 ? searchResults[0].artist : null;
  const artistCount = searchResults.filter(s => s.artist === topArtist).length;

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
      <div className="search-count">{searchResults.length} songs found</div>
      <div className="song-table">
        <div className="table-head">
          <span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span>
        </div>
        {searchResults.map((song, i) => {
          const isActive = currentSong?.id === song.id;
          const isLiked = liked ? liked(song.id) : false;
          const isDownloaded = downloadedIds ? downloadedIds.includes(song.id) : false;
          const isDownloading = downloadingIds ? downloadingIds.includes(song.id) : false;
          return (
            <div key={song.id} className={`song-row ${isActive ? 'now-playing' : ''}`}
              onClick={() => playSong(song, searchResults, i)}
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
                {song.source === 'itunes' && (
                  <span style={{ fontSize: 10, color: '#ff9500', marginRight: 4, flexShrink: 0 }} title="30-second preview">30s</span>
                )}
                {song.source === 'saavn' && song.duration > 120 && (
                  <span style={{ fontSize: 10, color: 'var(--accent)', marginRight: 4, flexShrink: 0 }} title="Full song from JioSaavn">FULL</span>
                )}
                {toggleLike && (
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                    title={isLiked ? 'Unlike' : 'Like'}>
                    {isLiked ? '❤️' : '🤍'}
                  </button>
                )}
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
  );
}
