import React, { useRef, useState, useEffect } from 'react';
import { formatTime } from '../utils/helpers';
import { getStreamUrl } from '../utils/api';

export default function PlayerBar({ currentSong, isPlaying, setIsPlaying, playNext, playPrev, liked, toggleLike, onProgressUpdate, onShowLyrics }) {
  const audioRef = useRef(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [dur, setDur] = useState(0);
  const [curTime, setCurTime] = useState(0);
  const [vol, setVol] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevSongId = useRef(null);
  const lastProgressTick = useRef(0);

  useEffect(() => {
    if (!currentSong) return;
    if (prevSongId.current === currentSong.id) return;
    prevSongId.current = currentSong.id;

    setCurTime(0);
    setDur(0);
    setLoading(true);

    if (currentSong.audioUrl) {
      setStreamUrl(currentSong.audioUrl);
      return;
    }

    const ctrl = new AbortController();
    getStreamUrl(currentSong.id).then(u => {
      if (!ctrl.aborted) setStreamUrl(u.streamUrl || u.audioUrl);
    }).catch(() => {
      if (!ctrl.aborted) setLoading(false);
    });
    return () => ctrl.abort();
  }, [currentSong?.id]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    a.src = streamUrl;
    a.load();
    a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [streamUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    if (isPlaying) {
      a.play().catch(() => setIsPlaying(false));
    } else {
      a.pause();
    }
  }, [isPlaying, streamUrl]);

  const onTimeUpdate = () => {
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
  };
  const onEnded = () => { if (playNext) playNext(); };
  const onError = (e) => { console.error('Audio error:', e); setLoading(false); setIsPlaying(false); };
  const onCanPlay = () => { setLoading(false); };

  const toggleMute = () => {
    const a = audioRef.current;
    if (a) { a.muted = !muted; setMuted(!muted); }
  };

  const onSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audioRef.current && dur) audioRef.current.currentTime = pct * dur;
  };

  const onVol = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVol(pct);
    if (audioRef.current) audioRef.current.volume = pct;
    if (pct > 0) setMuted(false);
  };

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
      <audio ref={audioRef} onTimeUpdate={onTimeUpdate} onEnded={onEnded} onError={onError} onCanPlay={onCanPlay} preload="auto" />
      <div className="player-inner">
        <div className="player-song">
          {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="player-cover" /> : <div className="player-cover player-ph">🎵</div>}
          <div className="player-song-info">
            <div className="player-title">{currentSong.title}</div>
            <div className="player-artist">{currentSong.artist}</div>
          </div>
          {toggleLike && (
            <button className="icon-btn" onClick={() => toggleLike(currentSong)} title="Like">
              {isLiked ? '❤️' : '🤍'}
            </button>
          )}
          {onShowLyrics && (
            <button className="icon-btn" onClick={() => onShowLyrics()} title="Lyrics" style={{ fontSize: 14 }}>
              📝
            </button>
          )}
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className="icon-btn" onClick={playPrev} title="Previous">⏮</button>
            <button className="player-play-btn" onClick={() => setIsPlaying(!isPlaying)} disabled={loading}>
              {loading ? '⏳' : isPlaying ? '⏸' : '▶'}
            </button>
            <button className="icon-btn" onClick={playNext} title="Next">⏭</button>
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
          <button className="icon-btn" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
          <div className="player-vol-wrap" onClick={onVol}>
            <div className="player-vol-bar" style={{ width: `${muted ? 0 : vol * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
