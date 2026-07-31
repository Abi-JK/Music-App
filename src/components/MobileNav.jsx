import React from 'react';

export default function MobileNav({ activeTab, setActiveTab, likedCount, customCount }) {
  const tabs = [
    { id: 'home',  icon: '⌂', label: 'Home' },
    { id: 'search', icon: '⌕', label: 'Search' },
    { id: 'liked', icon: '♥', label: 'Liked' },
    { id: 'mysongs', icon: '♪', label: 'My Songs' },
    { id: 'downloads', icon: '↓', label: 'Offline' },
    { id: 'settings', icon: '⚙', label: 'Settings' },
  ];
  return (
    <div className="mobile-nav">
      {tabs.map(t => (
        <button key={t.id} className={`mobile-nav-btn ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => setActiveTab(t.id)}>
          <span className="mobile-nav-icon">{t.icon}</span>
          <span className="mobile-nav-label">{t.label}{t.id === 'liked' && likedCount > 0 ? ` (${likedCount})` : ''}{t.id === 'mysongs' && customCount > 0 ? ` (${customCount})` : ''}</span>
        </button>
      ))}
    </div>
  );
}
