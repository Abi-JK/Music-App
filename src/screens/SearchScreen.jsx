import React from 'react';
import { formatTime } from '../utils/helpers';

export default function SearchScreen({ 
  searchResults, 
  searchLoading, 
  searched, 
  currentSong, 
  isPlaying, 
  playSong, 
  toggleLike, 
  liked,
  downloadSong,
  downloadedIds = [],
  downloadingIds = []
}) {
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

  return (
    <div className="search-screen">
      <div className="search-count">{searchResults.length} songs found</div>
      <div className="song-table">
        <div className="table-head">
          <span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span>
        </div>
        {searchResults.map((song, i) => {
          const isActive = currentSong?.id === song.id;
          const isLiked = liked ? liked(song.id) : false;
          const isDownloaded = downloadedIds.includes(song.id);
          const isDownloading = downloadingIds.includes(song.id);
          return (
            <div key={song.id} className={`song-row ${isActive ? 'now-playing' : ''}`}
              onClick={() => playSong(song, searchResults, i)}>
              <span className="row-num">
                {isActive && isPlaying ? <div className="eq"><span /><span /><span /></div> : i + 1}
              </span>
              <div className="row-info">
                {song.coverUrl ? <img src={song.coverUrl} alt="" /> : <div className="r-ph">🎵</div>}
                <div className="row-text">
                  <h4>{song.title}</h4>
                  <p>{song.artist}</p>
                </div>
              </div>
              <span className="row-album">{song.album || '—'}</span>
              <span className="row-dur">{formatTime(song.duration)}</span>
              <div className="row-acts">
                {downloadSong && (
                  <button 
                    className="icon-btn" 
                    onClick={(e) => { e.stopPropagation(); downloadSong(song); }}
                    disabled={isDownloading || isDownloaded}
                    title={isDownloaded ? "Downloaded" : isDownloading ? "Downloading..." : "Download"}
                  >
                    {isDownloaded ? '✅' : isDownloading ? '⏳' : '⬇️'}
                  </button>
                )}
                {toggleLike && (
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleLike(song); }}>
                    {isLiked ? '❤️' : '🤍'}
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
