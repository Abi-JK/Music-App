import React, { useRef, useState, useEffect } from 'react';
import { fmt } from '../utils/helpers';
import { getStreamUrl, fetchStreamBlob } from '../utils/api';

export default function PlayerBar({ 
  currentSong, isPlaying, setIsPlaying, playNext, playPrev,
  liked, toggleLike, onRingtone, onDetails, showToast, shuffle, setShuffle,
  onDownload, timerRemainingActive, formattedTimerTime,
  mobileOpen, setMobileOpen
}) {
  const audioRef  = useRef(null);
  const [curTime, setCurTime] = useState(0);
  const [dur,     setDur]     = useState(0);
  const [vol,     setVol]     = useState(0.85);
  const [muted,   setMuted]   = useState(false);
  const [repeat,  setRepeat]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);

  // KEY: Resolve a fresh signed stream URL every time the song changes
  useEffect(() => {
    if (!currentSong) { setStreamUrl(null); return; }

    // Offline song → use blob URL directly
    if (currentSong.localUrl) {
      setStreamUrl(currentSong.localUrl);
      return;
    }

    // Online song → fetch fresh signed token URL
    setStreamUrl(null);
    setLoading(true);
    showToast(`▶️ Loading: ${currentSong.title}...`);

    getStreamUrl(currentSong.id)
      .then(fresh => {
        setStreamUrl(fresh.streamUrl);
        setLoading(false);
      })
      .catch(err => {
        console.error('getStreamUrl error:', err);
        setLoading(false);
        setIsPlaying(false);
        showToast('⚠️ Could not load stream. Try again.');
      });
  }, [currentSong?.id, currentSong?.localUrl]); // eslint-disable-line

  // Load audio element whenever streamUrl changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    setCurTime(0); setDur(0); setLoading(true);
    a.src = streamUrl;
    a.load();
  }, [streamUrl]);

  // Play / pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    if (isPlaying) {
      const tryPlay = () => {
        a.play()
          .then(() => setLoading(false))
          .catch(err => {
            console.error('play error:', err);
            setLoading(false);
            setIsPlaying(false);
            showToast('⚠️ Playback failed. Try another song.');
          });
      };
      if (a.readyState >= 3) tryPlay();
      else a.addEventListener('canplay', tryPlay, { once: true });
    } else {
      a.pause();
    }
  }, [isPlaying, streamUrl, setIsPlaying, showToast]);

  // Volume
  useEffect(() => { if (audioRef.current) audioRef.current.volume = muted ? 0 : vol; }, [vol, muted]);

  // Media Session API for lock screen / headphone controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title, artist: currentSong.artist, album: currentSong.album || '',
      artwork: currentSong.coverUrl ? [{ src: currentSong.coverUrl, sizes: '300x300', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play',          () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause',         () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler('nexttrack',     playNext);
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
  }, [currentSong?.id, playNext, playPrev, setIsPlaying]);

  // Spacebar shortcut
  useEffect(() => {
    const kd = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [setIsPlaying]);

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a) { setCurTime(a.currentTime); if (a.duration && !isNaN(a.duration)) setDur(a.duration); }
  };
  const onLoaded = () => {
    setLoading(false);
    const a = audioRef.current;
    if (a?.duration && !isNaN(a.duration)) setDur(a.duration);
  };
  const onAudioError = (e) => {
    console.error('Audio error:', e.nativeEvent || e);
    setLoading(false);
    if (currentSong && !currentSong.localUrl) {
      showToast('⚠️ Stream error — trying next song...');
      setTimeout(playNext, 1200);
    } else {
      setIsPlaying(false);
      showToast('⚠️ Playback error.');
    }
  };
  const onEnded = () => { if (repeat && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } else playNext(); };
  const seekTo  = (pct) => { if (audioRef.current && dur) audioRef.current.currentTime = Math.max(0, Math.min(1, pct)) * dur; };
  const onSeek  = e => { const rect = e.currentTarget.getBoundingClientRect(); seekTo((e.clientX - rect.left) / rect.width); };
  const onVol   = e => { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); setVol(pct); if (pct > 0) setMuted(false); };

  const prog   = dur ? (curTime / dur) * 100 : 0;
  const volPct = muted ? 0 : vol * 100;
  const isLiked = currentSong ? liked(currentSong.id) : false;

  // Shared audio element so it exists on every screen size (mobile hides .player but audio keeps playing)
  const audioEl = (
    <audio ref={audioRef} preload="auto"
      onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoaded}
      onCanPlay={onLoaded} onEnded={onEnded} onError={onAudioError}/>
  );

  if (!currentSong) return (
    <div className="player">
      {audioEl}
      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, gap: 10 }}>
        <span>🎵</span> Select any song to play — 100% free, full songs, no login required
      </div>
    </div>
  );

  return (
    <>
      <div className="player">
        {audioEl}

        {/* Left */}
        <div className="p-left">
          {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="p-img"/> : <div className="p-img-ph">🎵</div>}
          <div className="p-info" onClick={() => onDetails(currentSong)}>
            <h4>{currentSong.title}</h4>
            <p>{currentSong.artist}{currentSong.year ? ` • ${currentSong.year}` : ''}</p>
          </div>
          <div className="p-left-acts">
            {currentSong.offline && <span className="offline-badge">📴</span>}
            <button className={`icon-btn ${isLiked ? 'liked' : ''}`} onClick={() => toggleLike(currentSong)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Center */}
        <div className="p-center">
          <div className="p-controls">
            <button className={`ctrl-btn ${shuffle ? 'on' : ''}`} onClick={() => setShuffle(s => !s)} title="Shuffle">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
              </svg>
            </button>
            <button className="ctrl-btn" onClick={playPrev}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button className="play-btn" onClick={() => setIsPlaying(p => !p)}>
              {loading
                ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}/>
                : isPlaying
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <button className="ctrl-btn" onClick={playNext}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
            <button className={`ctrl-btn ${repeat ? 'on' : ''}`} onClick={() => setRepeat(r => !r)} title="Repeat">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </button>
            {timerRemainingActive && (
              <span className="timer-badge" title="Sleep Timer Active">⏰ {formattedTimerTime}</span>
            )}
          </div>
          <div className="prog-wrap">
            <span className="p-time">{fmt(curTime)}</span>
            <div className="prog-track" onClick={onSeek}>
              <div className="prog-fill" style={{ width: `${prog}%` }}/>
              <div className="prog-dot" style={{ left: `${prog}%` }}/>
            </div>
            <span className="p-time">{fmt(dur || currentSong.duration)}</span>
          </div>
        </div>

        {/* Right */}
        <div className="p-right">
          <button className="act-btn rt" onClick={() => onRingtone(currentSong)}>✂️ Ringtone</button>
          <button className="act-btn" onClick={() => onDownload(currentSong)}>
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>
          <div className="vol-wrap">
            <button className="ctrl-btn" onClick={() => setMuted(m => !m)}>
              {muted || vol === 0
                ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
            </button>
            <div className="vol-track" onClick={onVol}>
              <div className="vol-fill" style={{ width: `${volPct}%` }}/>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Full-screen Mobile "Now Playing" ─── */}
      <div className={`mobile-player ${mobileOpen ? 'open' : ''}`} role="dialog" aria-label="Now Playing" aria-hidden={!mobileOpen}>
        <div className="mp-header">
          <button className="mp-icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close player">
            <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <span className="mp-header-label">Now Playing</span>
          <button className="mp-icon-btn" onClick={() => { onDetails(currentSong); }} aria-label="Song details & lyrics">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>

        <div className="mp-cover-wrap">
          {currentSong.coverUrl
            ? <img src={currentSong.coverUrl} alt="" className="mp-cover"/>
            : <div className="mp-cover mp-cover-ph">🎵</div>}
        </div>

        <div className="mp-meta">
          <div className="mp-titles">
            <h2>{currentSong.title}</h2>
            <p>{currentSong.artist}</p>
          </div>
          <button className={`icon-btn ${isLiked ? 'liked' : ''}`} onClick={() => toggleLike(currentSong)} aria-label="Like">
            <svg width="26" height="26" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>

        <div className="mp-prog">
          <div className="prog-track" onClick={onSeek}>
            <div className="prog-fill" style={{ width: `${prog}%` }}/>
            <div className="prog-dot" style={{ left: `${prog}%` }}/>
          </div>
          <div className="mp-times">
            <span>{fmt(curTime)}</span>
            <span>{fmt(dur || currentSong.duration)}</span>
          </div>
        </div>

        <div className="mp-controls">
          <button className={`mp-ctrl ${shuffle ? 'on' : ''}`} onClick={() => setShuffle(s => !s)} aria-label="Shuffle">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
          </button>
          <button className="mp-ctrl" onClick={playPrev} aria-label="Previous">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button className="mp-play" onClick={() => setIsPlaying(p => !p)} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {loading
              ? <div className="spinner" style={{ width: 26, height: 26, borderWidth: 3 }}/>
              : isPlaying
                ? <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <button className="mp-ctrl" onClick={playNext} aria-label="Next">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button className={`mp-ctrl ${repeat ? 'on' : ''}`} onClick={() => setRepeat(r => !r)} aria-label="Repeat">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
        </div>

        <div className="mp-actions">
          <button className="btn-outline" onClick={() => onDownload(currentSong)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {currentSong.offline ? 'Saved' : 'Download'}
          </button>
          <button className="btn-outline" onClick={() => onRingtone(currentSong)}>✂️ Ringtone</button>
          <button className="btn-outline" onClick={() => setMuted(m => !m)} aria-label="Mute">
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {timerRemainingActive && (
          <div className="mp-timer">⏰ Sleep timer: {formattedTimerTime}</div>
        )}
      </div>
    </>
  );
}
