import React, { useRef, useState, useEffect } from 'react';
import { fmt } from '../utils/helpers';
import { getStreamUrl } from '../utils/api';

const MAX_SKIP_COUNT = 3;

export default function PlayerBar({ 
  currentSong, isPlaying, setIsPlaying, playNext, playPrev,
  liked, toggleLike, onRingtone, onDetails, showToast, shuffle, setShuffle,
  onDownload, timerRemainingActive, formattedTimerTime,
  queue, onRemoveFromQueue, onPlaySimilar
}) {
  const audioRef    = useRef(null);
  const abortRef    = useRef(null);
  const skipCountRef = useRef(0);
  const retryCountRef = useRef(0);
  const [curTime, setCurTime] = useState(0);
  const [dur,     setDur]     = useState(0);
  const [vol,     setVol]     = useState(0.85);
  const [muted,   setMuted]   = useState(false);
  const [repeat,  setRepeat]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const [showQueue, setShowQueue] = useState(false);

  // KEY: Resolve a fresh signed stream URL every time the song changes
  useEffect(() => {
    if (!currentSong) { setStreamUrl(null); return; }

    // Cancel any in-flight request from previous song
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // Reset retry counter on deliberate song change
    retryCountRef.current = 0;

    // Offline song → use blob URL directly
    if (currentSong.localUrl) {
      setStreamUrl(currentSong.localUrl);
      setLoading(false);
      return;
    }

    // Online song → fetch fresh signed token URL
    setStreamUrl(null);
    setLoading(true);
    showToast(`▶️ Loading: ${currentSong.title}...`);

    const doFetch = () => {
      getStreamUrl(currentSong.id, ac.signal)
        .then(fresh => {
          if (ac.signal.aborted) return;
          setStreamUrl(fresh.streamUrl);
        })
        .catch(err => {
          if (ac.signal.aborted) return;
          console.error('getStreamUrl error:', err);
          if (retryCountRef.current < 2) {
            retryCountRef.current++;
            showToast(`▶️ Retrying (${retryCountRef.current}/2)...`);
            setTimeout(doFetch, 1000);
          } else {
            setLoading(false);
            setIsPlaying(false);
            showToast('⚠️ Could not load stream. Try again.');
          }
        });
    };
    doFetch();

    return () => { ac.abort(); if (abortRef.current === ac) abortRef.current = null; };
  }, [currentSong?.id, currentSong?.localUrl]); // eslint-disable-line

  // Load audio element whenever streamUrl changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    setCurTime(0); setDur(0); setLoading(true);
    a.src = streamUrl;
    a.load();
    // Safety timeout: reset loading if audio events never fire (e.g. network stuck)
    const t = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(t);
  }, [streamUrl]);

  // Play / pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    if (isPlaying) {
      const tryPlay = () => {
        a.play()
          .then(() => { setLoading(false); skipCountRef.current = 0; })
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

  // Wake Lock: prevent device sleep during playback
  useEffect(() => {
    let wakeLock = null;
    if (!isPlaying || !('wakeLock' in navigator)) {
      if (wakeLock) { wakeLock.release(); wakeLock = null; }
      return;
    }
    navigator.wakeLock.request('screen').then(wl => {
      wakeLock = wl;
      wl.addEventListener('release', () => { wakeLock = null; });
    }).catch(() => {});
    return () => { if (wakeLock) wakeLock.release(); };
  }, [isPlaying]);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && isPlaying && 'wakeLock' in navigator) {
        navigator.wakeLock.request('screen').catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isPlaying]);

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
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (audioRef.current && d.seekTime != null) audioRef.current.currentTime = d.seekTime;
    });
  }, [currentSong?.id, playNext, playPrev, setIsPlaying]);

  // Report playback position to Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator) || !dur) return;
    setInterval(() => {
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: 1,
        position: audioRef.current?.currentTime || 0,
      });
    }, 1000);
  }, [dur]);

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
    skipCountRef.current += 1;
    if (skipCountRef.current > MAX_SKIP_COUNT) {
      showToast('⚠️ Too many consecutive errors. Stopping.');
      setIsPlaying(false);
      skipCountRef.current = 0;
    } else if (currentSong && !currentSong.localUrl) {
      showToast(`⚠️ Stream error — trying next song (${skipCountRef.current}/${MAX_SKIP_COUNT})...`);
      setTimeout(playNext, 1200);
    } else {
      setIsPlaying(false);
      showToast('⚠️ Playback error.');
    }
  };
  const onEnded = () => { if (repeat && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } else playNext(); };
  const getPos = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
  };
  const onSeek  = e => { const pct = getPos(e); if (audioRef.current && dur) audioRef.current.currentTime = pct * dur; };
  const onVol   = e => { const pct = getPos(e); setVol(pct); if (pct > 0) setMuted(false); };

  const prog   = dur ? (curTime / dur) * 100 : 0;
  const volPct = muted ? 0 : vol * 100;
  const isLiked = currentSong ? liked(currentSong.id) : false;

  if (!currentSong) return (
    <div className="player">
      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, gap: 10 }}>
        <span>🎵</span> Select any song to play — 100% free, full songs, no login required
      </div>
    </div>
  );

  return (
    <div className="player">
      <audio ref={audioRef} preload="auto"
        onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoaded}
        onCanPlay={onLoaded} onEnded={onEnded} onError={onAudioError}/>

      {/* Left */}
      <div className="p-left">
        {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="p-img"/> : <div className="p-img-ph">🎵</div>}
        <div className="p-info" onClick={() => onDetails(currentSong)}>
          <h4>{currentSong.title}</h4>
          <p>{currentSong.artist}{currentSong.year ? ` • ${currentSong.year}` : ''}</p>
        </div>
        <div className="p-left-acts">
          {currentSong.offline && <span className="offline-badge">📴</span>}
          {onPlaySimilar && (
            <button className="icon-btn" onClick={() => onPlaySimilar(currentSong)} title="Play Similar Songs">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </button>
          )}
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
          <div className="prog-track" onClick={onSeek} onTouchStart={onSeek} onTouchMove={onSeek}>
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
        <div className="queue-wrap">
          <button className={`ctrl-btn queue-btn ${showQueue ? 'on' : ''} ${queue?.length > 0 ? 'has-items' : ''}`}
            onClick={() => setShowQueue(s => !s)} title="Queue">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            {queue?.length > 0 && <span className="queue-badge">{queue.length}</span>}
          </button>
          {showQueue && (
            <div className="queue-dropdown">
              <div className="queue-dropdown-header">
                <span>Up Next ({queue?.length || 0})</span>
                <button className="clear-btn" onClick={() => setShowQueue(false)}>✕</button>
              </div>
              {(!queue || queue.length === 0) ? (
                <div className="queue-empty">Queue is empty</div>
              ) : (
                queue.map((song, i) => (
                  <div key={song.id + i} className="queue-item">
                    {song.coverUrl ? <img src={song.coverUrl} alt=""/> : <div className="q-ph">🎵</div>}
                    <div className="queue-item-info">
                      <span className="queue-item-title">{song.title}</span>
                      <span className="queue-item-artist">{song.artist}</span>
                    </div>
                    <button className="queue-remove-btn"
                      onClick={() => onRemoveFromQueue(i)} title="Remove">✕</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="vol-wrap">
          <button className="ctrl-btn" onClick={() => setMuted(m => !m)}>
            {muted || vol === 0
              ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
          </button>
          <div className="vol-track" onClick={onVol} onTouchStart={onVol} onTouchMove={onVol}>
            <div className="vol-fill" style={{ width: `${volPct}%` }}/>
          </div>
        </div>
      </div>
    </div>
  );
}
