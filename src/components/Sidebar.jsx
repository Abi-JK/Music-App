import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, likedCount }) {
  const playlists = [
    { label: '🎵 Tamil Kuthu Hits',   term: 'tamil kuthu hits' },
    { label: '⭐ Evergreen Retro',     term: 'evergreen retro hits' },
    { label: '🎹 A.R. Rahman Specials', term: 'ar rahman hits' },
    { label: '🎸 Bollywood Rock',     term: 'bollywood rock' },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <svg width="48" height="48" viewBox="0 0 512 512" fill="none">
          <rect width="512" height="512" rx="108" fill="#080c18"/>
          <rect x="100" y="280" width="32" height="110" rx="16" fill="#006878"/>
          <rect x="148" y="220" width="32" height="170" rx="16" fill="var(--accent)"/>
          <rect x="196" y="160" width="32" height="230" rx="16" fill="var(--accent)"/>
          <rect x="244" y="120" width="32" height="270" rx="16" fill="var(--accent)"/>
          <rect x="292" y="170" width="32" height="220" rx="16" fill="var(--accent)"/>
          <rect x="340" y="230" width="32" height="160" rx="16" fill="var(--accent)"/>
          <rect x="388" y="290" width="32" height="100" rx="16" fill="#006878"/>
        </svg>
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
        <button className={`nav-item ${activeTab === 'liked' ? 'active' : ''}`} onClick={() => setActiveTab('liked')}>
          <span className="nav-icon">❤️</span>Liked Songs {likedCount > 0 && <span className="sidebar-badge">{likedCount}</span>}
        </button>

        <div className="nav-label">Quick Playlists</div>
        {playlists.map(pl => (
          <button key={pl.term} className="pl-item" onClick={() => { setActiveTab('search'); }}>
            {pl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
