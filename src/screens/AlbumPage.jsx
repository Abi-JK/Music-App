import React, { useEffect, useState } from 'react';
import { searchSaavn } from '../utils/api';
import { formatTime } from '../utils/helpers';

export default function AlbumPage({ albumQuery, playSong, currentSong, isPlaying, onBack, showToast, downloadSong, downloadedIds, downloadingIds }) {
  const [songs, setSongs] = useState([]);
  const [albumInfo, setAlbumInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!albumQuery) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const searchResults = await searchSaavn(`${albumQuery} songs`, 50);
        if (cancelled) return;

        if (searchResults.length > 0) {
          const filtered = searchResults.filter(s => {
            const albumName = (s.album || '').toLowerCase();
            const queryLower = albumQuery.toLowerCase();
            return albumName.includes(queryLower) || queryLower.includes(albumName) || s.title.toLowerCase().includes(queryLower);
          });
          const finalSongs = filtered.length > 2 ? filtered : searchResults;

          setAlbumInfo({
            title: finalSongs[0]?.album || albumQuery,
            coverUrl: finalSongs[0]?.coverUrl,
            year: finalSongs[0]?.year,
            artist: finalSongs[0]?.artist,
          });
          setSongs(finalSongs);
        } else {
          setAlbumInfo({ title: albumQuery });
          setSongs([]);
        }
      } catch {
        if (!cancelled) {
          const fallback = await searchSaavn(albumQuery, 20).catch(() => []);
          setSongs(fallback);
          setAlbumInfo({ title: albumQuery });
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [albumQuery]);

  if (loading) return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading "{albumQuery}" album...</p>
    </div>
  );

  if (songs.length === 0) return (
    <div className="empty">
      <p style={{ fontSize: 36 }}>🎵</p>
      <h3>No songs found for "{albumQuery}"</h3>
      <p>Try a different movie or album name</p>
      <button className="fs-ringtone-btn" onClick={onBack} style={{ marginTop: 12 }}>Back</button>
    </div>
  );

  return (
    <div className="artist-page">
      <div className="artist-header">
        <button className="icon-btn" onClick={onBack} style={{ fontSize: 18, marginBottom: 12 }}>← Back</button>
        <div className="artist-avatar-row">
          {albumInfo?.coverUrl ? (
            <img src={albumInfo.coverUrl} alt="" className="artist-avatar" style={{ borderRadius: 12 }} />
          ) : (
            <div className="artist-avatar artist-avatar-ph" style={{ borderRadius: 12 }}>🎵</div>
          )}
          <div className="artist-meta">
            <span className="artist-badge">Album · Movie</span>
            <h1 className="artist-name">{albumInfo?.title || albumQuery}</h1>
            <p className="artist-stats">
              {songs.length} songs
              {albumInfo?.year ? ` · ${albumInfo.year}` : ''}
              {albumInfo?.artist ? ` · ${albumInfo.artist}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="artist-controls">
        <button className="player-play-btn" style={{ width: 48, height: 48, fontSize: 20 }}
          onClick={() => { if (songs.length > 0) playSong(songs[0], songs, 0); }}>
          ▶
        </button>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, marginLeft: 12 }}>Play all</span>
      </div>

      <div className="artist-tracks-section">
        <h3 className="sec-title">All Songs ({songs.length})</h3>
        <div className="song-table">
          <div className="table-head">
            <span>#</span><span>SONG</span><span>ARTIST</span><span>DURATION</span><span></span>
          </div>
          {songs.map((song, i) => {
            const isActive = currentSong?.id === song.id;
            const isDownloaded = downloadedIds?.includes(song.id);
            const isDownloading = downloadingIds?.includes(song.id);
            return (
              <div key={song.id}
                className={`song-row ${isActive ? 'now-playing' : ''}`}
                onClick={() => playSong(song, songs, i)}
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
                <span className="row-album" title={song.artist || ''}>{song.artist || '—'}</span>
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
