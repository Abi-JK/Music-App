import React, { useState, useCallback, useRef, useEffect } from 'react';
import './index.css';

import ErrorBoundary from './components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PlayerBar from './components/PlayerBar';
import MiniPlayer from './components/MiniPlayer';
import MobileNav from './components/MobileNav';
import Toast from './components/Toast';
import InstallBanner from './components/InstallBanner';
import FullScreenPlayer from './components/FullScreenPlayer';
import LyricsPanel from './components/LyricsPanel';
import QueuePanel from './components/QueuePanel';

import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import LikedScreen from './screens/LikedScreen';
import DownloadsScreen from './screens/DownloadsScreen';
import MySongsScreen from './screens/MySongsScreen';
import ArtistPage from './screens/ArtistPage';
import AlbumPage from './screens/AlbumPage';

import { searchSongs, downloadAudioBlob, searchSaavn } from './utils/api';
import { Storage } from './utils/storage';
import { LANG_QUERIES, LANG_SEARCH_QUERIES } from './utils/constants';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQ, setSearchQ] = useState('');
  const [activeLang, setActiveLang] = useState('All');
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [likedSongs, setLikedSongs] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [customSongs, setCustomSongs] = useState([]);
  const [downloadingIds, setDownloadingIds] = useState([]);

  const [audioState, setAudioState] = useState({ curTime: 0, dur: 0 });
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  // Ref to store a timer for auto‑play when the app loses focus
  const autoPlayTimerRef = useRef(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [artistQuery, setArtistQuery] = useState(null);
  const [albumQuery, setAlbumQuery] = useState(null);

  const [repeatMode, setRepeatMode] = useState('off');
  const [shuffleOn, setShuffleOn] = useState(false);
  const originalPlaylistRef = useRef([]);
  const shuffleRef = useRef(false);
  const autoPlayGenreRef = useRef(null);
  const wakeLockRef = useRef(null);
  const isPlayingRef = useRef(false);
  const playedSongIds = useRef(new Set());
  const recentAutoPlay = useRef([]);

  const currentSong = playlist[currentIndex] || null;

  const playNextRef = useRef(null);
  const autoPlayGenreFuncRef = useRef(null);

  useEffect(() => { shuffleRef.current = shuffleOn; }, [shuffleOn]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => {
    if (!isPlaying && autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, [isPlaying]);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
      } catch {}
    }
  }, []);

  const reacquireWakeLock = useCallback(async () => {
    if (wakeLockRef.current === null && 'wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => { wakeLockRef.current = null; });
      } catch {}
    }
  }, []);

  useEffect(() => {
    Storage.requestPersistence().catch(console.error);
    const loadData = async () => {
      try {
        await Storage.migrateIfNeeded();
        const [liked, recent, downloaded, custom] = await Promise.all([
          Storage.getLikedSongs(),
          Storage.getRecentlyPlayed(),
          Storage.getDownloadedSongs(),
          Storage.getCustomSongs(),
        ]);
        setLikedSongs(liked);
        setRecentlyPlayed(recent);
        setDownloadedSongs(downloaded);
        setCustomSongs(custom);
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
      }
    };
    loadData();
    if (window.__installPrompt) setDeferredPrompt(window.__installPrompt);
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);

    const resumeAudio = () => {
      const a = document.getElementById('main-audio');
      if (a && a.paused && a.src && !a.ended && a.currentTime > 0 && isPlayingRef.current) {
        a.play().then(() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }).catch(() => {});
      }
      reacquireWakeLock();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        resumeAudio();
        setTimeout(resumeAudio, 300);
        setTimeout(resumeAudio, 1000);
        setTimeout(resumeAudio, 3000);
      }
    };
    const handlePageShow = (e) => {
    // Keep existing logic for restoring playback on page show
    if (e.persisted) {
      resumeAudio();
      setTimeout(resumeAudio, 300);
      setTimeout(resumeAudio, 1000);
    }
    // Cancel any pending auto‑play since user returned
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  };
  
    const handleFocus = () => {
      resumeAudio();
      setTimeout(resumeAudio, 300);
      setTimeout(resumeAudio, 1000);
      // Cancel pending auto‑play on focus
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        const a = document.getElementById('main-audio');
        if (a && a.src) {
          a.play().then(() => {
            setIsPlaying(true);
            navigator.mediaSession.playbackState = 'playing';
          }).catch(() => {});
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        const a = document.getElementById('main-audio');
        if (a && !a.paused) {
          a.pause();
          setIsPlaying(false);
          navigator.mediaSession.playbackState = 'paused';
        }
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        const a = document.getElementById('main-audio');
        if (a) {
          a.pause();
          a.currentTime = 0;
          setIsPlaying(false);
          navigator.mediaSession.playbackState = 'none';
        }
      });
    }

    const heartbeat = setInterval(() => {
      const a = document.getElementById('main-audio');
      if (a && a.paused && a.src && !a.ended && a.currentTime > 0 && isPlayingRef.current) {
        a.play().then(() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }).catch(() => {});
      }
      if (a && !a.paused && isPlayingRef.current) {
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      }
      reacquireWakeLock();
    }, 3000);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeinstallprompt', handler);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, [reacquireWakeLock]);

  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [isPlaying, requestWakeLock]);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      showToast('To install: Open browser menu (⋮) → "Install app" or "Add to Home screen". This gives background playback + keeps your data safe.');
    }
  };

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3500);
  }, []);

  const addRecent = useCallback(async (song) => {
    const slim = { ...song };
    delete slim.audioBlob;
    setRecentlyPlayed(prev => {
      const next = [slim, ...prev.filter(s => s.id !== slim.id)].slice(0, 12);
      Storage.addRecentlyPlayed(slim).catch(console.error);
      return next;
    });
  }, []);

  const playSong = useCallback((song, context, contextIdx) => {
    if (!song) return;
    const ctx = context || [song];
    originalPlaylistRef.current = ctx;
    autoPlayGenreRef.current = song.genre || song.language || (song.artist ? `${song.artist}` : 'trending india');
    playedSongIds.current = new Set();
    recentAutoPlay.current = [];
    if (shuffleRef.current) {
      const shuffled = shuffleArray(ctx);
      const idx = shuffled.findIndex(s => s.id === song.id);
      setPlaylist(shuffled);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      setPlaylist(ctx);
      const idx = contextIdx != null ? contextIdx : ctx.findIndex(s => s.id === song.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    }
    setIsPlaying(true);
    addRecent(song);
  }, [addRecent]);

  const autoPlayGenre = useCallback(async (genre) => {
    if (!genre) return;
    try {
      const playedIds = playedSongIds.current;
      const lastId = currentSong?.id;
      const playlistIds = new Set(playlist.map(p => p.id));

      const year = new Date().getFullYear();
      const searchTerms = [
        genre,
        `${genre} songs`,
        `${genre} hits`,
        `${genre} album`,
        `${genre} ${year}`,
        `${genre} ${year - 1}`,
        `${genre} best`,
        `${genre} latest`,
        `${genre} popular`,
        `${genre} evergreen`,
      ];
      const allResults = await Promise.all(searchTerms.map(t => searchSaavn(t, 25).catch(() => [])));
      let moreSongs = allResults.flat();
      moreSongs = [...new Map(moreSongs.map(s => [s.id, s])).values()];

      if (moreSongs.length > 0) {
        const filtered = moreSongs.filter(s => !playlistIds.has(s.id) && !playedIds.has(s.id) && s.id !== lastId);
        const filteredNoPlayed = moreSongs.filter(s => !playedIds.has(s.id) && s.id !== lastId);
        const toUse = filtered.length > 0 ? filtered : filteredNoPlayed;
        if (toUse.length > 0) {
          const shuffled = shuffleArray(toUse);
          originalPlaylistRef.current = shuffled;
          setPlaylist(shuffled);
          setCurrentIndex(0);
          setIsPlaying(true);
          if (shuffled[0]) playedSongIds.current.add(shuffled[0].id);
          showToast(`Playing more ${genre} songs...`);
          return;
        }
      }

      const fallbackTerms = ['trending india', 'bollywood hits', 'tamil hits', 'telugu hits', 'hindi songs'];
      const fallback = await Promise.all(fallbackTerms.map(t => searchSaavn(t, 10).catch(() => [])));
      const allFallback = [...new Map(fallback.flat().map(s => [s.id, s])).values()];
      const fresh = allFallback.filter(s => !playedIds.has(s.id) && s.id !== lastId);
      const toUse = fresh.length > 0 ? fresh : allFallback.filter(s => s.id !== lastId);
      if (toUse.length > 0) {
        const shuffled = shuffleArray(toUse);
        originalPlaylistRef.current = shuffled;
        setPlaylist(shuffled);
        setCurrentIndex(0);
        setIsPlaying(true);
        if (shuffled[0]) playedSongIds.current.add(shuffled[0].id);
        showToast('Playing trending songs...');
      } else {
        showToast('No more songs found.');
      }
    } catch {
      showToast('Could not load more songs.');
    }
  }, [playlist, showToast, currentSong]);

  useEffect(() => { autoPlayGenreFuncRef.current = autoPlayGenre; }, [autoPlayGenre]);

  const playNext = useCallback(() => {
    if (!playlist.length) return;
    if (repeatMode === 'one') {
      const audioEl = document.getElementById('main-audio');
      if (audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); }
      return;
    }
    if (currentSong) playedSongIds.current.add(currentSong.id);
    const nextIdx = currentIndex + 1;
    if (nextIdx >= playlist.length) {
      if (repeatMode === 'all') {
        const unplayed = playlist.filter(s => !playedSongIds.current.has(s.id) && s.id !== currentSong?.id);
        if (unplayed.length > 0) {
          const pick = unplayed[Math.floor(Math.random() * unplayed.length)];
          const pickIdx = playlist.findIndex(s => s.id === pick.id);
          setCurrentIndex(pickIdx >= 0 ? pickIdx : 0);
          setIsPlaying(true);
          if (pick) addRecent(pick);
        } else {
          autoPlayGenre(autoPlayGenreRef.current || 'trending india');
        }
      } else {
        autoPlayGenre(autoPlayGenreRef.current || 'trending india');
      }
      return;
    }
    setCurrentIndex(nextIdx);
    setIsPlaying(true);
    if (playlist[nextIdx]) addRecent(playlist[nextIdx]);
  }, [playlist, currentIndex, addRecent, repeatMode, autoPlayGenre, currentSong]);

  useEffect(() => { playNextRef.current = playNext; }, [playNext]);

  const playPrev = useCallback(() => {
    if (!playlist.length) return;
    if (audioState.curTime > 3) {
      const audioEl = document.getElementById('main-audio');
      if (audioEl) { audioEl.currentTime = 0; }
      return;
    }
    let prev = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prev);
    setIsPlaying(true);
    if (playlist[prev]) addRecent(playlist[prev]);
  }, [playlist, currentIndex, addRecent, audioState.curTime]);

  const toggleShuffle = useCallback(() => {
    setShuffleOn(prev => {
      const next = !prev;
      shuffleRef.current = next;
      if (next && playlist.length > 0) {
        const current = playlist[currentIndex];
        const shuffled = shuffleArray(playlist);
        const idx = shuffled.findIndex(s => s.id === current.id);
        setPlaylist(shuffled);
        setCurrentIndex(idx >= 0 ? idx : 0);
      } else if (!next && originalPlaylistRef.current.length > 0) {
        const current = playlist[currentIndex];
        const idx = originalPlaylistRef.current.findIndex(s => s.id === current.id);
        setPlaylist(originalPlaylistRef.current);
        setCurrentIndex(idx >= 0 ? idx : 0);
      }
      return next;
    });
  }, [playlist, currentIndex]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const isLiked = useCallback((id) => likedSongs.some(s => s.id === id), [likedSongs]);
  const toggleLike = useCallback(async (song) => {
    const slim = { ...song };
    delete slim.audioBlob;
    setLikedSongs(prev => {
      const already = prev.some(s => s.id === slim.id);
      const next = already ? prev.filter(s => s.id !== slim.id) : [...prev, slim];
      if (already) Storage.removeLikedSong(slim.id).catch(console.error);
      else Storage.addLikedSong(slim).catch(console.error);
      showToast(already ? 'Removed from Liked Songs' : 'Added to Liked Songs');
      return next;
    });
  }, [showToast]);

  const doSearch = useCallback(async (override) => {
    const q = (typeof override === 'string' ? override : searchQ).trim();
    if (!q) return;
    setSearchQ(q);
    setActiveTab('search');
    setSearched(true);
    setSearchLoading(true);
    setArtistQuery(null);
    try {
      const langObj = LANG_QUERIES.find(l => l.label === activeLang);
      const term = langObj?.term && langObj.label !== 'All' ? `${q} ${langObj.term}` : q;
      const songs = await searchSongs(term, 50);
      setSearchResults(songs);
    } catch {
      showToast('Search failed. Check your connection.');
    }
    setSearchLoading(false);
  }, [searchQ, activeLang, showToast]);

  const handleLangChip = useCallback((lang) => {
    setActiveLang(lang);
    if (lang === 'All') { setActiveTab('home'); return; }
    setActiveTab('search');
    setSearched(true);
    setSearchLoading(true);
    const queries = LANG_SEARCH_QUERIES[lang];
    const searchTerms = queries ? queries.slice(0, 8) : [`${lang} songs`];
    Promise.all(searchTerms.map(t => searchSongs(t, 20).catch(() => [])))
      .then(results => {
        const all = results.flat();
        const unique = [...new Map(all.map(s => [s.id, s])).values()];
        setSearchResults(unique);
      })
      .catch(() => showToast('Could not load.'))
      .finally(() => setSearchLoading(false));
  }, [showToast]);

  const searchByQuery = useCallback(async (term) => {
    const q = (typeof term === 'string' ? term : '').trim();
    if (!q) return;
    setSearchQ(q);
    setActiveTab('search');
    setSearched(true);
    setSearchLoading(true);
    setActiveLang('All');
    try {
      const songs = await searchSongs(q, 80);
      setSearchResults(songs);
      // Do NOT update playlist — only update on explicit song click
      if (!songs.length) showToast('No results found.');
    } catch {
      showToast('Search failed. Check your connection.');
    }
    setSearchLoading(false);
  }, [showToast]);

  const downloadSong = useCallback(async (song) => {
    if (downloadedSongs.some(s => s.id === song.id)) {
      showToast('Song already downloaded.');
      return;
    }
    setDownloadingIds(prev => [...prev, song.id]);
    showToast(`Downloading "${song.title}"...`);
    try {
      const blob = await downloadAudioBlob(song.audioUrl, song.rawAudioUrls || []);
      if (!blob) throw new Error('Failed to download audio blob');
      const songWithBlob = { ...song, audioBlob: blob, downloadedAt: new Date().toISOString() };
      await Storage.addDownloadedSong(songWithBlob);
      setDownloadedSongs(prev => [...prev, songWithBlob]);
      showToast(`"${song.title}" downloaded offline!`);
    } catch (err) {
      console.error(err);
      showToast(`Failed to download "${song.title}".`);
    } finally {
      setDownloadingIds(prev => prev.filter(id => id !== song.id));
    }
  }, [downloadedSongs, showToast]);

  const saveToMySongs = useCallback(async (song) => {
    if (!song) return;
    if (song.source === 'custom' || song._customFile) {
      showToast('This song is already in My Songs');
      return;
    }
    showToast(`Saving "${song.title}" to My Songs...`);
    try {
      let blob = song.audioBlob || null;
      if (!blob) {
        blob = await downloadAudioBlob(song.audioUrl, song.rawAudioUrls || []);
      }
      if (!blob) throw new Error('Could not download audio');
      const customSong = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: song.title,
        artist: song.artist,
        album: song.album || 'My Songs',
        year: song.year || '',
        duration: song.duration || 0,
        coverUrl: song.coverUrl,
        audioUrl: null,
        allAudioUrls: [],
        rawAudioUrls: [],
        genre: song.genre || '',
        source: 'custom',
        downloadable: true,
        _customFile: true,
        addedAt: new Date().toISOString(),
      };
      await Storage.addCustomSong(customSong, blob);
      setCustomSongs(prev => [...prev, customSong]);
      showToast(`"${song.title}" saved to My Songs — won't be lost!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to save song');
    }
  }, [showToast]);

  const removeDownload = useCallback(async (songId) => {
    try {
      await Storage.removeDownloadedSong(songId);
      setDownloadedSongs(prev => prev.filter(s => s.id !== songId));
      showToast('Song removed from offline downloads.');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove download.');
    }
  }, [showToast]);

  const openFullScreen = useCallback(() => { if (currentSong) setShowFullScreen(true); }, [currentSong]);
  const closeFullScreen = useCallback(() => setShowFullScreen(false), []);
  const openArtistPage = useCallback((name) => { setArtistQuery(name); setAlbumQuery(null); setActiveTab('search'); }, []);
  const closeArtistPage = useCallback(() => { setArtistQuery(null); }, []);
  const openAlbumPage = useCallback((title) => { setAlbumQuery(title); setArtistQuery(null); setActiveTab('search'); }, []);
  const closeAlbumPage = useCallback(() => { setAlbumQuery(null); }, []);

  const downloadedIds = downloadedSongs.map(s => s.id);

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} likedCount={likedSongs.length} customCount={customSongs.length} onSearch={searchByQuery} onInstall={handleInstallApp} showToast={showToast} />
      <div className="body">
        <Topbar
          q={searchQ} setQ={setSearchQ}
          activeLang={activeLang} setLang={handleLangChip}
          onSearch={(q) => doSearch(q)}
        />
        <div className="main-scroll">
          <InstallBanner />
          {activeTab === 'home' && (
            <HomeScreen
              playSong={playSong}
              currentSong={currentSong}
              isPlaying={isPlaying}
              recentlyPlayed={recentlyPlayed}
              downloadSong={downloadSong}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
              onOpenArtist={openArtistPage}
              onOpenAlbum={openAlbumPage}
            />
          )}
          {activeTab === 'search' && (
            artistQuery ? (
              <ArtistPage
                query={artistQuery}
                playSong={playSong}
                currentSong={currentSong}
                isPlaying={isPlaying}
                onBack={closeArtistPage}
                showToast={showToast}
                downloadSong={downloadSong}
                downloadedIds={downloadedIds}
                downloadingIds={downloadingIds}
                onOpenAlbum={openAlbumPage}
              />
            ) : albumQuery ? (
              <AlbumPage
                albumQuery={albumQuery}
                playSong={playSong}
                currentSong={currentSong}
                isPlaying={isPlaying}
                onBack={closeAlbumPage}
                showToast={showToast}
                downloadSong={downloadSong}
                downloadedIds={downloadedIds}
                downloadingIds={downloadingIds}
              />
            ) : (
              <SearchScreen
                searchResults={searchResults}
                searchLoading={searchLoading}
                searched={searched}
                currentSong={currentSong}
                isPlaying={isPlaying}
                playSong={playSong}
                toggleLike={toggleLike}
                liked={isLiked}
                downloadSong={downloadSong}
                downloadedIds={downloadedIds}
                downloadingIds={downloadingIds}
                onOpenArtist={openArtistPage}
                onOpenAlbum={openAlbumPage}
              />
            )
          )}
          {activeTab === 'liked' && (
            <LikedScreen
              likedSongs={likedSongs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              playSong={playSong}
              toggleLike={toggleLike}
              downloadSong={downloadSong}
              downloadedIds={downloadedIds}
              downloadingIds={downloadingIds}
            />
          )}
          {activeTab === 'downloads' && (
            <DownloadsScreen
              downloadedSongs={downloadedSongs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              playSong={playSong}
              removeDownload={removeDownload}
            />
          )}
          {activeTab === 'mysongs' && (
            <MySongsScreen
              customSongs={customSongs}
              setCustomSongs={setCustomSongs}
              playSong={playSong}
              currentSong={currentSong}
              isPlaying={isPlaying}
              showToast={showToast}
            />
          )}
        </div>
      </div>
      <PlayerBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        playNext={playNext}
        playPrev={playPrev}
        liked={isLiked}
        toggleLike={toggleLike}
        onProgressUpdate={(curTime, dur) => setAudioState({ curTime, dur })}
        onExpand={openFullScreen}
        onShowLyrics={() => currentSong && setShowLyrics(true)}
        repeatMode={repeatMode}
        toggleRepeat={toggleRepeat}
        shuffleOn={shuffleOn}
        toggleShuffle={toggleShuffle}
        onShowQueue={() => setShowQueue(true)}
        downloadSong={downloadSong}
        currentSongDownloaded={currentSong ? downloadedIds.includes(currentSong.id) : false}
        onSaveToMySongs={saveToMySongs}
      />
      <MiniPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onPlayPrev={playPrev}
        onPlayNext={playNext}
        curTime={audioState.curTime}
        dur={audioState.dur}
        onExpand={openFullScreen}
        onShowLyrics={() => currentSong && setShowLyrics(true)}
        downloadSong={downloadSong}
        currentSongDownloaded={currentSong ? downloadedIds.includes(currentSong.id) : false}
      />
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} likedCount={likedSongs.length} customCount={customSongs.length} onInstall={handleInstallApp} />
      <Toast msg={toastMsg} />
      {showFullScreen && currentSong && (
        <FullScreenPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          playNext={playNext}
          playPrev={playPrev}
          liked={isLiked}
          toggleLike={toggleLike}
          curTime={audioState.curTime}
          dur={audioState.dur}
          onClose={closeFullScreen}
          showToast={showToast}
          repeatMode={repeatMode}
          toggleRepeat={toggleRepeat}
          shuffleOn={shuffleOn}
          toggleShuffle={toggleShuffle}
          onShowQueue={() => { setShowFullScreen(false); setShowQueue(true); }}
          downloadSong={downloadSong}
          currentSongDownloaded={downloadedIds.includes(currentSong?.id)}
          onSaveToMySongs={(song) => setCustomSongs(prev => [...prev, song])}
        />
      )}
      {showLyrics && currentSong && (
        <LyricsPanel
          songId={currentSong.id}
          songTitle={currentSong.title}
          songArtist={currentSong.artist}
          onClose={() => setShowLyrics(false)}
        />
      )}
      {showQueue && (
        <QueuePanel
          playlist={playlist}
          currentIndex={currentIndex}
          currentSong={currentSong}
          playSong={playSong}
          onClose={() => setShowQueue(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
