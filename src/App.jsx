// src/App.jsx
import React from 'react';

export default function App() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>SoundAura PWA</h1>
      <p style={styles.description}>Free ad‑free music streaming.</p>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#121212',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontFamily: 'Inter, sans-serif',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    color: '#00d4e8',
  },
  description: {
    fontSize: '1rem',
    color: '#cccccc',
  },
};
