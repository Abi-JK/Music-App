import React from 'react';
import SongCard from '../components/SongCard';
import { HOME_SECTIONS } from '../utils/constants';

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
      ) : HOME_SECTIONS.every(sec => !homeData[sec.key]?.songs?.length) ? (
        <div className="empty">
          <span style={{ fontSize: 48 }}>🎵</span>
          <h3>No content available</h3>
          <p>Check your connection or try again later.</p>
        </div>
      ) : (
        HOME_SECTIONS.map(sec => {
          const d = homeData[sec.key];
          if (!d?.songs?.length) return null;
          return (
            <div key={sec.key}>
              <div className="sec-head">
                <h3>{sec.label}</h3>
                <button className="see-all" onClick={() => doSearch(sec.term)}>See All</button>
              </div>
              <div className="song-scroll">
                {d.songs.map((song, i) => (
                  <SongCard key={song.id} song={song}
                    isActive={currentSong?.id === song.id} isPlaying={isPlaying}
                    onPlay={() => playSong(song, d.songs, i)}
                    onDetails={setDetailSong}/>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
