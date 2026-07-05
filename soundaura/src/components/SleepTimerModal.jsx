import React from 'react';
import { SLEEP_TIMER_OPTIONS } from '../utils/constants';

export default function SleepTimerModal({ isOpen, onClose, timerActive, startTimer, cancelTimer, formatRemaining }) {
  if (!isOpen) return null;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>⏰ Sleep Timer</h3>
        <p>Set a countdown timer to automatically pause playback.</p>
        
        {timerActive ? (
          <div className="timer-status">
            <div className="timer-remaining">
              Remaining: <strong className="accent">{formatRemaining()}</strong>
            </div>
            <button className="m-cancel" onClick={() => { cancelTimer(); onClose(); }}>
              Stop Timer
            </button>
          </div>
        ) : (
          <div className="timer-options">
            <div className="timer-grid">
              {SLEEP_TIMER_OPTIONS.map(opt => (
                <button 
                  key={opt.value} 
                  className="btn-outline timer-btn" 
                  onClick={() => { startTimer(opt.value); onClose(); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="m-cancel" style={{ width: '100%' }} onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
