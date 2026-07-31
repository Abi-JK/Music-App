import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import SettingsScreen from './screens/SettingsScreen';

import { searchSongs, downloadAudioBlob, searchSaavn, fetchSharedSongs, addSharedSong } from './utils/api';
import { Storage } from './utils/storage';
import { OpfsStorage } from './utils/opfsStorage';
import { CloudSync, generateBackupCode, normalizeCode } from './utils/cloudSync';
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
  const [restoring, setRestoring] = useState(false);
  const toastTimer = useRef(null);

  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [likedSongs, setLikedSongs] = useState([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [customSongs, setCustomSongs] = useState([]);
  const [sharedSongs, setSharedSongs] = useState([]);
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
  const keepAliveRef = useRef(null);
  const [backupCode, setBackupCode] = useState(null);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudRestoring, setCloudRestoring] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const cloudSyncingRef = useRef(false);
  const audioSyncingRef = useRef(false);
  const syncMetaNowRef = useRef(null);
  const backupAudioNowRef = useRef(null);
  const recentAutoPlay = useRef([]);

  const currentSong = playlist[currentIndex] || null;

  const playNextRef = useRef(null);
  const playPrevRef = useRef(null);
  const playSongRef = useRef(null);
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
    const requestPersist = async () => {
      for (let i = 0; i < 6; i++) {
        const granted = await Storage.requestPersistence();
        if (granted) break;
        await new Promise(r => setTimeout(r, 5000));
      }
    };
    requestPersist();
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(() => {});
    }
    const loadData = async () => {
      try {
        await Storage.cleanupOldCache();
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

        const totalLocal = liked.length + recent.length + downloaded.length + custom.length;
        if (totalLocal === 0) {
          try {
            let code = await CloudSync.getDeviceCode();
            if (!code) {
              code = generateBackupCode();
              await CloudSync.saveDeviceCode(code);
            }
            setBackupCode(code);
            const meta = await CloudSync.fetchMeta(code);
            if (meta && (
              (Array.isArray(meta.liked) && meta.liked.length > 0) ||
              (Array.isArray(meta.recent) && meta.recent.length > 0) ||
              (Array.isArray(meta.downloads) && meta.downloads.length > 0) ||
              (Array.isArray(meta.custom) && meta.custom.length > 0)
            )) {
              setRestoring(true);
              await Storage.importCloudData({
                liked: meta.liked || [],
                recent: meta.recent || [],
                downloads: meta.downloads || [],
                custom: meta.custom || [],
              });
              setLikedSongs(meta.liked || []);
              setRecentlyPlayed(meta.recent || []);
              setDownloadedSongs(meta.downloads || []);
              setCustomSongs(meta.custom || []);
              await new Promise(r => setTimeout(r, 1500));
              setRestoring(false);
            }
          } catch { setRestoring(false); }
        }

        fetchSharedSongs(200).then(songs => {
          if (songs.length > 0) {
            setSharedSongs(songs);
            try { localStorage.setItem('soundaura_shared_backup', JSON.stringify(songs.slice(0, 500))); } catch {}
          }
        }).catch(() => {
          try {
            const cached = JSON.parse(localStorage.getItem('soundaura_shared_backup') || '[]');
            if (cached.length > 0) setSharedSongs(cached);
          } catch {}
        });
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
      }
    };
    loadData();

    const syncTimer = setInterval(() => {
      Storage.forceSyncToOpfs().catch(() => {});
      if (syncMetaNowRef.current) syncMetaNowRef.current();
      if (backupAudioNowRef.current) backupAudioNowRef.current();
    }, 120000);

    if (window.__installPrompt) setDeferredPrompt(window.__installPrompt);
    const handler = (e) => { e.preventDefault(); window.__installPrompt = e; setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);

    let heartbeatRetries = 0;
    const resumeAudio = () => {
      const a = document.getElementById('main-audio');
      if (a && a.paused && a.src && !a.ended && isPlayingRef.current) {
        heartbeatRetries = 0;
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
      try {
        navigator.mediaSession.setActionHandler('previoustrack', () => { if (playPrevRef.current) playPrevRef.current(); });
      } catch {}
      try {
        navigator.mediaSession.setActionHandler('nexttrack', () => { if (playNextRef.current) playNextRef.current(); });
      } catch {}
    }

    const heartbeat = setInterval(() => {
      const a = document.getElementById('main-audio');
      if (a && a.src && isPlayingRef.current) {
        if (a.paused && !a.ended) {
          if (heartbeatRetries < 5) {
            a.play().then(() => {
              heartbeatRetries = 0;
              setIsPlaying(true);
              if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            }).catch(() => { heartbeatRetries++; });
          }
        } else {
          heartbeatRetries = 0;
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }
      }
      reacquireWakeLock();
    }, 3000);

    return () => {
      clearInterval(syncTimer);
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

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;
    if (isPlaying) {
      if (!keepAliveRef.current) {
        try {
          const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
          a.loop = true;
          a.volume = 0.001;
          a.play().then(() => { keepAliveRef.current = a; }).catch(() => {});
        } catch {}
      }
    } else if (keepAliveRef.current) {
      keepAliveRef.current.pause();
      keepAliveRef.current.src = '';
      keepAliveRef.current = null;
    }
    return () => {
      if (keepAliveRef.current) {
        keepAliveRef.current.pause();
        keepAliveRef.current.src = '';
        keepAliveRef.current = null;
      }
    };
  }, [isPlaying]);

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

  /* ---------- Cloud backup & restore (survives Chrome clear data) ---------- */

  const syncMetaNow = useCallback(async () => {
    if (!backupCode || cloudSyncingRef.current) return false;
    cloudSyncingRef.current = true;
    setCloudSyncing(true);
    try {
      const meta = {
        liked: likedSongs,
        recent: recentlyPlayed,
        downloads: downloadedSongs,
        custom: customSongs,
      };
      await CloudSync.uploadMeta(backupCode, meta);
      setLastSync(CloudSync.getLastSync());
      if (backupAudioNowRef.current) backupAudioNowRef.current();
      return true;
    } catch {
      return false;
    } finally {
      cloudSyncingRef.current = false;
      setCloudSyncing(false);
    }
  }, [backupCode, likedSongs, recentlyPlayed, downloadedSongs, customSongs]);

  useEffect(() => { syncMetaNowRef.current = syncMetaNow; }, [syncMetaNow]);

  const backupAudioNow = useCallback(async () => {
    if (!backupCode || !CloudSync.isAudioBackupEnabled() || audioSyncingRef.current) return;
    audioSyncingRef.current = true;
    try {
      const uploaded = await CloudSync.getUploadedAudioSet(backupCode);
      const candidates = [];
      for (const s of customSongs) if (s._customFile || s.audioBlob) candidates.push(s.id);
      for (const s of downloadedSongs) candidates.push(s.id);
      const pending = candidates.filter(id => !uploaded.has(id)).slice(0, 5);
      for (const id of pending) {
        try {
          const blob = await OpfsStorage.loadAudioBlob(id);
          if (blob && blob.size > 0) {
            await CloudSync.uploadAudio(backupCode, id, blob);
            uploaded.add(id);
            await CloudSync.setUploadedAudioSet(backupCode, uploaded);
          }
        } catch {}
      }
    } finally {
      audioSyncingRef.current = false;
    }
  }, [backupCode, customSongs, downloadedSongs]);

  useEffect(() => { backupAudioNowRef.current = backupAudioNow; }, [backupAudioNow]);

  const copyBackupCode = useCallback((code) => {
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      showToast(`Backup code copied: ${code}`);
    } catch {
      showToast(`Backup code: ${code}`);
    }
  }, [showToast]);

  const restoreFromCode = useCallback(async (codeInput) => {
    const code = normalizeCode(codeInput);
    if (!code) {
      showToast('Invalid code. Use the format SA-XXXX-XXXX');
      return false;
    }
    setCloudRestoring(true);
    try {
      const meta = await CloudSync.fetchMeta(code);
      const hasData = meta && (
        meta.updatedAt ||
        (Array.isArray(meta.liked) && meta.liked.length > 0) ||
        (Array.isArray(meta.recent) && meta.recent.length > 0) ||
        (Array.isArray(meta.downloads) && meta.downloads.length > 0) ||
        (Array.isArray(meta.custom) && meta.custom.length > 0)
      );
      if (!hasData) {
        showToast('No backup found for this code.');
        return false;
      }
      await CloudSync.saveDeviceCode(code);
      setBackupCode(code);
      const result = await Storage.importCloudData({
        liked: meta.liked || [],
        recent: meta.recent || [],
        downloads: meta.downloads || [],
        custom: meta.custom || [],
      });
      setLikedSongs(meta.liked || []);
      setRecentlyPlayed(meta.recent || []);
      setDownloadedSongs(meta.downloads || []);
      setCustomSongs(meta.custom || []);
      showToast(`Restored: ❤️${result.liked} · 🕐${result.recent} · 📥${result.downloads} · 🎵${result.custom}`);
      setTimeout(() => {
        (async () => {
          const songs = [...(meta.downloads || []), ...(meta.custom || [])];
          const uploaded = await CloudSync.getUploadedAudioSet(code);
          for (const s of songs) {
            try {
              const blob = await CloudSync.fetchAudio(code, s.id);
              if (blob && blob.size > 0) {
                await OpfsStorage.saveAudioBlob(s.id, blob);
                uploaded.add(s.id);
              }
            } catch {}
          }
          await CloudSync.setUploadedAudioSet(code, uploaded);
        })();
      }, 500);
      return true;
    } catch (err) {
      console.error(err);
      showToast('Restore failed. Check your internet connection.');
      return false;
    } finally {
      setCloudRestoring(false);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let code = await CloudSync.getDeviceCode();
        if (!code) {
          try {
            const cache = await caches.open('soundaura-data-v1');
            const resp = await cache.match(new Request('https://soundaura.local/backup-code'));
            if (resp) { const d = await resp.json(); if (d?.code) code = d.code; }
          } catch {}
        }
        if (!code) {
          code = generateBackupCode();
          await CloudSync.saveDeviceCode(code);
        }
        try {
          const cache = await caches.open('soundaura-data-v1');
          await cache.put(new Request('https://soundaura.local/backup-code'), new Response(JSON.stringify({ code })));
        } catch {}
        if (!cancelled) {
          setBackupCode(code);
          setLastSync(CloudSync.getLastSync());
          setCloudReady(true);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!cloudReady || !backupCode) return;
    syncMetaNow();
    backupAudioNow();
  }, [likedSongs, recentlyPlayed, downloadedSongs, customSongs, cloudReady, backupCode, syncMetaNow, backupAudioNow]);

  useEffect(() => {
    if (!cloudReady || !backupCode) return;
    const flush = () => {
      if (document.visibilityState === 'hidden') syncMetaNow();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [cloudReady, backupCode, syncMetaNow]);

  const playSong = useCallback(async (song, context, contextIdx) => {
    if (!song) return;
    const ctx = context || [song];

    if (song.source === 'shared' && song._sharedQuery && !song.audioUrl) {
      try {
        const resolved = await searchSongs(song._sharedQuery, 5);
        if (resolved.length > 0) {
          const resolvedSong = { ...resolved[0], coverUrl: song.coverUrl || resolved[0].coverUrl };
          const idx = ctx.findIndex(s => s.id === song.id);
          const newCtx = [...ctx];
          if (idx >= 0) newCtx[idx] = resolvedSong;
          const resolvedIds = new Set([resolvedSong.id]);
          for (let i = 0; i < newCtx.length; i++) {
            const s = newCtx[i];
            if (s.source === 'shared' && s._sharedQuery && !s.audioUrl && s.id !== song.id) {
              try {
                const r = await searchSongs(s._sharedQuery, 3);
                if (r.length > 0 && !resolvedIds.has(r[0].id)) {
                  newCtx[i] = { ...r[0], coverUrl: s.coverUrl || r[0].coverUrl };
                  resolvedIds.add(r[0].id);
                }
              } catch {}
            }
          }
          playSongRef.current(resolvedSong, newCtx.length > 0 ? newCtx : [resolvedSong], idx >= 0 ? idx : 0);
          return;
        }
      } catch {}
    }

    const playableCtx = ctx.filter(s => s.audioUrl || s.source === 'custom' || s.source === 'shared');
    const finalCtx = playableCtx.length > 0 ? playableCtx : ctx;

    originalPlaylistRef.current = finalCtx;
    autoPlayGenreRef.current = song.genre || song.language || (song.artist ? `${song.artist}` : 'trending india');
    playedSongIds.current = new Set();
    recentAutoPlay.current = [];
    if (shuffleRef.current) {
      const shuffled = shuffleArray(finalCtx);
      const si = shuffled.findIndex(s => s.id === song.id);
      setPlaylist(shuffled);
      setCurrentIndex(si >= 0 ? si : 0);
    } else {
      setPlaylist(finalCtx);
      const idx = finalCtx.findIndex(s => s.id === song.id);
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
        `${genre} ${year}`,
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
          autoPlayGenreFuncRef.current?.(autoPlayGenreRef.current || 'trending india');
        }
      } else if (repeatMode === 'off') {
        setIsPlaying(false);
        showToast('Playlist ended. Tap play to start auto-play.');
        return;
      } else {
        autoPlayGenreFuncRef.current?.(autoPlayGenreRef.current || 'trending india');
      }
      return;
    }
    setCurrentIndex(nextIdx);
    setIsPlaying(true);
    if (playlist[nextIdx]) addRecent(playlist[nextIdx]);
  }, [playlist, currentIndex, addRecent, repeatMode, currentSong]);

  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { playSongRef.current = playSong; }, [playSong]);

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

  useEffect(() => { playPrevRef.current = playPrev; }, [playPrev]);

  const toggleShuffle = useCallback(() => {
    if (playlist.length === 0) return;
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
    setAlbumQuery(null);
    try {
      const langObj = LANG_QUERIES.find(l => l.label === activeLang);
      const term = langObj?.term && langObj.label !== 'All' ? `${q} ${langObj.term}` : q;
      const songs = await searchSongs(term, 50);

      const lq = q.toLowerCase();
      const localMatches = customSongs.filter(s =>
        (s.title || '').toLowerCase().includes(lq) ||
        (s.artist || '').toLowerCase().includes(lq) ||
        (s.album || '').toLowerCase().includes(lq)
      );
      const sharedMatches = sharedSongs.filter(s =>
        (s.title || '').toLowerCase().includes(lq) ||
        (s.artist || '').toLowerCase().includes(lq) ||
        (s.album || '').toLowerCase().includes(lq)
      ).map(s => ({
        id: `shared-${s.title}-${s.artist}`,
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
      }));
      const merged = [...localMatches, ...sharedMatches.filter(sh => !localMatches.some(l => l.title === sh.title && l.artist === sh.artist)), ...songs];
      const unique = [...new Map(merged.map(s => [s.id, s])).values()];
      setSearchResults(unique);
    } catch {
      showToast('Search failed. Check your connection.');
    }
    setSearchLoading(false);
  }, [searchQ, activeLang, showToast, customSongs, sharedSongs]);

  const handleLangChip = useCallback((lang) => {
    setActiveLang(lang);
    if (lang === 'All') { setActiveTab('home'); return; }
    setActiveTab('search');
    setSearched(true);
    setSearchLoading(true);
    const queries = LANG_SEARCH_QUERIES[lang];
    const searchTerms = queries ? queries.slice(0, 12) : [`${lang} songs`];
    const BATCH = 4;
    const runBatches = async () => {
      let all = [];
      for (let i = 0; i < searchTerms.length; i += BATCH) {
        const batch = searchTerms.slice(i, i + BATCH);
        const results = await Promise.all(batch.map(t => searchSongs(t, 20).catch(() => [])));
        all = all.concat(results.flat());
      }
      return all;
    };
    runBatches()
      .then(results => {
        const langLower = lang.toLowerCase();
        const localMatches = customSongs.filter(s =>
          (s.genre || '').toLowerCase().includes(langLower) ||
          (s.album || '').toLowerCase().includes(langLower)
        );
        const sharedMatches = sharedSongs.filter(s =>
          (s.genre || '').toLowerCase().includes(langLower)
        ).map(s => ({
          id: `shared-${s.title}-${s.artist}`,
          title: s.title, artist: s.artist, album: s.album || '',
          genre: s.genre || '', coverUrl: s.coverUrl || null,
          audioUrl: null, allAudioUrls: [], rawAudioUrls: [],
          source: 'shared', _sharedQuery: `${s.title} ${s.artist} ${s.album || ''}`,
        }));
        const merged = [...localMatches, ...sharedMatches, ...results.flat()];
        const unique = [...new Map(merged.map(s => [s.id, s])).values()];
        setSearchResults(unique);
      })
      .catch(() => showToast('Could not load.'))
      .finally(() => setSearchLoading(false));
  }, [showToast, customSongs, sharedSongs]);

  const searchByQuery = useCallback(async (term) => {
    const q = (typeof term === 'string' ? term : '').trim();
    if (!q) return;
    setSearchQ(q);
    setActiveTab('search');
    setSearched(true);
    setSearchLoading(true);
    setActiveLang('All');
    setArtistQuery(null);
    setAlbumQuery(null);
    try {
      const songs = await searchSongs(q, 80);
      const lq = q.toLowerCase();
      const localMatches = customSongs.filter(s =>
        (s.title || '').toLowerCase().includes(lq) ||
        (s.artist || '').toLowerCase().includes(lq) ||
        (s.album || '').toLowerCase().includes(lq)
      );
      const sharedMatches = sharedSongs.filter(s =>
        (s.title || '').toLowerCase().includes(lq) ||
        (s.artist || '').toLowerCase().includes(lq) ||
        (s.album || '').toLowerCase().includes(lq)
      ).map(s => ({
        id: `shared-${s.title}-${s.artist}`,
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
      }));
      const merged = [...localMatches, ...sharedMatches.filter(sh => !localMatches.some(l => l.title === sh.title && l.artist === sh.artist)), ...songs];
      const unique = [...new Map(merged.map(s => [s.id, s])).values()];
      setSearchResults(unique);
      if (!unique.length) showToast('No results found.');
    } catch {
      showToast('Search failed. Check your connection.');
    }
    setSearchLoading(false);
  }, [showToast, customSongs, sharedSongs]);

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
      if (!blob && song.audioUrl) {
        blob = await downloadAudioBlob(song.audioUrl, song.rawAudioUrls || []);
      }
      const customSong = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: song.title,
        artist: song.artist,
        album: song.album || 'My Songs',
        year: song.year || '',
        duration: song.duration || 0,
        coverUrl: song.coverUrl,
        audioUrl: blob ? null : (song.audioUrl || null),
        allAudioUrls: blob ? [] : (song.allAudioUrls || []),
        rawAudioUrls: blob ? [] : (song.rawAudioUrls || []),
        genre: song.genre || '',
        source: 'custom',
        downloadable: true,
        _customFile: !!blob,
        addedAt: new Date().toISOString(),
      };
      await Storage.addCustomSong(customSong, blob);
      setCustomSongs(prev => [...prev, customSong]);
      addSharedSong(customSong).catch(() => {});
      showToast(`"${song.title}" saved to My Songs — shared with community!`);
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

  const downloadedIds = useMemo(() => downloadedSongs.map(s => s.id), [downloadedSongs]);

  return (
    <div className="app">
      {restoring && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <img src="/icons/icon-128.png" alt="" width={64} height={64} style={{ borderRadius: 16 }} />
          <div style={{ color: '#00d4e8', fontSize: 18, fontWeight: 700 }}>Restoring your music...</div>
          <div style={{ color: '#8ab', fontSize: 13, textAlign: 'center', maxWidth: 280 }}>
            Your liked songs, downloads, and playlists are being restored from your cloud backup.
          </div>
          <div style={{ width: 48, height: 48, border: '3px solid #1e293b', borderTopColor: '#00d4e8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} likedCount={likedSongs.length} customCount={customSongs.length} onSearch={searchByQuery} showToast={showToast} onOpenArtist={openArtistPage} />
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
              sharedSongs={sharedSongs}
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
                onOpenArtist={openArtistPage}
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
          {activeTab === 'settings' && (
            <SettingsScreen
              showToast={showToast}
              backupCode={backupCode}
              cloudSyncing={cloudSyncing}
              cloudRestoring={cloudRestoring}
              lastSync={lastSync}
              onSyncNow={syncMetaNow}
              onRestore={restoreFromCode}
              onCopyCode={copyBackupCode}
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
        downloadedIds={downloadedIds}
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
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} likedCount={likedSongs.length} customCount={customSongs.length} />
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
          onSaveToMySongs={saveToMySongs}
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
