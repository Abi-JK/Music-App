import React from 'react';

export default function MobileNav({ activeTab, setActiveTab, likedCount, onInstall }) {
  const tabs = [
    { id: 'home',  icon: '🏠', label: 'Home' },
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'liked', icon: '❤️', label: 'Liked' },
    { id: 'downloads', icon: '📥', label: 'Offline' },
  ];
  return (
    <div className="mobile-nav">
      {tabs.map(t => (
        <button key={t.id} className={`mobile-nav-btn ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => setActiveTab(t.id)}>
          <span className="mobile-nav-icon">{t.icon}</span>
          <span className="mobile-nav-label">{t.label}{t.id === 'liked' && likedCount > 0 ? ` (${likedCount})` : ''}</span>
        </button>
      ))}
      {onInstall && (
        <button className="mobile-nav-btn" onClick={onInstall}>
          <span className="mobile-nav-icon">📱</span>
          <span className="mobile-nav-label">Install</span>
        </button>
      )}
    </div>
  );
}
