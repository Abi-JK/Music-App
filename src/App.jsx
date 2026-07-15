import React, { useState, useCallback, useRef, useEffect } from 'react';
import './index.css';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PlayerBar from './components/PlayerBar';
import MiniPlayer from './components/MiniPlayer';
import MobileNav from './components/MobileNav';
import Toast from './components/Toast';
import InstallBanner from './components/InstallBanner';
import FullScreenPlayer from './components/FullScreenPlayer';

import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import LikedScreen from './screens/LikedScreen';
import DownloadsScreen from './screens/DownloadsScreen';

import { searchSongs, downloadAudioBlob, getStreamUrl } from './utils/api';
import { Storage } from './utils/storage';
import { LANG_QUERIES } from './utils/constants';

export default function App() {
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
  const [downloadingIds, setDownloadingIds] = useState([]);

  const [audioState, setAudioState] = useState({ curTime: 0, dur: 0 });
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const currentSong = playlist[currentIndex] || null;

  // Load data from IndexedDB on mount
  useEffect(() => {
    Storage.requestPersistence().catch(console.error);

    const loadData = async () => {
      try {
        const [liked, recent, downloaded] = await Promise.all([
          Storage.getLikedSongs(),
          Storage.getRecentlyPlayed(),
          Storage.getDownloadedSongs()
        ]);
        setLikedSongs(liked);
        setRecentlyPlayed(recent);
        setDownloadedSongs(downloaded);
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
      }
    };
    loadData();

    // PWA Install Prompt Logic
    if (window.__installPrompt) setDeferredPrompt(window.__installPrompt);
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      showToast('App is already installed or install is not supported on this browser. On iOS, tap Share > Add to Home Screen.');
    }
  };

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3500);
  }, []);

  const addRecent = useCallback(async (song) => {
    setRecentlyPlayed(prev => {
      const next = [song, ...prev.filter(s => s.id !== song.id)].slice(0, 12);
      Storage.addRecentlyPlayed(song).catch(console.error);
      return next;
    });
  }, []);

  const playSong = useCallback((song, context, contextIdx) => {
    if (!song) return;
    const ctx = context || [song];
    setPlaylist(ctx);
    setCurrentIndex(contextIdx != null ? contextIdx : 0);
    setIsPlaying(true);
    addRecent(song);
  }, [addRecent]);

  const playNext = useCallback(() => {
    if (!playlist.length) return;
    let next = (currentIndex + 1) % playlist.length;
    setCurrentIndex(next);
    setIsPlaying(true);
    if (playlist[next]) addRecent(playlist[next]);
  }, [playlist, currentIndex, addRecent]);

  const playPrev = useCallback(() => {
    if (!playlist.length) return;
    let prev = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prev);
    setIsPlaying(true);
    if (playlist[prev]) addRecent(playlist[prev]);
  }, [playlist, currentIndex, addRecent]);

  const isLiked = useCallback((id) => likedSongs.some(s => s.id === id), [likedSongs]);
  const toggleLike = useCallback(async (song) => {
    setLikedSongs(prev => {
      const already = prev.some(s => s.id === song.id);
      const next = already ? prev.filter(s => s.id !== song.id) : [...prev, song];
      
      if (already) {
        Storage.removeLikedSong(song.id).catch(console.error);
      } else {
        Storage.addLikedSong(song).catch(console.error);
      }
      
      showToast(already ? '💔 Removed from Liked Songs' : '❤️ Added to Liked Songs');
      return next;
    });
  }, [showToast]);

  const doSearch = useCallback(async (override) => {
    const q = (override ?? searchQ).trim();
    if (!q) return;
    setSearchQ(q);
    setActiveTab('search');
    setSearched(true);
    setSearchLoading(true);
    try {
      const langObj = LANG_QUERIES.find(l => l.label === activeLang);
      const term = langObj?.term && langObj.label !== 'All' ? `${q} ${langObj.term}` : q;
      const songs = await searchSongs(term, 200);
      setSearchResults(songs);
      if (songs.length) { setPlaylist(songs); setCurrentIndex(0); }
      else showToast('No results found.');
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
    const langObj = LANG_QUERIES.find(l => l.label === lang);
    if (!langObj?.term) return;
    searchSongs(langObj.term, 80)
      .then(songs => { setSearchResults(songs); if (songs.length) { setPlaylist(songs); setCurrentIndex(0); } })
      .catch(() => showToast('Could not load.'))
      .finally(() => setSearchLoading(false));
  }, [showToast]);

  const searchByQuery = useCallback(async (term) => {
    setSearchQ(term);
    setActiveTab('search');
    setSearched(true);
    setSearchLoading(true);
    setActiveLang('All');
    try {
      const songs = await searchSongs(term, 80);
      setSearchResults(songs);
      if (songs.length) { setPlaylist(songs); setCurrentIndex(0); }
      else showToast('No results found.');
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
      let audioUrl = song.audioUrl;
      if (!audioUrl) {
        const res = await getStreamUrl(song.id);
        audioUrl = res.streamUrl || res.audioUrl;
      }
      if (!audioUrl) throw new Error('No audio URL found');

      const blob = await downloadAudioBlob(audioUrl);
      if (!blob) throw new Error('Failed to download audio blob');

      const songWithBlob = {
        ...song,
        audioBlob: blob,
        downloadedAt: new Date().toISOString()
      };

      await Storage.addDownloadedSong(songWithBlob);
      setDownloadedSongs(prev => [...prev, songWithBlob]);
      showToast(`📥 "${song.title}" downloaded offline!`);
    } catch (err) {
      console.error(err);
      showToast(`Failed to download "${song.title}".`);
    } finally {
      setDownloadingIds(prev => prev.filter(id => id !== song.id));
    }
  }, [downloadedSongs, showToast]);

  const removeDownload = useCallback(async (songId) => {
    try {
      await Storage.removeDownloadedSong(songId);
      setDownloadedSongs(prev => prev.filter(s => s.id !== songId));
      showToast('🗑️ Song removed from offline downloads.');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove download.');
    }
  }, [showToast]);

  const openFullScreen = useCallback(() => { if (currentSong) setShowFullScreen(true); }, [currentSong]);
  const closeFullScreen = useCallback(() => setShowFullScreen(false), []);

  return (
    <div className="app">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} likedCount={likedSongs.length} onSearch={searchByQuery} onInstall={handleInstallApp} />
      <div className="body">
        <Topbar
          q={searchQ} setQ={setSearchQ}
          activeLang={activeLang} setLang={handleLangChip}
          onSearch={() => doSearch()}
        />
        <div className="main-scroll">
          <InstallBanner />
          {activeTab === 'home' && (
            <HomeScreen
              playSong={playSong}
              currentSong={currentSong}
              isPlaying={isPlaying}
              recentlyPlayed={recentlyPlayed}
            />
          )}
          {activeTab === 'search' && (
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
              downloadedIds={downloadedSongs.map(s => s.id)}
              downloadingIds={downloadingIds}
            />
          )}
          {activeTab === 'liked' && (
            <LikedScreen
              likedSongs={likedSongs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              playSong={playSong}
              toggleLike={toggleLike}
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
      />
      <MiniPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onPlayNext={playNext}
        curTime={audioState.curTime}
        dur={audioState.dur}
        onExpand={openFullScreen}
      />
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} likedCount={likedSongs.length} onInstall={handleInstallApp} />
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
        />
      )}
    </div>
  );
}
