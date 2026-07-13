import React from 'react';
import { HOME_PLAYLISTS } from '../utils/constants';

function groupByAlbum(songs) {
  const map = {};
  songs.forEach(s => {
    const key = s.album || 'Other Songs';
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  return Object.entries(map)
    .map(([name, list]) => ({
      name,
      songs: list,
      image: list[0]?.coverUrl || '',
      songCount: list.length,
      year: list.find(s => s.year)?.year || '',
    }))
    .sort((a, b) => b.songCount - a.songCount);
}

export default function HomeView({ recentlyPlayed, currentSong, isPlaying, playSong, homeLoading, homeData, doSearch, setDetailSong }) {
  return (
    <>
      {recentlyPlayed.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="sec-title">Recently Played</div>
          <div className="quick-grid">
            {recentlyPlayed.map((song, i) => {
              const isA = currentSong?.id === song.id;
              return (
                <div key={song.id} className={`quick-card ${isA ? 'now-playing' : ''}`}
                  onClick={() => playSong(song, recentlyPlayed, i)}>
                  {song.coverUrl ? <img src={song.coverUrl} alt=""/> : <div className="qph">🎵</div>}
                  <span className="quick-card-name" style={{ color: isA ? 'var(--accent)' : undefined }}>{song.title}</span>
                  <button className="qplay-btn" onClick={e => { e.stopPropagation(); playSong(song, recentlyPlayed, i); }}>
                    {isA && isPlaying
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="black"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {homeLoading ? (
        <div className="spinner-wrap">
          <div className="spinner"/>
          <p style={{ color: 'var(--text-muted)' }}>Loading music feed...</p>
        </div>
      ) : (
        HOME_PLAYLISTS.map(sec => {
          const d = homeData[sec.key];
          if (!d?.songs?.length) return null;
          const albums = groupByAlbum(d.songs);
          return (
            <div key={sec.key} style={{ marginBottom: 28 }}>
              <div className="sec-head">
                <h3>{sec.label}</h3>
                <button className="see-all" onClick={() => doSearch(sec.label.replace(/[^\w\s]/g, '').trim())}>See All</button>
              </div>
              <div className="album-card-grid">
                {albums.slice(0, 10).map(album => (
                  <div key={album.name} className="album-card"
                    onClick={() => doSearch(album.name)}>
                    <div className="album-card-img-wrap">
                      {album.image
                        ? <img src={album.image} alt={album.name} loading="lazy"/>
                        : <div className="album-card-ph">🎵</div>}
                    </div>
                    <div className="album-card-info">
                      <h4>{album.name}</h4>
                      <p>{album.songCount} songs{album.year ? ` • ${album.year}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
