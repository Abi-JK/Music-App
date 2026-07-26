import React, { useState, useRef, useCallback } from 'react';
import { Storage } from '../utils/storage';

function generateId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseFileName(name) {
  const clean = name
    .replace(/\.(mp3|wav|m4a|ogg|flac|aac|wma|opus|webm)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = clean.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: 'Unknown Artist', title: clean };
}

function getAudioDuration(blob) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => {
      const dur = audio.duration || 0;
      URL.revokeObjectURL(url);
      resolve(dur);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
  });
}

export default function MySongsScreen({ customSongs, setCustomSongs, playSong, currentSong, isPlaying, showToast }) {
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editSong, setEditSong] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const fileInputRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    let added = 0;
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop().toLowerCase();
        const validExts = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'opus', 'webm'];
        if (!validExts.includes(ext)) {
          showToast(`Skipped "${file.name}" — unsupported format`);
          continue;
        }
        const blob = new Blob([await file.arrayBuffer()], { type: file.type || `audio/${ext}` });
        const parsed = parseFileName(file.name);
        const duration = await getAudioDuration(blob);
        const song = {
          id: generateId(),
          title: parsed.title,
          artist: parsed.artist,
          album: 'My Songs',
          year: '',
          duration,
          coverUrl: null,
          audioUrl: null,
          allAudioUrls: [],
          rawAudioUrls: [],
          genre: '',
          source: 'custom',
          downloadable: true,
          _customFile: true,
          addedAt: new Date().toISOString(),
        };
        await Storage.addCustomSong(song, blob);
        setCustomSongs(prev => [...prev, { ...song }]);
        added++;
      } catch (err) {
        console.error('Import error:', err);
        showToast(`Failed to import "${file.name}"`);
      }
    }
    setImporting(false);
    if (added > 0) showToast(`Added ${added} song${added > 1 ? 's' : ''} to My Songs`);
  }, [showToast, setCustomSongs]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleRemove = useCallback(async (songId) => {
    await Storage.removeCustomSong(songId);
    setCustomSongs(prev => prev.filter(s => s.id !== songId));
    showToast('Song removed from My Songs');
  }, [showToast, setCustomSongs]);

  const handleEdit = useCallback((song) => {
    setEditSong(song);
    setEditTitle(song.title);
    setEditArtist(song.artist);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editSong) return;
    const updated = { ...editSong, title: editTitle, artist: editArtist };
    const allCustom = await Storage.getCustomSongs();
    const idx = allCustom.findIndex(s => s.id === editSong.id);
    if (idx >= 0) {
      allCustom[idx] = { ...allCustom[idx], title: editTitle, artist: editArtist };
      const blob = await Storage.loadCustomSongBlob(editSong.id);
      if (blob) {
        await Storage.removeCustomSong(editSong.id);
        await Storage.addCustomSong(allCustom[idx], blob);
      }
    }
    setCustomSongs(prev => prev.map(s => s.id === editSong.id ? updated : s));
    setEditSong(null);
    showToast('Song updated');
  }, [editSong, editTitle, editArtist, showToast, setCustomSongs]);

  const handlePlay = useCallback((song) => {
    const context = customSongs.filter(s => s._customFile);
    const idx = context.findIndex(s => s.id === song.id);
    playSong(song, context, idx >= 0 ? idx : 0);
  }, [customSongs, playSong]);

  const formatDuration = (sec) => {
    if (!sec || sec <= 0) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleImportFromUrl = useCallback(async () => {
    const url = prompt('Paste audio URL (mp3, wav, m4a, ogg, flac):');
    if (!url) return;
    setImporting(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const ext = url.split('.').pop().split('?')[0].toLowerCase() || 'mp3';
      const blob = new Blob([await res.arrayBuffer()], { type: `audio/${ext}` });
      const parsed = parseFileName(url.split('/').pop() || 'downloaded song');
      const duration = await getAudioDuration(blob);
      const song = {
        id: generateId(),
        title: parsed.title,
        artist: parsed.artist,
        album: 'My Songs',
        year: '',
        duration,
        coverUrl: null,
        audioUrl: null,
        allAudioUrls: [],
        rawAudioUrls: [],
        genre: '',
        source: 'custom',
        downloadable: true,
        _customFile: true,
        addedAt: new Date().toISOString(),
      };
      await Storage.addCustomSong(song, blob);
      setCustomSongs(prev => [...prev, { ...song }]);
      showToast(`Added "${song.title}" to My Songs`);
    } catch (err) {
      console.error(err);
      showToast('Failed to download audio from URL');
    }
    setImporting(false);
  }, [showToast, setCustomSongs]);

  const songsWithBlob = customSongs.filter(s => s._customFile);

  return (
    <div className="liked-screen">
      <div className="liked-header">
        <h2>My Songs</h2>
        <span className="liked-count">{songsWithBlob.length} song{songsWithBlob.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          className="import-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          style={{
            padding: '10px 20px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {importing ? 'Importing...' : 'Import Audio Files'}
        </button>
        <button
          className="import-btn-url"
          onClick={handleImportFromUrl}
          disabled={importing}
          style={{
            padding: '10px 20px',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Import from URL
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.opus,.webm"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div
        className={`drop-zone ${dragOver ? 'active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          color: 'var(--text-muted)',
          marginBottom: 20,
          transition: 'all 0.2s',
          background: dragOver ? 'rgba(0,212,232,0.05)' : 'transparent',
        }}
      >
        <p style={{ fontSize: 16, marginBottom: 4 }}>
          {dragOver ? 'Drop audio files here' : 'Drag & drop audio files here'}
        </p>
        <p style={{ fontSize: 12 }}>
          MP3, WAV, M4A, OGG, FLAC, AAC, WMA, Opus, WebM
        </p>
      </div>

      {songsWithBlob.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🎵</p>
          <p style={{ fontSize: 16, marginBottom: 8 }}>No custom songs yet</p>
          <p style={{ fontSize: 13 }}>
            Import audio files from your device or download from anywhere and add them here.
            Songs are stored locally and won't be lost when you clear browser cache.
          </p>
        </div>
      ) : (
        <div className="liked-list">
          {songsWithBlob.map(song => (
            <div
              key={song.id}
              className={`liked-item ${currentSong?.id === song.id ? 'active' : ''}`}
              onClick={() => handlePlay(song)}
            >
              <div className="liked-info">
                <div className="liked-title">{song.title}</div>
                <div className="liked-artist">{song.artist} · {formatDuration(song.duration)}</div>
              </div>
              <div className="liked-actions">
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEdit(song); }} title="Edit">✏️</button>
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleRemove(song.id); }} title="Remove">🗑️</button>
                {currentSong?.id === song.id && isPlaying && (
                  <div className="eq"><span /><span /><span /></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editSong && (
        <div className="modal-overlay" onClick={() => setEditSong(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 20, borderRadius: 12, background: 'var(--surface)', minWidth: 300 }}>
            <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>Edit Song</h3>
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Song title"
              style={{ width: '100%', padding: 8, marginBottom: 8, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
            <input
              type="text"
              value={editArtist}
              onChange={e => setEditArtist(e.target.value)}
              placeholder="Artist name"
              style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditSong(null)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveEdit} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
