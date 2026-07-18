import React, { useRef, useState, useEffect, useCallback } from 'react';
import { formatTime } from '../utils/helpers';
import { refreshSongUrl } from '../utils/api';

export default function PlayerBar({ currentSong, isPlaying, setIsPlaying, playNext, playPrev, liked, toggleLike, onProgressUpdate, onExpand, onShowLyrics, repeatMode, toggleRepeat, shuffleOn, toggleShuffle, onShowQueue, downloadSong, currentSongDownloaded }) {
  const audioRef = useRef(null);
  const [dur, setDur] = useState(0);
  const [curTime, setCurTime] = useState(0);
  const [vol, setVol] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const prevSongId = useRef(null);
  const lastProgressTick = useRef(0);
  const urlIndex = useRef(0);
  const urlList = useRef([]);
  const blobUrls = useRef([]);
  const playNextRef = useRef(playNext);
  const playPrevRef = useRef(playPrev);
  const endedGuard = useRef(false);
  const volRef = useRef(vol);
  const isPlayingRef = useRef(isPlaying);
  const errorRetryCount = useRef(0);
  const retryTimerRef = useRef(null);

  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { playPrevRef.current = playPrev; }, [playPrev]);
  useEffect(() => { volRef.current = vol; }, [vol]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => {
      const a = audioRef.current;
      if (a && a.src && a.paused && !a.ended) {
        a.play().then(() => setIsPlaying(true)).catch(() => {});
      } else {
        setIsPlaying(true);
      }
    });
    navigator.mediaSession.setActionHandler('pause', () => { setIsPlaying(false); });
    navigator.mediaSession.setActionHandler('previoustrack', () => { if (playPrevRef.current) playPrevRef.current(); });
    navigator.mediaSession.setActionHandler('nexttrack', () => { if (playNextRef.current) playNextRef.current(); });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const a = audioRef.current;
      if (a) a.currentTime = Math.max(0, a.currentTime - (details.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const a = audioRef.current;
      if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + (details.seekOffset || 10));
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      const a = audioRef.current;
      if (a && details.seekTime != null) a.currentTime = details.seekTime;
    });
    return () => {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('seekbackward', null);
          navigator.mediaSession.setActionHandler('seekforward', null);
          navigator.mediaSession.setActionHandler('seekto', null);
        } catch {}
      }
    };
  }, [setIsPlaying]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onPlay = () => {
      if (!isPlayingRef.current) setIsPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      errorRetryCount.current = 0;
      setLoading(false);
      setErrorMsg('');
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    };

    const onPause = () => {
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    };

    const onError = () => {
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }

      const tryNextUrl = () => {
        const next = urlIndex.current + 1;
        if (next < urlList.current.length) {
          const candidate = urlList.current[next];
          urlIndex.current = next;
          a.src = candidate.url;
          a.volume = volRef.current;
          a.load();
        } else {
          errorRetryCount.current++;
          if (errorRetryCount.current < 3) {
            setLoading(true);
            setErrorMsg('Refreshing URL...');
            refreshSongUrl(currentSong).then(fresh => {
              if (fresh && fresh.audioUrl) {
                const newCandidates = [];
                if (fresh.audioUrl) newCandidates.push({ url: fresh.audioUrl, type: 'refreshed' });
                if (fresh.allAudioUrls) {
                  for (const entry of fresh.allAudioUrls) {
                    if (entry.url && !newCandidates.some(c => c.url === entry.url)) {
                      newCandidates.push({ url: entry.url, type: entry.quality || 'fallback' });
                    }
                  }
                }
                urlList.current = newCandidates;
                urlIndex.current = 0;
                if (newCandidates.length > 0) {
                  a.src = newCandidates[0].url;
                  a.volume = volRef.current;
                  a.load();
                  return;
                }
              }
              setLoading(false);
              setErrorMsg('Could not play. Retrying in 5s...');
              retryTimerRef.current = setTimeout(() => { errorRetryCount.current = 0; tryNextUrl(); }, 5000);
            }).catch(() => {
              setLoading(false);
              setErrorMsg('Could not play. Retrying in 5s...');
              retryTimerRef.current = setTimeout(() => { errorRetryCount.current = 0; tryNextUrl(); }, 5000);
            });
          } else {
            setLoading(false);
            setErrorMsg('Could not play. Next song...');
            errorRetryCount.current = 0;
            setTimeout(() => { if (playNextRef.current) playNextRef.current(); }, 1500);
          }
        }
      };
      tryNextUrl();
    };

    const onCanPlay = () => {
      setLoading(false); setErrorMsg('');
      endedGuard.current = false;
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      errorRetryCount.current = 0;
      const playPromise = a.play();
      if (playPromise) {
        playPromise.then(() => {
          setIsPlaying(true);
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }).catch(() => {
          setErrorMsg('Tap play to start');
        });
      }
    };

    const onEnded = () => {
      if (endedGuard.current) return;
      endedGuard.current = true;
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      if (playNextRef.current) playNextRef.current();
    };

    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('error', onError);
    a.addEventListener('canplay', onCanPlay);
    a.addEventListener('ended', onEnded);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('error', onError);
      a.removeEventListener('canplay', onCanPlay);
      a.removeEventListener('ended', onEnded);
    };
  }, [currentSong?.id, setIsPlaying]);

  useEffect(() => {
    if (!currentSong) {
      prevSongId.current = null;
      const a = audioRef.current;
      if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
      blobUrls.current.forEach(u => URL.revokeObjectURL(u));
      blobUrls.current = [];
      setDur(0); setCurTime(0); setLoading(false); setErrorMsg('');
      if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      }
      return;
    }
    if (prevSongId.current === currentSong.id) return;
    prevSongId.current = currentSong.id;
    setCurTime(0); setDur(0); setLoading(true); setErrorMsg('');
    urlIndex.current = 0;
    blobUrls.current.forEach(u => URL.revokeObjectURL(u));
    blobUrls.current = [];
    endedGuard.current = false;
    errorRetryCount.current = 0;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }

    const a = audioRef.current;
    if (a) { a.pause(); a.removeAttribute('src'); }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown',
        artist: currentSong.artist || 'Unknown Artist',
        album: currentSong.album || 'SoundAura',
        artwork: currentSong.coverUrl ? [
          { src: currentSong.coverUrl, sizes: '512x512', type: 'image/jpeg' },
          { src: currentSong.coverUrl, sizes: '256x256', type: 'image/jpeg' },
        ] : [],
      });
    }

    const candidates = [];
    if (currentSong.audioBlob) {
      const blobUrl = URL.createObjectURL(currentSong.audioBlob);
      candidates.push({ url: blobUrl, type: 'blob' });
      blobUrls.current.push(blobUrl);
    }
    if (currentSong.audioUrl) {
      candidates.push({ url: currentSong.audioUrl, type: 'primary' });
    }
    if (currentSong.allAudioUrls) {
      for (const entry of currentSong.allAudioUrls) {
        if (entry.url && !candidates.some(c => c.url === entry.url)) {
          candidates.push({ url: entry.url, type: entry.quality || 'fallback' });
        }
      }
    }

    urlList.current = candidates;
    if (candidates.length > 0) {
      const candidate = candidates[0];
      urlIndex.current = 0;
      a.src = candidate.url;
      a.volume = volRef.current;
      a.load();
    } else {
      setLoading(false);
      setErrorMsg('No playable URL found');
    }
  }, [currentSong?.id]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      const playPromise = a.play();
      if (playPromise) {
        playPromise.then(() => {
          if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        }).catch(() => {
          setErrorMsg('Tap play to start');
        });
      }
    } else {
      if (!a.paused) a.pause();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
  }, [isPlaying]);

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      const ct = a.currentTime;
      const d = a.duration || 0;
      setCurTime(ct);
      setDur(d);
      if ('mediaSession' in navigator && d > 0 && !isNaN(d)) {
        try {
          navigator.mediaSession.setPositionState({ duration: d, playbackRate: 1, position: ct });
        } catch {}
      }
      const now = performance.now();
      if (onProgressUpdate && now - lastProgressTick.current > 300) {
        lastProgressTick.current = now;
        onProgressUpdate(ct, d);
      }
    }
  }, [onProgressUpdate]);

  const toggleMute = useCallback(() => {
    const a = audioRef.current;
    if (a) { a.muted = !muted; setMuted(!muted); }
  }, [muted]);

  const onSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current && dur) audioRef.current.currentTime = pct * dur;
  }, [dur]);

  const onVol = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVol(pct);
    if (audioRef.current) audioRef.current.volume = pct;
    if (pct > 0) setMuted(false);
  }, []);

  if (!currentSong) return (
    <div className="player">
      <audio ref={audioRef} referrerpolicy="no-referrer" />
      <div className="player-empty">🎵 Select any song to play — 100% free, no login required</div>
    </div>
  );

  const prog = dur ? (curTime / dur) * 100 : 0;
  const isLiked = liked ? liked(currentSong.id) : false;

  return (
    <div className="player">
      <audio id="main-audio" ref={audioRef} onTimeUpdate={onTimeUpdate} preload="auto" referrerpolicy="no-referrer" />
      <div className="player-inner">
        <div className="player-song">
          {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="player-cover" onClick={onExpand} style={{ cursor: 'pointer' }} /> : <div className="player-cover player-ph" onClick={onExpand} style={{ cursor: 'pointer' }}>🎵</div>}
          <div className="player-song-info" onClick={onExpand} style={{ cursor: 'pointer' }}>
            <div className="player-title">{currentSong.title}</div>
            <div className="player-artist">{errorMsg || currentSong.artist}</div>
          </div>
          {toggleLike && (
            <button className="icon-btn" onClick={() => toggleLike(currentSong)} title="Like">
              {isLiked ? '❤️' : '🤍'}
            </button>
          )}
          {downloadSong && (
            <button
              className="icon-btn"
              onClick={() => { if (!currentSongDownloaded) downloadSong(currentSong); }}
              title={currentSongDownloaded ? 'Downloaded' : 'Download for offline'}
              disabled={currentSongDownloaded}
              style={{ opacity: currentSongDownloaded ? 0.5 : 1 }}
            >
              {currentSongDownloaded ? '✅' : '📥'}
            </button>
          )}
          {onExpand && (
            <button className="icon-btn" onClick={onExpand} title="Expand Player">⛶</button>
          )}
          {onShowLyrics && (
            <button className="icon-btn" onClick={onShowLyrics} title="Lyrics">📝</button>
          )}
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className={`icon-btn ${shuffleOn ? 'ctrl-active' : ''}`} onClick={toggleShuffle} title={shuffleOn ? 'Shuffle On' : 'Shuffle Off'}>🔀</button>
            <button className="icon-btn" onClick={playPrev} title="Previous">⏮</button>
            <button className="player-play-btn" onClick={() => {
              const a = audioRef.current;
              if (a && !a.paused) {
                setIsPlaying(false);
              } else if (a && a.src && a.paused && !a.ended) {
                a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(true));
              } else {
                setIsPlaying(!isPlaying);
              }
            }} disabled={loading}>
              {loading ? '⏳' : isPlaying ? '⏸' : '▶'}
            </button>
            <button className="icon-btn" onClick={playNext} title="Next">⏭</button>
            <button className={`icon-btn ${repeatMode !== 'off' ? 'ctrl-active' : ''}`} onClick={toggleRepeat} title={`Repeat: ${repeatMode}`}>
              {repeatMode === 'one' ? '🔂' : '🔁'}
            </button>
          </div>
          <div className="player-progress-wrap">
            <span className="player-time">{formatTime(curTime)}</span>
            <div className="player-progress" onClick={onSeek}>
              <div className="player-progress-bar" style={{ width: `${prog}%` }} />
            </div>
            <span className="player-time">{formatTime(dur)}</span>
          </div>
        </div>

        <div className="player-right">
          {onShowQueue && (
            <button className="icon-btn" onClick={onShowQueue} title="Play Queue">📋</button>
          )}
          <button className="icon-btn" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
          <div className="player-vol-wrap" onClick={onVol}>
            <div className="player-vol-bar" style={{ width: `${muted ? 0 : vol * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
