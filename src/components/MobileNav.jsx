import React from 'react';

export default function MobileNav({ activeTab, setActiveTab, likedCount, dlCount }) {
  return (
    <div className="mobile-nav">
      <button className={`mobile-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
        <span className="mobile-nav-icon">🏠</span>
        <span className="mobile-nav-label">Home</span>
      </button>
      <button className={`mobile-nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
        <span className="mobile-nav-icon">🔍</span>
        <span className="mobile-nav-label">Search</span>
      </button>
      <button className={`mobile-nav-item ${activeTab === 'liked' ? 'active' : ''}`} onClick={() => setActiveTab('liked')}>
        <span className="mobile-nav-icon">❤️</span>
        <span className="mobile-nav-label">Liked</span>
        {likedCount > 0 && <span className="mobile-badge-dot" />}
      </button>
      <button className={`mobile-nav-item ${activeTab === 'downloads' ? 'active' : ''}`} onClick={() => setActiveTab('downloads')}>
        <span className="mobile-nav-icon">📴</span>
        <span className="mobile-nav-label">Downloads</span>
        {dlCount > 0 && <span className="mobile-badge-dot" />}
      </button>
    </div>
  );
}
