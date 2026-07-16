import React, { useState, useEffect } from 'react';
import { formatTime } from '../utils/helpers';
import { fetchLyrics, downloadAudioBlob } from '../utils/api';
import { cutAudio } from '../utils/audio';

export default function FullScreenPlayer({
  currentSong, isPlaying, setIsPlaying, playNext, playPrev,
  liked, toggleLike, curTime, dur, onClose, showToast,
  repeatMode, toggleRepeat, shuffleOn, toggleShuffle,
  playlist, currentIndex, playSong, onShowQueue
}) {
  const [lyrics, setLyrics] = useState('');
  const [loadingLyrics, setLoadingLyrics] = useState(true);
  const [activeTab, setActiveTab] = useState('lyrics');
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
    showToast('Cutting and preparing ringtone...');
    try {
      let blob = null;
      const urlsToTry = [currentSong.audioUrl, ...(currentSong.allAudioUrls || []).map(u => u.url)].filter(Boolean);
      for (const url of urlsToTry) {
        try { blob = await downloadAudioBlob(url); if (blob && blob.size > 0) break; } catch { /* next */ }
      }
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
      showToast('Ringtone downloaded! Set it in phone Settings > Sounds.');
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
  const upcoming = playlist ? playlist.slice(currentIndex + 1, currentIndex + 21) : [];

  return (
    <div className="fullscreen-player">
      <div className="fs-header">
        <button className="icon-btn" onClick={onClose} style={{ fontSize: 22 }}>▼</button>
        <span className="fs-header-title">Now Playing</span>
        <button className="icon-btn" onClick={onShowQueue} style={{ fontSize: 18 }} title="Queue">☰</button>
      </div>

      <div className="fs-body">
        {/* LEFT: Cover + Info + Controls */}
        <div className="fs-left">
          <div className="fs-art-wrap">
            {currentSong.coverUrl ? (
              <img src={currentSong.coverUrl.replace('150x150', '500x500')} alt="" className="fs-cover" />
            ) : (
              <div className="fs-cover fs-ph">🎵</div>
            )}
          </div>

          <div className="fs-song-info">
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
                  <span>Start: {formatTime(ringtoneStart)} · 30s clip</span>
                  <button className="icon-btn" onClick={() => setShowRingtoneEditor(false)} style={{ fontSize: 14 }}>✕</button>
                </div>
                <input type="range" min="0" max={Math.max(0, dur - 30)} value={ringtoneStart}
                  onChange={(e) => setRingtoneStart(Number(e.target.value))} className="fs-ringtone-slider" />
                <button className="fs-ringtone-btn" onClick={handleRingtoneDownload} disabled={downloadingRingtone} style={{ width: '100%' }}>
                  {downloadingRingtone ? '⏳ Cutting...' : '📥 Download Ringtone'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Lyrics + Queue */}
        <div className="fs-right">
          <div className="fs-tabs">
            <button className={`fs-tab ${activeTab === 'lyrics' ? 'active' : ''}`} onClick={() => setActiveTab('lyrics')}>Lyrics</button>
            <button className={`fs-tab ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>Queue</button>
          </div>

          {activeTab === 'lyrics' && (
            <div className="fs-panel">
              {loadingLyrics ? (
                <div className="spinner-wrap" style={{ minHeight: 200 }}>
                  <div className="spinner" />
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Searching for lyrics...</p>
                </div>
              ) : lyrics ? (
                <pre className="fs-lyrics-text">{lyrics}</pre>
              ) : (
                <div className="empty" style={{ minHeight: 200 }}>
                  <p style={{ fontSize: 36 }}>📝</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Lyrics not available for this song.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="fs-panel">
              {currentSong && (
                <div className="fs-queue-section">
                  <div className="fs-queue-label">Now Playing</div>
                  <div className="fs-queue-item active">
                    {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="fs-queue-cover" /> : <div className="fs-queue-cover fs-queue-ph">🎵</div>}
                    <div className="fs-queue-text">
                      <h4>{currentSong.title}</h4>
                      <p>{currentSong.artist}</p>
                    </div>
                    <span className="fs-queue-dur">{formatTime(currentSong.duration)}</span>
                  </div>
                </div>
              )}
              {upcoming.length > 0 && (
                <div className="fs-queue-section">
                  <div className="fs-queue-label">Up Next ({upcoming.length})</div>
                  {upcoming.map((song, i) => (
                    <div key={song.id} className="fs-queue-item" onClick={() => playSong(song, playlist, currentIndex + 1 + i)}>
                      {song.coverUrl ? <img src={song.coverUrl} alt="" className="fs-queue-cover" /> : <div className="fs-queue-cover fs-queue-ph">🎵</div>}
                      <div className="fs-queue-text">
                        <h4>{song.title}</h4>
                        <p>{song.artist}</p>
                      </div>
                      <span className="fs-queue-dur">{formatTime(song.duration)}</span>
                    </div>
                  ))}
                </div>
              )}
              {upcoming.length === 0 && (
                <div className="empty" style={{ minHeight: 150 }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No more songs in queue</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
