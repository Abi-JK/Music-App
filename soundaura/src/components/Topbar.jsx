import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { searchSongs } from '../utils/api';
import { LANG_QUERIES } from '../utils/constants';

export default function Topbar({ q, setQ, activeLang, setLang, onSearch, onSuggestionClick, isLight, onToggleTheme }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg]       = useState(false);
  const [suggBusy, setSuggBusy]       = useState(false);
  const debouncedQ = useDebounce(q, 300);
  const wrapRef    = useRef(null);

  useEffect(() => {
    if (!debouncedQ.trim() || debouncedQ.length < 2) { setSuggestions([]); setShowSugg(false); return; }
    setSuggBusy(true);
    searchSongs(debouncedQ, 8)
      .then(res => { setSuggestions(res); setShowSugg(res.length > 0); })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggBusy(false));
  }, [debouncedQ]);

  useEffect(() => {
    const close = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="topbar">
      <div className="search-wrap" ref={wrapRef}>
        <div className="search-box">
          {suggBusy
            ? <div className="spinner" style={{ width: 15, height: 15, borderWidth: 2, flexShrink: 0 }}/>
            : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>}
          <input
            id="search-input" type="text" autoComplete="off"
            placeholder="Search songs, movies, artists..."
            value={q}
            onChange={e => { setQ(e.target.value); setShowSugg(true); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { setShowSugg(false); onSearch(); }
              if (e.key === 'Escape') setShowSugg(false);
            }}
            onFocus={() => { if (suggestions.length) setShowSugg(true); }}
          />
          {q && (
            <button className="clear-btn" onClick={() => { setQ(''); setSuggestions([]); setShowSugg(false); }}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        {showSugg && suggestions.length > 0 && (
          <div className="suggestions">
            <div className="sugg-header">Songs & Movies</div>
            {suggestions.map(song => (
              <div key={song.id} className="suggestion-item"
                onClick={() => { setShowSugg(false); setQ(song.title); onSuggestionClick(song); }}>
                {song.coverUrl ? <img src={song.coverUrl} alt=""/> : <div className="s-ph">🎵</div>}
                <div className="s-info"><h5>{song.title}</h5><p>{song.artist}{song.album ? ` • ${song.album}` : ''}</p></div>
                <svg className="s-play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="lang-chips">
        {LANG_QUERIES.map(l => (
          <button key={l.label} className={`chip ${activeLang === l.label ? 'active' : ''}`}
            onClick={() => setLang(l.label)}>{l.label}</button>
        ))}
      </div>

      <button className="theme-toggle" onClick={onToggleTheme} title="Toggle Theme">
        {isLight ? '🌙' : '☀️'}
      </button>
    </div>
  );
}
