import React, { useRef, useState, useEffect, useCallback } from 'react';
import { formatTime } from '../utils/helpers';

const MAX_RETRIES = 5;

export default function PlayerBar({ currentSong, isPlaying, setIsPlaying, playNext, playPrev, liked, toggleLike, onProgressUpdate, onExpand, onShowLyrics, repeatMode, toggleRepeat, shuffleOn, toggleShuffle, onShowQueue }) {
  const audioRef = useRef(null);
  const [dur, setDur] = useState(0);
  const [curTime, setCurTime] = useState(0);
  const [vol, setVol] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const prevSongId = useRef(null);
  const lastProgressTick = useRef(0);
  const retryCount = useRef(0);
  const urlAttempts = useRef([]);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!currentSong) {
      prevSongId.current = null;
      const a = audioRef.current;
      if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
      setDur(0);
      setCurTime(0);
      setLoading(false);
      setErrorMsg('');
      return;
    }
    if (prevSongId.current === currentSong.id) return;
    prevSongId.current = currentSong.id;

    setCurTime(0);
    setDur(0);
    setLoading(true);
    setErrorMsg('');
    retryCount.current = 0;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const candidates = [];

    if (currentSong.audioBlob) {
      candidates.push({ type: 'blob', url: URL.createObjectURL(currentSong.audioBlob) });
    }

    if (currentSong.audioUrl) {
      candidates.push({ type: 'primary', url: currentSong.audioUrl });
    }

    if (currentSong.allAudioUrls) {
      for (const entry of currentSong.allAudioUrls) {
        if (entry.url && !candidates.some(c => c.url === entry.url)) {
          candidates.push({ type: 'fallback', url: entry.url });
        }
      }
    }

    if (currentSong.id) {
      const host = 'https://discoveryprovider.audius.co';
      candidates.push({ type: 'constructed', url: `${host}/v1/tracks/${currentSong.id}/stream?app_name=SoundAura` });
    }

    urlAttempts.current = candidates;
    tryNextUrl();
  }, [currentSong?.id]);

  const tryNextUrl = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;

    if (urlAttempts.current.length === 0) {
      setLoading(false);
      setIsPlaying(false);
      setErrorMsg('Playback failed — try another song');
      return;
    }

    const candidate = urlAttempts.current.shift();
    a.src = candidate.url;
    a.load();
  }, [setIsPlaying]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || urlAttempts.current.length === 0) return;

    const onError = () => {
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        console.log(`[SoundAura] Audio error, trying next URL (${retryCount.current}/${MAX_RETRIES})...`);
        tryNextUrl();
      } else {
        setLoading(false);
        setIsPlaying(false);
        setErrorMsg('Playback failed — try another song');
      }
    };

    const onCanPlay = () => {
      setLoading(false);
      setErrorMsg('');
      const playPromise = a.play();
      if (playPromise) {
        playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    };

    a.addEventListener('error', onError);
    a.addEventListener('canplay', onCanPlay);
    return () => {
      a.removeEventListener('error', onError);
      a.removeEventListener('canplay', onCanPlay);
    };
  }, [currentSong?.id, tryNextUrl, setIsPlaying]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.play().catch(() => setIsPlaying(false));
    } else {
      a.pause();
    }
  }, [isPlaying]);

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      const ct = a.currentTime;
      const d = a.duration || 0;
      setCurTime(ct);
      setDur(d);
      const now = performance.now();
      if (onProgressUpdate && now - lastProgressTick.current > 300) {
        lastProgressTick.current = now;
        onProgressUpdate(ct, d);
      }
    }
  }, [onProgressUpdate]);

  const onEnded = useCallback(() => { if (playNext) playNext(); }, [playNext]);

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
      <audio ref={audioRef} />
      <div className="player-empty">🎵 Select any song to play — 100% free, no login required</div>
    </div>
  );

  const prog = dur ? (curTime / dur) * 100 : 0;
  const isLiked = liked ? liked(currentSong.id) : false;

  return (
    <div className="player">
      <audio id="main-audio" ref={audioRef} onTimeUpdate={onTimeUpdate} onEnded={onEnded} preload="auto" />
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
            <button className="player-play-btn" onClick={() => setIsPlaying(!isPlaying)} disabled={loading}>
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
