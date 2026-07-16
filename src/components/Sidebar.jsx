import React from 'react';

const LogoImage = ({ size = 48 }) => (
  <img 
    src="/favicon.svg" 
    alt="SoundAura Logo" 
    width={size} 
    height={size} 
    style={{ borderRadius: 10, flexShrink: 0 }}
  />
);

export default function Sidebar({ activeTab, setActiveTab, likedCount, onSearch, onInstall }) {
  const playlists = [
    { label: '🎧 Lo-Fi & Chill',        term: 'lofi chill' },
    { label: '⚡ Electronic',            term: 'electronic' },
    { label: '🎤 Hip-Hop & Rap',        term: 'hip hop' },
    { label: '🎸 Indie & Alternative',  term: 'indie alternative' },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        <LogoImage size={48} />
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
        <button className={`nav-item ${activeTab === 'downloads' ? 'active' : ''}`} onClick={() => setActiveTab('downloads')}>
          <span className="nav-icon">📥</span>Downloads
        </button>
        {onInstall && (
          <button className="nav-item" onClick={onInstall} style={{ color: 'var(--accent)' }}>
            <span className="nav-icon">📱</span>Install App
          </button>
        )}

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
