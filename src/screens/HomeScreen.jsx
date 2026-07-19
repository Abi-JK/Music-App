import React, { useEffect, useState, useRef, useCallback } from 'react';
import { searchSaavn } from '../utils/api';
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

const INITIAL_BATCH = 12;
const LOAD_MORE_BATCH = 8;

async function loadSaavnSection(sec) {
  try {
    const songs = await searchSaavn(sec.query, 10);
    return { key: sec.key, label: sec.label, songs };
  } catch {
    return { key: sec.key, label: sec.label, songs: [] };
  }
}

export default function HomeScreen({ playSong, currentSong, isPlaying, recentlyPlayed, downloadSong, downloadedIds, downloadingIds }) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadCount, setLoadCount] = useState(INITIAL_BATCH);
  const scrollRef = useRef(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const initialSections = HOME_SECTIONS.slice(0, INITIAL_BATCH);
      const results = await Promise.all(initialSections.map(loadSaavnSection));

      if (cancelled) return;
      const data = {};
      results.forEach(r => { data[r.key] = r; });
      setSections({ ...data });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  const loadMoreSections = useCallback(async () => {
    if (loadingMoreRef.current) return;
    if (loadCount >= HOME_SECTIONS.length) return;

    loadingMoreRef.current = true;
    const nextBatch = HOME_SECTIONS.slice(loadCount, loadCount + LOAD_MORE_BATCH);
    const results = await Promise.all(nextBatch.map(loadSaavnSection));

    setSections(prev => {
      const data = { ...prev };
      results.forEach(r => { data[r.key] = r; });
      return data;
    });
    setLoadCount(prev => prev + LOAD_MORE_BATCH);
    loadingMoreRef.current = false;
  }, [loadCount]);

  useEffect(() => {
    const scrollEl = scrollRef.current?.closest('.main-scroll');
    if (!scrollEl) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollHeight - scrollTop - clientHeight < 400) {
        loadMoreSections();
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [loadMoreSections]);

  const allSections = Object.values(sections).filter(s => s.songs && s.songs.length > 0);
  const moreAvailable = loadCount < HOME_SECTIONS.length;

  return (
    <div className="home-screen" ref={scrollRef}>
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
        <>
          {allSections.map(sec => (
            <SectionRow key={sec.key} sec={sec} currentSong={currentSong} isPlaying={isPlaying} playSong={playSong}
              downloadSong={downloadSong} downloadedIds={downloadedIds} downloadingIds={downloadingIds} />
          ))}
          {moreAvailable && (
            <div className="spinner-wrap" style={{ padding: '20px 0' }}>
              <div className="spinner" />
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading more categories...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
