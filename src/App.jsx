// src/App.jsx
import React from 'react';
import BottomTabs from './components/BottomTabs';
import { ThemeProvider } from './theme';

export default function App() {
  return (
    <ThemeProvider>
      <div className="app-container">
        <BottomTabs />
      </div>
    </ThemeProvider>
  );
    color: '#cccccc',
  },
};
