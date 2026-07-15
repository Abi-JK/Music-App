import React, { useState, useEffect } from 'react';
import { formatTime } from '../utils/helpers';
import { fetchLyrics, downloadAudioBlob } from '../utils/api';
import { cutAudio } from '../utils/audio';

export default function FullScreenPlayer({ 
  currentSong, 
  isPlaying, 
  setIsPlaying, 
  playNext, 
  playPrev, 
  liked, 
  toggleLike, 
  curTime, 
  dur, 
  onClose,
  showToast
}) {
  const [lyrics, setLyrics] = useState('');
  const [loadingLyrics, setLoadingLyrics] = useState(true);
  const [downloadingRingtone, setDownloadingRingtone] = useState(false);
  const [showRingtoneEditor, setShowRingtoneEditor] = useState(false);
  const [ringtoneStart, setRingtoneStart] = useState(0);

  useEffect(() => {
    if (!currentSong) return;
    setLoadingLyrics(true);
    setLyrics('');
    
    fetchLyrics(currentSong.id, currentSong.title, currentSong.artist)
      .then(text => {
        setLyrics(text || '');
        setLoadingLyrics(false);
      })
      .catch(() => setLoadingLyrics(false));
  }, [currentSong]);

  const onSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const audioEl = document.getElementById('main-audio');
    if (audioEl && dur) {
      audioEl.currentTime = pct * dur;
    }
  };

  const handleRingtoneDownload = async () => {
    if (!currentSong) return;
    setDownloadingRingtone(true);
    showToast('Cutting and preparing ringtone...');
    
    try {
      let urlToDownload = currentSong.audioUrl;
      const blob = await downloadAudioBlob(urlToDownload);
      if (!blob) throw new Error('Download failed');
      
      const ringtoneEnd = Math.min(dur, ringtoneStart + 30);
      const cutBlob = await cutAudio(blob, ringtoneStart, ringtoneEnd);
      
      const blobUrl = URL.createObjectURL(cutBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${currentSong.title} - Ringtone.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      
      showToast('✅ Ringtone downloaded! Set it in your phone Settings > Sounds.');
      setShowRingtoneEditor(false);
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to download ringtone.');
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
        <button className="icon-btn" onClick={onClose} style={{ fontSize: 24 }}>🔽</button>
        <span className="fs-header-title">Now Playing</span>
        <button className="icon-btn" style={{ visibility: 'hidden', fontSize: 24 }}>🔽</button>
      </div>

      <div className="fs-scroll-content">
        <div className="fs-main-view">
          <div className="fs-art-wrapper">
            {currentSong.coverUrl ? (
              <img src={currentSong.coverUrl.replace('150x150', '500x500')} alt="" className="fs-cover" />
            ) : (
              <div className="fs-cover fs-ph">🎵</div>
            )}
          </div>

          <div className="fs-info-row">
            <div className="fs-info-text">
              <h2 className="fs-title">{currentSong.title}</h2>
              <p className="fs-artist">{currentSong.artist}</p>
            </div>
            {toggleLike && (
              <button className="icon-btn fs-like-btn" onClick={() => toggleLike(currentSong)}>
                {isLiked ? '❤️' : '🤍'}
              </button>
            )}
          </div>

          <div className="fs-progress-wrap">
            <div className="player-progress" onClick={onSeek} style={{ height: 6, marginBottom: 8 }}>
              <div className="player-progress-bar" style={{ width: `${prog}%` }} />
            </div>
            <div className="fs-time-row">
              <span className="player-time">{formatTime(curTime)}</span>
              <span className="player-time">{formatTime(dur)}</span>
            </div>
          </div>

          <div className="fs-controls">
            <button className="icon-btn" onClick={playPrev} title="Previous" style={{ fontSize: 32 }}>⏮</button>
            <button className="player-play-btn fs-play-btn" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="icon-btn" onClick={playNext} title="Next" style={{ fontSize: 32 }}>⏭</button>
          </div>

          <div className="fs-actions">
            {!showRingtoneEditor ? (
              <button className="fs-ringtone-btn" onClick={() => { setRingtoneStart(Math.floor(curTime)); setShowRingtoneEditor(true); }}>
                🔔 Cut Ringtone
              </button>
            ) : (
              <div className="fs-ringtone-editor" style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', width: '100%', maxWidth: '350px' }}>
                <h4 style={{ color: '#fff', marginBottom: 12, fontSize: 14 }}>Ringtone Start: {formatTime(ringtoneStart)} (30s clip)</h4>
                <input 
                  type="range" 
                  min="0" 
                  max={Math.max(0, dur - 30)} 
                  value={ringtoneStart} 
                  onChange={(e) => setRingtoneStart(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: 16 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="fs-ringtone-btn" style={{ flex: 1, padding: '8px' }} onClick={handleRingtoneDownload} disabled={downloadingRingtone}>
                    {downloadingRingtone ? '⏳ Cutting...' : '📥 Download'}
                  </button>
                  <button className="fs-ringtone-btn" style={{ background: 'transparent', flex: 1, padding: '8px' }} onClick={() => setShowRingtoneEditor(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="fs-lyrics-section">
          <div className="fs-lyrics-card">
            <h3 className="fs-lyrics-title">Lyrics</h3>
            {loadingLyrics ? (
              <div className="spinner-wrap" style={{ minHeight: 100 }}>
                <div className="spinner" />
              </div>
            ) : lyrics ? (
              <pre className="lyrics-text fs-lyrics-text">{lyrics}</pre>
            ) : (
              <p className="fs-lyrics-empty">Lyrics not available for this song.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
