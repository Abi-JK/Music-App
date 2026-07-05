import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, likedCount, dlCount, onPlaylistSearch, onOpenSleepTimer, onOpenUpload }) {
  const navItems = [
    { id: 'home',      label: 'Home',     icon: '🏠' },
    { id: 'search',    label: 'Search',   icon: '🔍' },
    { id: 'liked',     label: `Liked Songs${likedCount > 0 ? ` (${likedCount})` : ''}`, icon: '❤️' },
    { id: 'downloads', label: `Downloads${dlCount > 0 ? ` (${dlCount})` : ''}`, icon: 'downloads' }, // Using emoji or label
  ];

  const playlists = [
    { label: '🎵 My Top Songs',         term: 'top hits 2025' },
    { label: '⭐ Tamil Kuthu Hits',     term: 'tamil kuthu hits' },
    { label: '📻 Evergreen Retro',      term: 'evergreen retro hits' },
    { label: '🎹 A.R. Rahman Specials', term: 'ar rahman hits' },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <span className="logo-text">SoundAura</span>
      </div>
      <div className="sidebar-scroll">
        <div className="nav-label">Menu</div>
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span style={{ fontSize: 16 }}>🏠</span>Home
        </button>
        <button className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
          <span style={{ fontSize: 16 }}>🔍</span>Search
        </button>
        <button className={`nav-item ${activeTab === 'liked' ? 'active' : ''}`} onClick={() => setActiveTab('liked')}>
          <span style={{ fontSize: 16 }}>❤️</span>Liked Songs {likedCount > 0 && <span className="sidebar-badge">{likedCount}</span>}
        </button>
        <button className={`nav-item ${activeTab === 'downloads' ? 'active' : ''}`} onClick={() => setActiveTab('downloads')}>
          <span style={{ fontSize: 16 }}>📴</span>Downloads {dlCount > 0 && <span className="sidebar-badge">{dlCount}</span>}
        </button>

        <div className="nav-label">Tools</div>
        <button className="nav-item" onClick={onOpenUpload}>
          <span style={{ fontSize: 16 }}>📁</span>Local MP3 Upload
        </button>
        <button className="nav-item" onClick={onOpenSleepTimer}>
          <span style={{ fontSize: 16 }}>⏰</span>Sleep Timer
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
