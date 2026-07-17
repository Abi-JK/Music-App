import React, { useState, useEffect } from 'react';
import { formatTime } from '../utils/helpers';
import { fetchLyrics, downloadAudioBlob } from '../utils/api';
import { cutAudio } from '../utils/audio';

export default function FullScreenPlayer({
  currentSong, isPlaying, setIsPlaying, playNext, playPrev,
  liked, toggleLike, curTime, dur, onClose, showToast,
  repeatMode, toggleRepeat, shuffleOn, toggleShuffle, onShowQueue
}) {
  const [lyrics, setLyrics] = useState('');
  const [loadingLyrics, setLoadingLyrics] = useState(true);
  const [downloadingRingtone, setDownloadingRingtone] = useState(false);
  const [showRingtoneEditor, setShowRingtoneEditor] = useState(false);
  const [ringtoneStart, setRingtoneStart] = useState(0);

  useEffect(() => {
    if (!currentSong) return;
    let cancelled = false;
    setLoadingLyrics(true);
    setLyrics('');
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
    const lyricsPromise = fetchLyrics(currentSong.id, currentSong.title, currentSong.artist);
    Promise.race([lyricsPromise, timeout]).then(text => {
      if (!cancelled) { setLyrics(text || ''); setLoadingLyrics(false); }
    }).catch(() => { if (!cancelled) setLoadingLyrics(false); });
    return () => { cancelled = true; };
  }, [currentSong]);

  const onSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const audioEl = document.getElementById('main-audio');
    if (audioEl && dur) audioEl.currentTime = pct * dur;
  };

  const handleRingtoneDownload = async () => {
    if (!currentSong) return;
    setDownloadingRingtone(true);
    showToast('Cutting ringtone...');
    try {
      let blob = null;
      const urls = [currentSong.audioUrl, ...(currentSong.allAudioUrls || []).map(u => u.url)].filter(Boolean);
      for (const url of urls) {
        try { blob = await downloadAudioBlob(url); if (blob && blob.size > 0) break; } catch { /* next */ }
      }
      if (!blob) throw new Error('Download failed');
      const end = Math.min(dur, ringtoneStart + 30);
      const cutBlob = await cutAudio(blob, ringtoneStart, end);
      const blobUrl = URL.createObjectURL(cutBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${currentSong.title} - Ringtone.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast('Ringtone downloaded!');
      setShowRingtoneEditor(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to download ringtone.');
    } finally {
      setDownloadingRingtone(false);
    }
  };

  if (!currentSong) return null;

  const prog = dur ? (curTime / dur) * 100 : 0;
  const isLiked = liked ? liked(currentSong.id) : false;

  return (
    <div className="fullscreen-player">
      <div className="fs-header">
        <button className="icon-btn" onClick={onClose} style={{ fontSize: 22 }}>▼</button>
        <span className="fs-header-title">Now Playing</span>
        {onShowQueue && <button className="icon-btn" onClick={onShowQueue} style={{ fontSize: 18 }} title="Queue">☰</button>}
      </div>
      <div className="fs-scroll-content">
        <div className="fs-main-view">
          <div className="fs-art-wrapper">
            {currentSong.coverUrl ? (
              <img src={currentSong.coverUrl.includes('150x150') ? currentSong.coverUrl.replace('150x150', '500x500') : currentSong.coverUrl} alt="" className="fs-cover" />
            ) : (
              <div className="fs-cover fs-ph">🎵</div>
            )}
          </div>
          <div className="fs-info-row">
            <div className="fs-text">
              <h2 className="fs-title">{currentSong.title}</h2>
              <p className="fs-artist">{currentSong.artist}</p>
            </div>
            {toggleLike && (
              <button className="icon-btn" onClick={() => toggleLike(currentSong)} style={{ fontSize: 22 }}>
                {isLiked ? '❤️' : '🤍'}
              </button>
            )}
          </div>
          <div className="fs-progress-wrap">
            <div className="player-progress" onClick={onSeek} style={{ height: 5 }}>
              <div className="player-progress-bar" style={{ width: `${prog}%` }} />
            </div>
            <div className="fs-time-row">
              <span>{formatTime(curTime)}</span>
              <span>{formatTime(dur)}</span>
            </div>
          </div>
          <div className="fs-controls">
            <button className={`icon-btn ${shuffleOn ? 'ctrl-active' : ''}`} onClick={toggleShuffle} style={{ fontSize: 22 }}>⇄</button>
            <button className="icon-btn" onClick={playPrev} style={{ fontSize: 28 }}>⏮</button>
            <button className="player-play-btn fs-play-btn" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="icon-btn" onClick={playNext} style={{ fontSize: 28 }}>⏭</button>
            <button className={`icon-btn ${repeatMode !== 'off' ? 'ctrl-active' : ''}`} onClick={toggleRepeat} style={{ fontSize: 22 }}>
              {repeatMode === 'one' ? '🔂' : '🔁'}
            </button>
          </div>
          <div className="fs-ringtone-wrap">
            {!showRingtoneEditor ? (
              <button className="fs-ringtone-btn" onClick={() => { setRingtoneStart(Math.floor(curTime)); setShowRingtoneEditor(true); }}>
                ✂ Cut Ringtone
              </button>
            ) : (
              <div className="fs-ringtone-editor">
                <div className="fs-ringtone-header">
                  <span>{dur <= 35 ? 'Full track (30s preview)' : `Start: ${formatTime(ringtoneStart)} · 30s clip`}</span>
                  <button className="icon-btn" onClick={() => setShowRingtoneEditor(false)} style={{ fontSize: 14 }}>✕</button>
                </div>
                {dur > 35 && (
                  <input type="range" min="0" max={Math.max(0, dur - 30)} value={ringtoneStart}
                    onChange={(e) => setRingtoneStart(Number(e.target.value))} className="fs-ringtone-slider" />
                )}
                <button className="fs-ringtone-btn" onClick={handleRingtoneDownload} disabled={downloadingRingtone} style={{ width: '100%' }}>
                  {downloadingRingtone ? '⏳ Cutting...' : '📥 Download Ringtone'}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="fs-lyrics-section">
          <div className="fs-lyrics-card">
            <h3 className="fs-lyrics-title">Lyrics</h3>
            {loadingLyrics ? (
              <div className="spinner-wrap" style={{ minHeight: 150 }}><div className="spinner" /></div>
            ) : lyrics ? (
              <pre className="fs-lyrics-text">{lyrics}</pre>
            ) : (
              <p className="fs-lyrics-empty">Lyrics not available for this song.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
