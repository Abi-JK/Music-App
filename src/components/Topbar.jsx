import React, { useState, useRef, useEffect } from 'react';
import { LANG_QUERIES } from '../utils/constants';
import { searchSongs } from '../utils/api';

export default function Topbar({ q, setQ, activeLang, setLang, onSearch }) {
  const [sugs, setSugs] = useState([]);
  const [showSugs, setShowSugs] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSugs(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const onInput = (val) => {
    setQ(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) { setSugs([]); setShowSugs(false); return; }
    setSugLoading(true);
    timerRef.current = setTimeout(() => {
      searchSongs(val, 8).then(s => { setSugs(s); setShowSugs(true); setSugLoading(false); }).catch(() => setSugLoading(false));
    }, 200);
  };

  const pickSugg = (s) => {
    setShowSugs(false);
    setSugs([]);
    setQ(s.title);
    onSearch(s.title);
  };

  const handleSearch = () => {
    setShowSugs(false);
    const val = inputRef.current ? inputRef.current.value : q;
    onSearch(val);
  };

  return (
    <div className="topbar">
      <div className="search-wrap" ref={wrapRef}>
        <div className="search-box">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => onInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { handleSearch(); } }}
            placeholder="Search songs, artists, movies..."
            onFocus={() => sugs.length && setShowSugs(true)}
            autoComplete="off"
          />
          {q && <button className="clear-btn" onClick={() => { setQ(''); setSugs([]); setShowSugs(false); }}>✕</button>}
        </div>
        {showSugs && (sugs.length > 0 || sugLoading) && (
          <div className="suggestions">
            <div className="sugg-header">{sugLoading ? 'Searching...' : 'Suggestions'}</div>
            {sugs.slice(0, 8).map(s => (
              <div key={s.id} className="suggestion-item" onClick={() => pickSugg(s)}>
                {s.coverUrl ? <img src={s.coverUrl} alt="" /> : <div className="s-ph">🎵</div>}
                <div className="s-info">
                  <h5>{s.title}</h5>
                  <p>{s.artist}</p>
                </div>
              </div>
            ))}
            {sugLoading && sugs.length === 0 && <div className="suggestion-item"><div className="s-info"><p>Searching...</p></div></div>}
          </div>
        )}
      </div>
      <div className="lang-chips">
        {LANG_QUERIES.map(l => (
          <button key={l.label} className={`lang-chip ${activeLang === l.label ? 'active' : ''}`}
            onClick={() => setLang(l.label)}>{l.label}</button>
        ))}
      </div>
    </div>
  );
}
