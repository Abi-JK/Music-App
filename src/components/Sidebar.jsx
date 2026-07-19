import React from 'react';
import DataSettings from './DataSettings';

const LogoImage = ({ size = 48 }) => (
  <img 
    src="/icons/icon-128.png" 
    alt="SoundAura Logo" 
    width={size} 
    height={size}
    style={{ borderRadius: 10, flexShrink: 0 }}
  />
);

export default function Sidebar({ activeTab, setActiveTab, likedCount, onSearch, onInstall, showToast }) {
  const playlists = [
    { label: '🎬 Bollywood Hits',        term: 'bollywood hindi songs' },
    { label: '🎵 Tamil Hits',            term: 'tamil film songs' },
    { label: '🎶 Telugu Hits',           term: 'telugu film songs' },
    { label: '🎤 Malayalam Hits',        term: 'malayalam film songs' },
    { label: '🎸 Punjabi Hits',          term: 'punjabi songs' },
    { label: '🎤 Kannada Hits',          term: 'kannada film songs' },
    { label: '🎹 Bengali Hits',          term: 'bengali songs' },
    { label: '🎹 Marathi Hits',          term: 'marathi film songs' },
    { label: '🎤 Bhojpuri Hits',         term: 'bhojpuri songs' },
    { label: '📻 Old Hindi Classics',    term: 'old hindi songs golden era' },
    { label: '🎵 Tamil Old Hits',        term: 'Ilaiyaraaja old tamil songs' },
    { label: '🎶 Kannada Classics',      term: 'kannada old songs' },
    { label: '🎤 Tamil Album Songs',     term: 'tamil album songs' },
    { label: '🎶 Kannada Album Songs',   term: 'kannada album songs' },
    { label: '🎸 Tamil Devotional',      term: 'tamil devotional songs' },
    { label: '🎹 Kannada Devotional',    term: 'kannada devotional songs' },
    { label: '🎶 Romantic Hits',         term: 'romantic songs' },
    { label: '🔥 Party & Dance',         term: 'bollywood dance hits' },
    { label: '😢 Sad Songs',             term: 'hindi sad songs' },
  ];

  const topArtists = [
    { name: 'Arijit Singh', query: 'Arijit Singh songs' },
    { name: 'A.R. Rahman', query: 'A.R. Rahman songs' },
    { name: 'Anirudh Ravichander', query: 'Anirudh songs' },
    { name: 'Shreya Ghoshal', query: 'Shreya Ghoshal songs' },
    { name: 'Ilaiyaraaja', query: 'Ilaiyaraaja songs' },
    { name: 'K.J. Yesudas', query: 'K.J. Yesudas songs' },
    { name: 'S.P. Balasubrahmanyam', query: 'S.P. Balasubrahmanyam songs' },
    { name: 'Lata Mangeshkar', query: 'Lata Mangeshkar songs' },
    { name: 'Kishore Kumar', query: 'Kishore Kumar songs' },
    { name: 'Mohammed Rafi', query: 'Mohammed Rafi songs' },
    { name: 'Sonu Nigam', query: 'Sonu Nigam songs' },
    { name: 'Udit Narayan', query: 'Udit Narayan songs' },
    { name: 'M.S. Viswanathan', query: 'M.S. Viswanathan songs' },
    { name: 'Kannadasan', query: 'Kannadasan songs' },
    { name: 'Asha Bhosle', query: 'Asha Bhosle songs' },
    { name: 'Mukesh', query: 'Mukesh songs' },
    { name: 'Sunidhi Chauhan', query: 'Sunidhi Chauhan songs' },
    { name: 'Devi Sri Prasad', query: 'Devi Sri Prasad songs' },
    { name: 'Yuvan Shankar Raja', query: 'Yuvan Shankar Raja songs' },
    { name: 'Harris Jayaraj', query: 'Harris Jayaraj songs' },
    { name: 'Sid Sriram', query: 'Sid Sriram songs' },
    { name: 'Sanjith Hegde', query: 'Sanjith Hegde songs' },
    { name: 'Diljit Dosanjh', query: 'Diljit Dosanjh songs' },
    { name: 'Badshah', query: 'Badshah songs' },
    { name: 'Honey Singh', query: 'Honey Singh songs' },
  ];

  const albumCategories = [
    { label: '🎬 Mayavi (Lifeu Ishtene)', query: 'Lifeu Ishtene kannada songs' },
    { label: '🎵 MGR Hits', query: 'Annakili songs' },
    { label: '🎶 Sivaji Ganesan', query: 'Thiruvilaiyadal songs' },
    { label: '🎤 Rajinikanth Hits', query: 'rajinikanth songs' },
    { label: '🎸 Kamal Haasan', query: 'kamal haasan songs' },
    { label: '🎹 Vijay Hits', query: 'vijay actor songs' },
    { label: '🎤 Ajith Hits', query: 'ajith kumar songs' },
    { label: '🎶 Puneeth Rajkumar', query: 'puneeth rajkumar songs' },
    { label: '🎸 Darshan Hits', query: 'darshan kannada songs' },
    { label: '🎹 Dr. Rajkumar', query: 'dr rajkumar songs kannada' },
    { label: '🎤 Upendra Hits', query: 'upendra kannada songs' },
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

        <DataSettings showToast={showToast} />

        <div className="nav-label">Quick Playlists</div>
        {playlists.map(pl => (
          <button key={pl.term} className="pl-item" onClick={() => onSearch && onSearch(pl.term)}>
            {pl.label}
          </button>
        ))}

        <div className="nav-label">Albums & Movies</div>
        {albumCategories.map(pl => (
          <button key={pl.query} className="pl-item" onClick={() => onSearch && onSearch(pl.query)}>
            {pl.label}
          </button>
        ))}

        <div className="nav-label">Top Artists</div>
        {topArtists.map(a => (
          <button key={a.name} className="pl-item" onClick={() => onSearch && onSearch(a.query)}>
            🎤 {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}
