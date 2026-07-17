import React, { useEffect, useState } from 'react';
import { searchSongs, searchITunes } from '../utils/api';
import { HOME_SECTIONS } from '../utils/constants';

function SectionRow({ sec, currentSong, isPlaying, playSong }) {
  if (!sec.songs || sec.songs.length === 0) return null;
  return (
    <div className="home-section">
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
  );
}

export default function HomeScreen({ playSong, currentSong, isPlaying, recentlyPlayed }) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const indianSections = HOME_SECTIONS.filter(s =>
      ['hindi', 'tamil', 'telugu', 'malayalam', 'arrahman', 'arijit', 'ilayaraja', 'yesudas'].includes(s.key)
    );
    const otherSections = HOME_SECTIONS.filter(s =>
      !['hindi', 'tamil', 'telugu', 'malayalam', 'arrahman', 'arijit', 'ilayaraja', 'yesudas'].includes(s.key)
    );

    async function loadSection(sec, useITunesOnly) {
      try {
        if (useITunesOnly) {
          const songs = await searchITunes(sec.query, 12);
          return { key: sec.key, label: sec.label, songs };
        }
        const songs = await searchSongs(sec.query, 12);
        return { key: sec.key, label: sec.label, songs };
      } catch {
        return { key: sec.key, label: sec.label, songs: [] };
      }
    }

    (async () => {
      // Load Indian sections via iTunes directly (fast, no Audius dependency)
      const indianResults = await Promise.all(
        indianSections.map(sec => loadSection(sec, true))
      );

      if (cancelled) return;
      const data = {};
      indianResults.forEach(r => { data[r.key] = r; });
      setSections({ ...data });
      setLoading(false);

      // Load remaining sections in background (can use combined search)
      const otherResults = await Promise.all(
        otherSections.map(sec => loadSection(sec, false))
      );

      if (cancelled) return;
      otherResults.forEach(r => { data[r.key] = r; });
      setSections({ ...data });
    })();

    return () => { cancelled = true; };
  }, []);

  const allSections = Object.values(sections).filter(s => s.songs && s.songs.length > 0);

  return (
    <div className="home-screen">
      <div className="home-hero">
        <h1 className="home-title">SoundAura</h1>
        <p className="home-subtitle">Tamil · Hindi · Telugu · Malayalam · English — 100% free, no login, no ads</p>
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
        <div className="spinner-wrap"><div className="spinner" /><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading Indian music...</p></div>
      ) : (
        allSections.map(sec => (
          <SectionRow key={sec.key} sec={sec} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong} />
        ))
      )}
    </div>
  );
}
