import React, { useEffect, useState } from 'react';
import { searchSongs, searchSaavn } from '../utils/api';
import { HOME_SECTIONS } from '../utils/constants';

function SectionRow({ sec, currentSong, isPlaying, playSong, downloadSong, downloadedIds, downloadingIds }) {
  if (!sec.songs || sec.songs.length === 0) return null;
  return (
    <div className="home-section">
      <h3 className="sec-title">{sec.label}</h3>
      <div className="song-scroll">
        {sec.songs.slice(0, 8).map(s => {
          const isDownloaded = downloadedIds?.includes(s.id);
          const isDownloading = downloadingIds?.includes(s.id);
          return (
            <div key={s.id} className={`song-card ${currentSong?.id === s.id ? 'active' : ''}`}
              onClick={() => playSong(s, sec.songs, sec.songs.indexOf(s))}>
              {s.coverUrl ? <img src={s.coverUrl} alt="" /> : <div className="qph">🎵</div>}
              <h4>{s.title}</h4>
              <p>{s.artist}</p>
              {currentSong?.id === s.id && isPlaying && (
                <div className="eq"><span /><span /><span /></div>
              )}
              {downloadSong && (
                <button
                  className="song-card-dl"
                  onClick={(e) => { e.stopPropagation(); if (!isDownloaded && !isDownloading) downloadSong(s); }}
                  title={isDownloaded ? 'Downloaded' : isDownloading ? 'Downloading...' : 'Download'}
                  disabled={isDownloaded || isDownloading}
                >
                  {isDownloaded ? '✅' : isDownloading ? '⏳' : '📥'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function loadSaavnSection(sec) {
  try {
    const songs = await searchSaavn(sec.query, 10);
    return { key: sec.key, label: sec.label, songs };
  } catch {
    return { key: sec.key, label: sec.label, songs: [] };
  }
}

async function loadOtherSection(sec) {
  try {
    const songs = await searchSongs(sec.query, 10);
    return { key: sec.key, label: sec.label, songs };
  } catch {
    return { key: sec.key, label: sec.label, songs: [] };
  }
}

export default function HomeScreen({ playSong, currentSong, isPlaying, recentlyPlayed, downloadSong, downloadedIds, downloadingIds }) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const indianKeys = ['hindi', 'tamil', 'telugu', 'malayalam', 'arrahman', 'arijit', 'ilayaraja', 'yesudas', 'msv', 'kannadasan', 'spb', 'tamilold', 'sadha'];
    const indianSections = HOME_SECTIONS.filter(s => indianKeys.includes(s.key));
    const otherSections = HOME_SECTIONS.filter(s => !indianKeys.includes(s.key));

    (async () => {
      const indianResults = await Promise.all(indianSections.map(loadSaavnSection));

      if (cancelled) return;
      const data = {};
      indianResults.forEach(r => { data[r.key] = r; });
      setSections({ ...data });
      setLoading(false);

      const otherResults = await Promise.all(otherSections.map(loadOtherSection));

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
        <p className="home-subtitle">All Indian languages · Full songs · 100% free, no login</p>
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
        <div className="spinner-wrap"><div className="spinner" /><p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading full songs...</p></div>
      ) : (
        allSections.map(sec => (
          <SectionRow key={sec.key} sec={sec} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong}
            downloadSong={downloadSong} downloadedIds={downloadedIds} downloadingIds={downloadingIds} />
        ))
      )}
    </div>
  );
}
