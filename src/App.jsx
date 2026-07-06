import React, { useState, useRef, useEffect, useCallback } from 'react';
import './index.css';

// Utilities
import {
  saveOfflineTrack, getOfflineTrack, listOfflineTracks, deleteOfflineTrack, blobUrlForTrack, clearAllTrackUrls
} from './offlineStore';
import { LS } from './utils/helpers';
import { searchSongs, getStreamUrl, fetchStreamBlob } from './utils/api';
import { LANG_QUERIES, HOME_SECTIONS } from './utils/constants';

// Hooks
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useSleepTimer } from './hooks/useSleepTimer';

// Components
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import PlayerBar from './components/PlayerBar';
import MiniPlayer from './components/MiniPlayer';
import DetailPanel from './components/DetailPanel';
import RingtoneModal from './components/RingtoneModal';
import Toast from './components/Toast';
import OfflineIndicator from './components/OfflineIndicator';
import InstallBanner from './components/InstallBanner';
import SleepTimerModal from './components/SleepTimerModal';
import LocalUpload from './components/LocalUpload';
import MobileNav from './components/MobileNav';

// Views
import HomeView from './views/HomeView';
import SearchView from './views/SearchView';
import LikedView from './views/LikedView';
import DownloadsView from './views/DownloadsView';

export default function App() {
  const [activeTab,       setActiveTab]       = useState('home');
  const [searchQ,         setSearchQ]         = useState('');
  const [activeLang,      setActiveLang]      = useState('All');
  const [playlist,        setPlaylist]        = useState([]);
  const [currentIndex,    setCurrentIndex]    = useState(0);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [toastMsg,        setToastMsg]        = useState('');
  const toastTimer = useRef(null);

  const [homeData,        setHomeData]        = useState({});
  const [homeLoading,     setHomeLoading]     = useState(true);
  const [searchResults,   setSearchResults]   = useState([]);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const [searched,        setSearched]        = useState(false);

  const [likedSongs,      setLikedSongs]      = useState(() => LS.get('sw_liked', []));
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [recentlyPlayed,  setRecentlyPlayed]  = useState(() => LS.get('sw_recent', []));
  const [ringtoneTarget,  setRingtoneTarget]  = useState(null);
  const [detailSong,      setDetailSong]      = useState(null);
  const [shuffle,         setShuffle]         = useState(false);

  // New PWA & Features States
  const [isLight, setIsLight] = useState(() => LS.get('sw_theme', 'dark') === 'light');
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [mobilePlayerOpen, setMobilePlayerOpen] = useState(false);

  const currentSong = playlist[currentIndex] || null;
  const panelOpen   = !!detailSong;

  // Custom Hooks integration
  const isOnline = useOnlineStatus();
  
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3500);
  }, []);

  // Sleep Timer Hook
  const { 
    isActive: sleepTimerActive, 
    cancelTimer, 
    startTimer, 
    formatRemaining 
  } = useSleepTimer(() => {
    setIsPlaying(false);
    showToast('⏰ Sleep timer ended. Playback paused.');
  });

  // Handle Theme switching
  useEffect(() => {
    const root = document.documentElement;
    if (isLight) {
      root.classList.add('light-theme');
      LS.set('sw_theme', 'light');
    } else {
      root.classList.remove('light-theme');
      LS.set('sw_theme', 'dark');
    }
  }, [isLight]);

  // Load offline library
  const loadOfflineLibrary = useCallback(() => {
    listOfflineTracks()
      .then(records => setDownloadedSongs(records.map(r => ({ ...r.song, offline: true, localUrl: blobUrlForTrack(r) }))))
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadOfflineLibrary();
    // Cleanup Object URLs on unmount to prevent leaks
    return () => {
      clearAllTrackUrls();
    };
  }, [loadOfflineLibrary]);

  // Load Home feed
  useEffect(() => {
    if (!isOnline) {
      setHomeLoading(false);
      return;
    }
    setHomeLoading(true);
    Promise.all(
      HOME_SECTIONS.map(sec =>
        searchSongs(sec.term, 12)
          .then(songs => ({ key: sec.key, label: sec.label, songs }))
          .catch(() => ({ key: sec.key, label: sec.label, songs: [] }))
      )
    ).then(results => {
      const data = {};
      results.forEach(r => { data[r.key] = r; });
      setHomeData(data);
      const all = results.flatMap(r => r.songs);
      if (all.length && !playlist.length) { setPlaylist(all); setCurrentIndex(0); }
    }).finally(() => setHomeLoading(false));
  }, [isOnline]); // eslint-disable-line

  // Handle SW updates
  useEffect(() => {
    const handleUpdate = () => {
      showToast('⚡ New version available! Reload to update.');
    };
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, [showToast]);

  const addRecent = useCallback((song) => {
    setRecentlyPlayed(prev => {
      const next = [song, ...prev.filter(s => s.id !== song.id)].slice(0, 8);
      LS.set('sw_recent', next);
      return next;
    });
  }, []);

  const playSong = useCallback(async (song, context, contextIdx) => {
    if (!song) return;

    // Check offline cache first
    const offline = await getOfflineTrack(song.id).catch(() => null);
    if (offline) {
      const localUrl = blobUrlForTrack(offline);
      const enriched = { ...song, ...offline.song, offline: true, localUrl };
      const ctxWithOffline = (context || []).map(s => s.id === song.id ? enriched : s);
      setPlaylist(ctxWithOffline.length ? ctxWithOffline : [enriched]);
      setCurrentIndex(ctxWithOffline.findIndex(s => s.id === song.id));
      setIsPlaying(true);
      addRecent(enriched);
      if (window.innerWidth <= 767) setMobilePlayerOpen(true);
      return;
    }

    if (!isOnline) {
      showToast('📴 This song is not saved for offline playback.');
      return;
    }

    // Online: set playlist and let PlayerBar fetch fresh stream
    const ctx = context || [song];
    setPlaylist(ctx);
    setCurrentIndex(contextIdx != null ? contextIdx : ctx.findIndex(s => s.id === song.id));
    setIsPlaying(true);
    addRecent(song);
    if (window.innerWidth <= 767) setMobilePlayerOpen(true);
  }, [addRecent, isOnline, showToast]);

  const playNext = useCallback(() => {
    if (!playlist.length) return;
    let next = shuffle && playlist.length > 1
      ? (() => { let i; do { i = Math.floor(Math.random() * playlist.length); } while (i === currentIndex); return i; })()
      : (currentIndex + 1) % playlist.length;
    setCurrentIndex(next);
    setIsPlaying(true);
    if (playlist[next]) addRecent(playlist[next]);
  }, [playlist, currentIndex, shuffle, addRecent]);

  const playPrev = useCallback(() => {
    if (!playlist.length) return;
    const prev = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prev);
    setIsPlaying(true);
    if (playlist[prev]) addRecent(playlist[prev]);
  }, [playlist, currentIndex, addRecent]);

  const isLiked    = useCallback((id) => likedSongs.some(s => s.id === id), [likedSongs]);
  const toggleLike = useCallback((song) => {
    setLikedSongs(prev => {
      const already = prev.some(s => s.id === song.id);
      const next    = already ? prev.filter(s => s.id !== song.id) : [...prev, song];
      LS.set('sw_liked', next);
      showToast(already ? '💔 Removed from Liked Songs' : '❤️ Added to Liked Songs');
      return next;
    });
  }, [showToast]);

  // Download & save offline
  const handleDownload = useCallback(async (song) => {
    if (song.offline) { showToast('✅ Already saved offline!'); return; }
    showToast(`⬇️ Saving offline: ${song.title}...`);
    try {
      // Always fetch a fresh stream URL before downloading
      const fresh = await getStreamUrl(song.id);
      const blob  = await fetchStreamBlob(fresh.audioUrl);
      await saveOfflineTrack({ ...song, audioUrl: fresh.audioUrl, streamUrl: fresh.streamUrl }, blob);
      showToast(`✅ Saved offline: ${song.title}`);
      loadOfflineLibrary();
    } catch (e) {
      console.error('Download error:', e);
      showToast(`❌ Download failed: ${e.message}`);
    }
  }, [showToast, loadOfflineLibrary]);

  const handleDeleteOffline = useCallback(async (song) => {
    try {
      await deleteOfflineTrack(song.id);
      showToast(`🗑️ Removed: ${song.title}`);
      loadOfflineLibrary();
    } catch { showToast('❌ Delete failed.'); }
  }, [showToast, loadOfflineLibrary]);

  const openRingtone = useCallback(async (song) => {
    showToast('✂️ Preparing ringtone cutter...');
    try {
      const fresh = await getStreamUrl(song.id);
      setRingtoneTarget({ ...song, audioUrl: fresh.audioUrl, streamUrl: fresh.streamUrl });
    } catch { showToast('⚠️ Could not prepare ringtone.'); }
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
      const term    = langObj?.term ? `${q} ${langObj.term}` : q;
      const songs   = await searchSongs(term, 50);
      setSearchResults(songs);
      if (songs.length) { setPlaylist(songs); setCurrentIndex(0); }
      else showToast('No results found.');
    } catch { showToast('⚠️ Search failed.'); }
    finally { setSearchLoading(false); }
  }, [searchQ, activeLang, showToast]);

  const handleSuggestionClick = useCallback((song) => {
    setSearchResults([song]); setPlaylist([song]); setCurrentIndex(0);
    setIsPlaying(true); setDetailSong(song); addRecent(song);
    setActiveTab('search'); setSearched(true);
  }, [addRecent]);

  const handlePlaylistSearch = useCallback((term, label) => {
    setSearchQ(term); setActiveTab('search'); setSearched(true); setSearchLoading(true);
    searchSongs(term, 40)
      .then(songs => { setSearchResults(songs); if (songs.length) { setPlaylist(songs); setCurrentIndex(0); } showToast(`📂 ${label}`); })
      .catch(() => showToast('⚠️ Could not load.'))
      .finally(() => setSearchLoading(false));
  }, [showToast]);

  const handleLangChip = useCallback((lang) => {
    setActiveLang(lang);
    if (lang === 'All') { setActiveTab('home'); return; }
    const langObj = LANG_QUERIES.find(l => l.label === lang);
    if (!langObj?.term) return;
    setSearchQ(lang); setSearched(true); setActiveTab('search'); setSearchLoading(true);
    searchSongs(langObj.term, 40)
      .then(songs => { setSearchResults(songs); if (songs.length) { setPlaylist(songs); setCurrentIndex(0); } })
      .catch(() => showToast('⚠️ Could not load.'))
      .finally(() => setSearchLoading(false));
  }, [showToast]);

  return (
    <div className={`app ${panelOpen ? 'panel-open' : ''}`}>
      <OfflineIndicator />

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        likedCount={likedSongs.length} 
        dlCount={downloadedSongs.length}
        onPlaylistSearch={handlePlaylistSearch}
        onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      <div className="body">
        <Topbar 
          q={searchQ} 
          setQ={setSearchQ}
          activeLang={activeLang} 
          setLang={handleLangChip}
          onSearch={() => doSearch()}
          onSuggestionClick={handleSuggestionClick}
          isLight={isLight}
          onToggleTheme={() => setIsLight(!isLight)}
        />
        
        <div className="main-scroll">
          <InstallBanner showToast={showToast} />
          
          {activeTab === 'home' && (
            <HomeView 
              recentlyPlayed={recentlyPlayed} 
              currentSong={currentSong} 
              isPlaying={isPlaying} 
              playSong={playSong}
              homeLoading={homeLoading}
              homeData={homeData}
              doSearch={doSearch}
              setDetailSong={setDetailSong}
            />
          )}
          {activeTab === 'search' && (
            <SearchView 
              searchLoading={searchLoading}
              searched={searched}
              searchResults={searchResults}
              currentSong={currentSong}
              isPlaying={isPlaying}
              playSong={playSong}
              handleDownload={handleDownload}
              toggleLike={toggleLike}
              isLiked={isLiked}
              openRingtone={openRingtone}
              setDetailSong={setDetailSong}
            />
          )}
          {activeTab === 'liked' && (
            <LikedView 
              likedSongs={likedSongs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              playSong={playSong}
              handleDownload={handleDownload}
              toggleLike={toggleLike}
              isLiked={isLiked}
              openRingtone={openRingtone}
              setDetailSong={setDetailSong}
            />
          )}
          {activeTab === 'downloads' && (
            <DownloadsView 
              downloadedSongs={downloadedSongs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              playSong={playSong}
              handleDownload={handleDownload}
              toggleLike={toggleLike}
              isLiked={isLiked}
              openRingtone={openRingtone}
              setDetailSong={setDetailSong}
              handleDeleteOffline={handleDeleteOffline}
            />
          )}
        </div>
      </div>

      {panelOpen && (
        <DetailPanel
          song={detailSong} 
          onClose={() => setDetailSong(null)}
          liked={isLiked} 
          toggleLike={toggleLike}
          onPlay={() => {
            if (currentSong?.id === detailSong?.id) setIsPlaying(p => !p);
            else playSong(detailSong, playlist, playlist.findIndex(s => s.id === detailSong.id));
          }}
          isPlaying={isPlaying && currentSong?.id === detailSong?.id}
          showToast={showToast} 
          onDownload={handleDownload} 
          onRingtone={openRingtone}
        />
      )}

      {/* Standard desktop Player bar */}
      <PlayerBar
        currentSong={currentSong} 
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying} 
        playNext={playNext} 
        playPrev={playPrev}
        liked={isLiked} 
        toggleLike={toggleLike}
        onRingtone={openRingtone} 
        onDetails={setDetailSong}
        showToast={showToast} 
        shuffle={shuffle} 
        setShuffle={setShuffle}
        onDownload={handleDownload}
        timerRemainingActive={sleepTimerActive}
        formattedTimerTime={formatRemaining()}
        mobileOpen={mobilePlayerOpen}
        setMobileOpen={setMobilePlayerOpen}
      />

      {/* Mobile Mini Player display */}
      <MiniPlayer 
        currentSong={currentSong} 
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onPlayNext={playNext}
        onOpenDetails={() => setMobilePlayerOpen(true)}
      />

      {/* Mobile Bottom Tab navigation bar */}
      <MobileNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        likedCount={likedSongs.length} 
        dlCount={downloadedSongs.length}
      />

      {/* Feature Modals */}
      <SleepTimerModal 
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
        timerActive={sleepTimerActive}
        startTimer={startTimer}
        cancelTimer={cancelTimer}
        formatRemaining={formatRemaining}
      />

      <LocalUpload 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        showToast={showToast}
        onAddLocalTrack={loadOfflineLibrary}
      />

      {ringtoneTarget && (
        <RingtoneModal 
          song={ringtoneTarget} 
          onClose={() => setRingtoneTarget(null)} 
          showToast={showToast}
        />
      )}
      
      <Toast msg={toastMsg}/>
    </div>
  );
}
