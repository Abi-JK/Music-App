import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, likedCount, dlCount, onPlaylistSearch, onOpenSleepTimer, onOpenUpload }) {
  const playlists = [
    { label: '🎵 My Top Songs',         term: 'top hits 2025' },
    { label: '⭐ Tamil Kuthu Hits',     term: 'tamil kuthu hits' },
    { label: '📻 Evergreen Retro',      term: 'evergreen retro hits' },
    { label: '🎹 A.R. Rahman Specials', term: 'ar rahman hits' },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/icons/icon-96.png" alt="SoundAura Logo" style={{ width: 44, height: 44 }} />
        <span className="logo-text">SoundAura</span>
      </div>
      <div className="sidebar-scroll">
        <div className="nav-label">Menu</div>
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span className="nav-icon">🏠</span>Home
        </button>
        <button className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
          <span className="nav-icon">🔍</span>Search
        </button>
        <button className={`nav-item ${activeTab === 'albums' ? 'active' : ''}`} onClick={() => setActiveTab('albums')}>
          <span className="nav-icon">💿</span>My Albums
        </button>
        <button className={`nav-item ${activeTab === 'liked' ? 'active' : ''}`} onClick={() => setActiveTab('liked')}>
          <span className="nav-icon">❤️</span>Liked Songs {likedCount > 0 && <span className="sidebar-badge">{likedCount}</span>}
        </button>
        <button className={`nav-item ${activeTab === 'downloads' ? 'active' : ''}`} onClick={() => setActiveTab('downloads')}>
          <span className="nav-icon">📴</span>Downloads {dlCount > 0 && <span className="sidebar-badge">{dlCount}</span>}
        </button>

        <div className="nav-label">Tools</div>
        <button className="nav-item" onClick={onOpenUpload}>
          <span className="nav-icon">📁</span>Local MP3 Upload
        </button>
        <button className="nav-item" onClick={onOpenSleepTimer}>
          <span className="nav-icon">⏰</span>Sleep Timer
        </button>

        <div className="nav-label">Your Playlists</div>
        {playlists.map(pl => (
          <button key={pl.term} className="pl-item" onClick={() => onPlaylistSearch(pl.term, pl.label)}>
            {pl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
