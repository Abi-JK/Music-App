import React, { useState, useEffect } from 'react';
import { fmt, audioBufferToWav } from '../utils/helpers';
import { fetchStreamBlob } from '../utils/api';

export default function RingtoneModal({ song, onClose, showToast }) {
  const [start, setStart] = useState(0);
  const [end,   setEnd]   = useState(30);
  const [busy,  setBusy]  = useState(false);
  const maxDur = song?.duration || 240;
  
  useEffect(() => { 
    if (song?.duration) setEnd(Math.min(30, song.duration)); 
  }, [song]);

  const handleCut = async () => {
    setBusy(true); showToast('✂️ Cutting ringtone...');
    try {
      const blob   = await fetchStreamBlob(song.audioUrl || song.streamUrl);
      const arrBuf = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx    = new AudioCtx();
      const decoded = await ctx.decodeAudioData(arrBuf);
      const safeS  = Math.max(0, Math.min(start, decoded.duration - 1));
      const safeE  = Math.min(end, decoded.duration);
      const dur    = safeE - safeS;
      const offCtx = new OfflineAudioContext(
        decoded.numberOfChannels,
        Math.ceil(decoded.sampleRate * dur),
        decoded.sampleRate
      );
      const src = offCtx.createBufferSource();
      src.buffer = decoded; src.connect(offCtx.destination); src.start(0, safeS, dur);
      const rendered = await offCtx.startRendering();
      const wavBuf   = audioBufferToWav(rendered);
      const wavBlob  = new Blob([wavBuf], { type: 'audio/wav' });
      const url      = URL.createObjectURL(wavBlob);
      const a        = document.createElement('a');
      a.href = url; a.download = `${song.title.replace(/\s+/g, '_')}_ringtone.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      ctx.close();
      showToast('✅ Ringtone downloaded!'); onClose();
    } catch (e) {
      console.error(e); showToast('❌ Ringtone failed. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>✂️ Ringtone Maker</h3>
        <p>Trim a ringtone from <strong>{song.title}</strong></p>
        <div className="range-row">
          <label><span>Start</span><span className="accent">{fmt(start)}</span></label>
          <input type="range" min={0} max={maxDur - 1} step={1} value={start}
            onChange={e => { const v = +e.target.value; setStart(v); if (v >= end) setEnd(Math.min(v + 5, maxDur)); }}/>
        </div>
        <div className="range-row">
          <label><span>End</span><span className="accent">{fmt(end)}</span></label>
          <input type="range" min={1} max={maxDur} step={1} value={end}
            onChange={e => { const v = +e.target.value; setEnd(v); if (v <= start) setStart(Math.max(v - 5, 0)); }}/>
        </div>
        <div className="modal-preview">
          Duration: <strong className="accent">{end - start}s</strong> ({fmt(start)} → {fmt(end)})
        </div>
        <div className="modal-actions">
          <button className="m-cancel" onClick={onClose}>Cancel</button>
          <button className="m-dl" onClick={handleCut} disabled={busy}>
            {busy ? 'Cutting...' : 'Trim & Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
