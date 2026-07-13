import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, likedCount, dlCount, onPlaylistSearch, onOpenSleepTimer, onOpenUpload, user, onOpenAuth, onLogout }) {
  const playlists = [
    { label: '🎵 My Top Songs',         term: 'top hits 2025' },
    { label: '⭐ Tamil Kuthu Hits',     term: 'tamil kuthu hits' },
    { label: '📻 Evergreen Retro',      term: 'evergreen retro hits' },
    { label: '🎹 A.R. Rahman Specials', term: 'ar rahman hits' },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <svg width="28" height="28" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sb-hp" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#9b5de5"/>
              <stop offset="100%" stopColor="#3a86ff"/>
            </linearGradient>
            <linearGradient id="sb-wave" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff6b9d"/>
              <stop offset="50%" stopColor="#c77dff"/>
              <stop offset="100%" stopColor="#00c9d4"/>
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="80" fill="#0a0a1a"/>
          <path d="M140 260 C140 150, 372 150, 372 260" fill="none" stroke="url(#sb-hp)" strokeWidth="22" strokeLinecap="round"/>
          <rect x="112" y="238" width="56" height="80" rx="18" fill="url(#sb-hp)"/>
          <rect x="344" y="238" width="56" height="80" rx="18" fill="url(#sb-hp)"/>
          <g>
            <rect x="210" y="258" width="7" height="48" rx="3.5" fill="url(#sb-wave)"/>
            <rect x="225" y="250" width="7" height="64" rx="3.5" fill="url(#sb-wave)"/>
            <rect x="240" y="244" width="7" height="76" rx="3.5" fill="url(#sb-wave)"/>
            <rect x="255" y="238" width="7" height="88" rx="3.5" fill="url(#sb-wave)"/>
            <rect x="270" y="244" width="7" height="76" rx="3.5" fill="url(#sb-wave)"/>
            <rect x="285" y="250" width="7" height="64" rx="3.5" fill="url(#sb-wave)"/>
            <rect x="300" y="258" width="7" height="48" rx="3.5" fill="url(#sb-wave)"/>
          </g>
        </svg>
        <span className="logo-text"><span style={{ color: '#00c9d4' }}>Sound</span><span style={{ color: '#9b5de5' }}>Aura</span></span>
      </div>
      <div className="sidebar-scroll">
        <div className="nav-label">Menu</div>
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span style={{ fontSize: 16 }}>🏠</span>Home
        </button>
        <button className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
          <span style={{ fontSize: 16 }}>🔍</span>Search
        </button>
        <button className={`nav-item ${activeTab === 'albums' ? 'active' : ''}`} onClick={() => setActiveTab('albums')}>
          <span style={{ fontSize: 16 }}>💿</span>My Albums
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

      {/* User Profile / Login */}
      <div className="sidebar-user">
        {user ? (
          <button className="nav-item user-btn" onClick={onLogout}>
            <span className="user-avatar">{user.name?.charAt(0)?.toUpperCase() || '?'}</span>
            <span className="user-name">{user.name}</span>
          </button>
        ) : (
          <button className="nav-item user-btn" onClick={onOpenAuth}>
            <span style={{ fontSize: 16 }}>👤</span>Sign In
          </button>
        )}
      </div>
    </div>
  );
}
