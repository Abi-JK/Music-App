import React from 'react';

const LogoImage = ({ size = 48 }) => (
  <img 
    src="/icons/icon-128.png" 
    alt="SoundAura Logo" 
    width={size} 
    height={size} 
    style={{ borderRadius: 10, flexShrink: 0 }}
  />
);

export default function Sidebar({ activeTab, setActiveTab, likedCount, onSearch, onInstall }) {
  const playlists = [
    { label: '🎬 Bollywood Hits',        term: 'bollywood hindi 2025' },
    { label: '🎵 Tamil Hits',            term: 'tamil film songs' },
    { label: '🎶 Telugu Hits',           term: 'telugu film songs' },
    { label: '🎤 Malayalam Hits',        term: 'malayalam film songs' },
    { label: '🎸 Punjabi Hits',          term: 'punjabi songs' },
    { label: '🎤 Kannada Hits',          term: 'kannada film songs' },
    { label: '🎹 Bengali Hits',          term: 'bengali film songs' },
    { label: '🎹 Marathi Hits',          term: 'marathi film songs' },
    { label: '🎤 Bhojpuri Hits',         term: 'bhojpuri songs' },
    { label: '📻 Old Hindi Classics',    term: 'old hindi songs golden era' },
    { label: '🎵 Tamil Old Hits',        term: 'tamil old song hits' },
    { label: '🎶 Romantic Hits',         term: 'romantic bollywood' },
  ];

  const topArtists = [
    'Arijit Singh', 'A.R. Rahman', 'Anirudh', 'Shreya Ghoshal', 'Ilaiyaraaja',
    'M.S. Viswanathan', 'Kannadasan', 'S.P. Balasubrahmanyam', 'K.J. Yesudas',
    'Lata Mangeshkar', 'Kishore Kumar', 'Sonu Nigam', 'Udit Narayan',
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

        <div className="nav-label">Top Artists</div>
        {topArtists.map(name => (
          <button key={name} className="pl-item" onClick={() => onSearch && onSearch(name)}>
            🎤 {name}
          </button>
        ))}
      </div>
    </div>
  );
}
