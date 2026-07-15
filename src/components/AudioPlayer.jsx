import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

export default function AudioPlayer({ currentTrack, onNext, onPrev }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 1;
      setProgress((current / total) * 100);
    }
  };

  if (!currentTrack) return null;

  return (
    <div style={styles.container}>
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={onNext}
      />
      <div style={styles.progressBarContainer}>
        <div style={{ ...styles.progressBar, width: `${progress}%` }} />
      </div>
      <div style={styles.infoControls}>
        <div style={styles.trackInfo}>
          <span style={styles.title}>{currentTrack.title}</span>
          <span style={styles.artist}>{currentTrack.artist}</span>
        </div>
        <div style={styles.controls}>
          <button onClick={onPrev} style={styles.iconBtn}>
            <SkipBack size={20} color="#fff" />
          </button>
          <button onClick={togglePlay} style={styles.playBtn}>
            {isPlaying ? <Pause size={20} color="#121212" /> : <Play size={20} color="#121212" />}
          </button>
          <button onClick={onNext} style={styles.iconBtn}>
            <SkipForward size={20} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '70px',
    left: '10px',
    right: '10px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '10px',
    boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', sans-serif"
  },
  progressBarContainer: {
    width: '100%',
    height: '4px',
    backgroundColor: '#334155',
    borderRadius: '2px',
    marginBottom: '8px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00d4e8',
    transition: 'width 0.1s linear'
  },
  infoControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  trackInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: 1,
    marginRight: '10px'
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  artist: {
    color: '#aaa',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0
  },
  playBtn: {
    backgroundColor: '#00d4e8',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  }
};
