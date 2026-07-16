import React, { useEffect, useState } from 'react';
import { searchSongs } from '../utils/api';
import { HOME_SECTIONS } from '../utils/constants';

export default function HomeScreen({ playSong, currentSong, isPlaying, recentlyPlayed }) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      HOME_SECTIONS.map(sec =>
        searchSongs(sec.query, 12)
          .then(songs => ({ key: sec.key, label: sec.label, songs }))
          .catch(() => ({ key: sec.key, label: sec.label, songs: [] }))
      )
    ).then(results => {
      if (cancelled) return;
      const data = {};
      results.forEach(r => { data[r.key] = r; });
      setSections(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const gridSections = Object.values(sections).filter(s => s.songs.length > 0).slice(0, 4);
  const scrollSections = Object.values(sections).filter(s => s.songs.length > 0).slice(4);

  return (
    <div className="home-screen">
      <div className="home-hero">
        <h1 className="home-title">SoundAura</h1>
        <p className="home-subtitle">100% free · No login · No ads · Independent artists worldwide</p>
      </div>

      {recentlyPlayed && recentlyPlayed.length > 0 && (
        <div className="home-section">
          <h3 className="sec-title">Recently Played</h3>
          <div className="home-grid">
            {recentlyPlayed.slice(0, 6).map(s => (
              <div key={s.id} className="home-grid-card"
                onClick={() => playSong(s, recentlyPlayed, recentlyPlayed.indexOf(s))}>
                {s.coverUrl ? <img src={s.coverUrl} alt="" /> : <div className="grid-ph">🎵</div>}
                <span>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading playlists...</p></div>
      ) : (
        <>
          {gridSections.map(sec => (
            <div key={sec.key} className="home-section">
              <h3 className="sec-title">{sec.label}</h3>
              <div className="song-scroll">
                {sec.songs.slice(0, 8).map(s => (
                  <div key={s.id} className={`song-card ${currentSong?.id === s.id ? 'active' : ''}`}
                    onClick={() => playSong(s, sec.songs, sec.songs.indexOf(s))}>
                    {s.coverUrl ? <img src={s.coverUrl} alt="" /> : <div className="qph">🎵</div>}
                    <h4>{s.title}</h4>
                    <p>{s.artist}</p>
                    {currentSong?.id === s.id && isPlaying && (
                      <div className="eq"><span /><span /><span /></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {scrollSections.map(sec => (
            <div key={sec.key} className="home-section">
              <h3 className="sec-title">{sec.label}</h3>
              <div className="song-scroll">
                {sec.songs.slice(0, 8).map(s => (
                  <div key={s.id} className={`song-card ${currentSong?.id === s.id ? 'active' : ''}`}
                    onClick={() => playSong(s, sec.songs, sec.songs.indexOf(s))}>
                    {s.coverUrl ? <img src={s.coverUrl} alt="" /> : <div className="qph">🎵</div>}
                    <h4>{s.title}</h4>
                    <p>{s.artist}</p>
                    {currentSong?.id === s.id && isPlaying && (
                      <div className="eq"><span /><span /><span /></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
