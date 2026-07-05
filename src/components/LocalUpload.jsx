import React, { useRef, useState } from 'react';
import { saveOfflineTrack } from '../offlineStore';

export default function LocalUpload({ isOpen, onClose, showToast, onAddLocalTrack }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setBusy(true);
    showToast(`⏳ Importing ${files.length} audio files...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/')) {
        showToast(`❌ Skip non-audio: ${file.name}`);
        continue;
      }

      try {
        // Construct track object
        const songId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const cleanName = file.name.replace(/\.[^/.]+$/, ""); // Strip extension
        
        // Simple ID3 tag parser or just use filename
        const track = {
          id: songId,
          title: cleanName,
          artist: 'Local File',
          album: 'My Uploads',
          duration: 0, // Will be computed on first play
          coverUrl: null,
          isLocal: true,
          offline: true,
        };

        // Save blob in IndexedDB
        await saveOfflineTrack(track, file);
        onAddLocalTrack();
        showToast(`✅ Added ${cleanName}`);
      } catch (err) {
        console.error(err);
        showToast(`❌ Failed to save ${file.name}`);
      }
    }

    setBusy(false);
    onClose();
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>📁 Local MP3 Upload</h3>
        <p>Import your own MP3/WAV music files into SoundAura. They are stored locally on your device for offline playback.</p>

        <div className="upload-dropzone" onClick={() => fileRef.current?.click()}>
          <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p>{busy ? 'Importing files...' : 'Select MP3/WAV files to import'}</p>
          <input 
            type="file" 
            ref={fileRef} 
            multiple 
            accept="audio/*" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            disabled={busy}
          />
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="m-cancel" style={{ width: '100%' }} onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
