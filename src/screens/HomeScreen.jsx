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
    const songs = await searchSaavn(sec.query, 40);
    return { key: sec.key, label: sec.label, songs };
  } catch {
    return { key: sec.key, label: sec.label, songs: [] };
  }
}

export default function HomeScreen({ playSong, currentSong, isPlaying, recentlyPlayed, sharedSongs, downloadSong, downloadedIds, downloadingIds, onOpenArtist, onOpenAlbum }) {
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadCount, setLoadCount] = useState(INITIAL_BATCH);
  const scrollRef = useRef(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const initialSections = HOME_SECTIONS.slice(0, INITIAL_BATCH);
      const BATCH_SIZE = 4;
      const data = {};
      for (let i = 0; i < initialSections.length; i += BATCH_SIZE) {
        const batch = initialSections.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(loadSaavnSection));
        if (cancelled) return;
        results.forEach(r => { data[r.key] = r; });
        setSections({ ...data });
      }
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

  const featuredAlbums = [
    { title: 'Arijit Singh Hits', type: 'Artist', query: 'Arijit Singh', cover: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg' },
    { title: 'Anirudh Masterpieces', type: 'Artist', query: 'Anirudh Ravichander', cover: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_003_20230320095813_500x500.jpg' },
    { title: 'A.R. Rahman Classics', type: 'Artist', query: 'A.R. Rahman', cover: 'https://c.saavncdn.com/artists/A_R_Rahman_002_20210517112028_500x500.jpg' },
    { title: 'MGR Evergreen Hits', type: 'Movie', query: 'M.G. Ramachandran', cover: 'https://c.saavncdn.com/artists/M_G_Ramachandran_500x500.jpg' },
    { title: 'Sivaji Ganesan Tamil Gold', type: 'Movie', query: 'Sivaji Ganesan', cover: 'https://c.saavncdn.com/artists/Sivaji_Ganesan_500x500.jpg' },
    { title: 'Ilaiyaraaja Magical Melodies', type: 'Artist', query: 'Ilaiyaraaja', cover: 'https://c.saavncdn.com/artists/Ilaiyaraaja_002_20230323062635_500x500.jpg' },
    { title: 'Puneeth Rajkumar Hits', type: 'Artist', query: 'Puneeth Rajkumar', cover: 'https://c.saavncdn.com/artists/Puneeth_Rajkumar_500x500.jpg' },
    { title: 'Diljit Dosanjh Punjabi Power', type: 'Artist', query: 'Diljit Dosanjh', cover: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_004_20230318080358_500x500.jpg' },
    { title: 'K.J. Yesudas Evergreen', type: 'Artist', query: 'K.J. Yesudas', cover: 'https://c.saavncdn.com/artists/K_J_Yesudas_500x500.jpg' },
    { title: 'Sonu Nigam Melodies', type: 'Artist', query: 'Sonu Nigam', cover: 'https://c.saavncdn.com/artists/Sonu_Nigam_002_20230323063633_500x500.jpg' },
    { title: 'Lata Mangeshkar Classics', type: 'Artist', query: 'Lata Mangeshkar', cover: 'https://c.saavncdn.com/artists/Lata_Mangeshkar_500x500.jpg' },
    { title: 'Kishore Kumar Evergreen', type: 'Artist', query: 'Kishore Kumar', cover: 'https://c.saavncdn.com/artists/Kishore_Kumar_500x500.jpg' },
  ];

  return (
    <div className="home-screen" ref={scrollRef}>
      <div className="home-hero">
        <h1 className="home-title">SoundAura</h1>
        <p className="home-subtitle">All Indian languages · Full songs · 100% free, no login</p>
      </div>

      <div className="home-section">
        <h3 className="sec-title">Featured Albums & Artists</h3>
        <div className="song-scroll">
          {featuredAlbums.map((alb, i) => (
            <div key={i} className="song-card" onClick={() => onOpenAlbum ? onOpenAlbum(alb.query) : onOpenArtist && onOpenArtist(alb.query)}>
              <img src={alb.cover} alt={alb.title} onError={(e) => { e.target.style.display = 'none'; }} />
              <h4>{alb.title}</h4>
              <p>{alb.type} Album</p>
            </div>
          ))}
        </div>
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

      {sharedSongs && sharedSongs.length > 0 && (
        <div className="home-section">
          <h3 className="sec-title">Community Songs — Added by Users</h3>
          <div className="song-scroll">
            {sharedSongs.slice(0, 20).map(s => {
              const enrichedSong = {
                id: `shared-search-${s.title}-${s.artist}`,
                title: s.title,
                artist: s.artist,
                album: s.album || '',
                genre: s.genre || '',
                coverUrl: s.coverUrl || null,
                audioUrl: null,
                allAudioUrls: [],
                rawAudioUrls: [],
                source: 'shared',
                _sharedQuery: `${s.title} ${s.artist} ${s.album || ''}`,
              };
              return (
                <div key={s.id} className={`song-card ${currentSong?.id === enrichedSong.id ? 'active' : ''}`}
                  onClick={() => playSong(enrichedSong, sharedSongs.map(ss => ({
                    id: `shared-search-${ss.title}-${ss.artist}`,
                    title: ss.title, artist: ss.artist, album: ss.album || '',
                    genre: ss.genre || '', coverUrl: ss.coverUrl || null,
                    audioUrl: null, allAudioUrls: [], rawAudioUrls: [],
                    source: 'shared', _sharedQuery: `${ss.title} ${ss.artist} ${ss.album || ''}`,
                  })), sharedSongs.indexOf(s))}>
                  {s.coverUrl ? <img src={s.coverUrl} alt="" /> : <div className="qph">🎵</div>}
                  <h4>{s.title}</h4>
                  <p>{s.artist}</p>
                </div>
              );
            })}
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
