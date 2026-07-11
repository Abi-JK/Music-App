import React, { useState } from 'react';
import SongRow from '../components/SongRow';

export default function AlbumView({ albums, onCreateAlbum, onDeleteAlbum, onRemoveFromAlbum, currentSong, isPlaying, playSong, handleDownload, toggleLike, isLiked, openRingtone, setDetailSong, addToQueue, showToast }) {
  const [viewAlbumId, setViewAlbumId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateAlbum(newName.trim());
    setNewName('');
    setShowCreate(false);
    showToast(`📀 Created album: ${newName.trim()}`);
  };

  const album = albums.find(a => a.id === viewAlbumId);

  if (album) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="icon-btn" onClick={() => setViewAlbumId(null)} title="Back">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{album.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{album.songs.length} songs</div>
          </div>
          <button className="icon-btn delete-btn" title="Delete album" onClick={() => { onDeleteAlbum(album.id); setViewAlbumId(null); showToast('🗑️ Album deleted'); }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
        {album.songs.length === 0 ? (
          <div className="empty"><p>No songs yet. Add songs from search results!</p></div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => { const order = [...album.songs]; playSong(order[0], order, 0); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Play All
              </button>
              <button className="btn-primary" style={{ padding: '6px 16px', fontSize: 12, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => { const order = [...album.songs].sort(() => Math.random() - 0.5); playSong(order[0], order, 0); }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                </svg>
                Shuffle
              </button>
            </div>
            <div className="table-head">
              <span>#</span>
              <span>SONG</span>
              <span>ALBUM</span>
              <span>DURATION</span>
              <span></span>
            </div>
            <div className="song-table">
              {album.songs.map((song, i) => (
                <SongRow key={song.id} song={song} idx={i}
                  isActive={currentSong?.id === song.id} isPlaying={isPlaying}
                  onPlay={() => playSong(song, album.songs, i)}
                  onDownload={handleDownload} onLike={toggleLike}
                  liked={isLiked(song.id)} onRingtone={openRingtone}
                  onDetails={setDetailSong} onAddToQueue={addToQueue}
                  onDelete={(s) => { onRemoveFromAlbum(s.id, album.id); showToast(`Removed from ${album.name}`); }}/>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="sec-title">My Albums</div>
        <button className="btn-primary" style={{ padding: '6px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowCreate(true)}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Album
        </button>
      </div>

      {showCreate && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input type="text" placeholder="Album name..." value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
            autoFocus/>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }} onClick={handleCreate}>Create</button>
          <button className="icon-btn" onClick={() => { setShowCreate(false); setNewName(''); }}>✕</button>
        </div>
      )}

      {albums.length === 0 ? (
        <div className="empty">
          <span style={{ fontSize: 48 }}>💿</span>
          <h3>No albums yet</h3>
          <p>Create an album, then add songs from search results</p>
        </div>
      ) : (
        <div className="album-card-grid">
          {albums.map(a => (
            <div key={a.id} className="album-card" onClick={() => setViewAlbumId(a.id)}>
              <div className="album-card-img-wrap">
                {a.songs[0]?.coverUrl
                  ? <img src={a.songs[0].coverUrl} alt={a.name} />
                  : <div className="album-card-ph">💿</div>}
              </div>
              <div className="album-card-info">
                <h4>{a.name}</h4>
                <p>{a.songs.length} songs</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
