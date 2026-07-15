import React from 'react';

const LogoSVG = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: 10, flexShrink: 0 }}>
    <defs>
      <linearGradient id="sb-g1" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#006878"/>
        <stop offset="50%" stopColor="#00b0cc"/>
        <stop offset="100%" stopColor="#00eaff"/>
      </linearGradient>
      <linearGradient id="sb-g2" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#004d5a"/>
        <stop offset="100%" stopColor="#0090aa"/>
      </linearGradient>
      <linearGradient id="sb-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#080c18"/>
        <stop offset="100%" stopColor="#0a1020"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="108" fill="url(#sb-bg)"/>
    <circle cx="256" cy="268" r="195" fill="none" stroke="#00d4e8" strokeWidth="2" opacity="0.08"/>
    <rect x="100" y="280" width="32" height="110" rx="16" fill="url(#sb-g2)"/>
    <rect x="148" y="220" width="32" height="170" rx="16" fill="url(#sb-g1)"/>
    <rect x="196" y="160" width="32" height="230" rx="16" fill="url(#sb-g1)"/>
    <rect x="244" y="120" width="32" height="270" rx="16" fill="url(#sb-g1)"/>
    <rect x="292" y="170" width="32" height="220" rx="16" fill="url(#sb-g1)"/>
    <rect x="340" y="230" width="32" height="160" rx="16" fill="url(#sb-g1)"/>
    <rect x="388" y="290" width="32" height="100" rx="16" fill="url(#sb-g2)"/>
    <circle cx="260" cy="300" r="60" fill="#00d4e8" opacity="0.04"/>
  </svg>
);

export default function Sidebar({ activeTab, setActiveTab, likedCount, onSearch }) {
  const playlists = [
    { label: '🎵 Tamil Kuthu Hits',   term: 'tamil kuthu hits' },
    { label: '⭐ Evergreen Retro',     term: 'evergreen retro hits' },
    { label: '🎹 A.R. Rahman Specials', term: 'ar rahman hits' },
    { label: '🎸 Bollywood Rock',     term: 'bollywood rock' },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <LogoSVG size={48} />
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
          <button key={pl.term} className="pl-item" onClick={() => onSearch && onSearch(pl.term)}>
            {pl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
