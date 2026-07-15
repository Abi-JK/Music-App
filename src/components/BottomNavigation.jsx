import React from 'react';
import { Home, Search, Library } from 'lucide-react';

export default function BottomNavigation({ currentTab, setTab }) {
  const tabs = [
    { id: 'home', icon: <Home size={24} />, label: 'Home' },
    { id: 'search', icon: <Search size={24} />, label: 'Search' },
    { id: 'library', icon: <Library size={24} />, label: 'Library' }
  ];

  return (
    <div style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            style={{ ...styles.tabButton, color: isActive ? '#00d4e8' : '#777' }}
          >
            {React.cloneElement(tab.icon, { color: isActive ? '#00d4e8' : '#777' })}
            <span style={styles.label}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: '#121212',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTop: '1px solid #1e293b',
    zIndex: 1000
  },
  tabButton: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif"
  },
  label: {
    fontSize: '0.7rem',
    marginTop: '4px'
  }
};
