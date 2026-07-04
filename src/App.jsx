import React, { useState, useRef, useEffect, useCallback } from 'react';
import './index.css';
import {
  saveOfflineTrack, getOfflineTrack, listOfflineTracks, deleteOfflineTrack, blobUrlForTrack
} from './offlineStore';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
// All requests go through local Vite proxy paths to add correct headers
const API    = '/saavn-api';        // → https://www.jiosaavn.com/api.php
const SEARCH = '/saavn-search';     // → https://jiosaavn-api-beta.vercel.app
const STREAM = '/saavn-stream';     // → https://web.saavncdn.com  (with Referer injected)

const LANG_QUERIES = [
  { label: 'All',       term: '' },
  { label: 'Tamil',     term: 'tamil' },
  { label: 'Hindi',     term: 'hindi' },
  { label: 'English',   term: 'english pop' },
  { label: 'Telugu',    term: 'telugu' },
  { label: 'Malayalam', term: 'malayalam' },
  { label: 'Kannada',   term: 'kannada' },
  { label: 'Punjabi',   term: 'punjabi' },
  { label: '90s Hits',  term: '90s hits' },
  { label: 'Retro',     term: 'retro hits' },
];

const HOME_SECTIONS = [
  { key: 'tamil_new',    term: 'tamil songs 2025',       label: '🔥 Tamil Hits' },
  { key: 'anirudh',      term: 'anirudh ravichander',    label: '⭐ Anirudh Musicals' },
  { key: 'bollywood',    term: 'bollywood hits 2025',    label: '🎬 Bollywood Hits' },
  { key: 'english_pop',  term: 'english pop hits',       label: '🌍 Global Pop' },
  { key: 'rahman',       term: 'ar rahman hits',         label: '🏆 A.R. Rahman' },
  { key: 'ilayaraja',    term: 'ilayaraja tamil hits',   label: '📻 Ilayaraja Hits' },
  { key: 'retro_hindi',  term: '90s hindi songs',        label: '🎹 90s Bollywood' },
  { key: 'telugu_new',   term: 'telugu hits 2025',       label: '🎶 Telugu Melodies' },
  { key: 'malayalam_n',  term: 'malayalam hits 2025',    label: '🌴 Malayalam Hits' },
  { key: 'punjabi_new',  term: 'punjabi hits 2025',      label: '🎉 Punjabi Beats' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

function decodeHtml(text) {
  if (!text) return '';
  const el = document.createElement('textarea');
  el.innerHTML = String(text);
  return el.value;
}

function parseDuration(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.includes(':')) {
    const [m, s] = val.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

// Convert any web.saavncdn.com stream URL to go through local proxy
function toProxiedStream(url) {
  if (!url) return null;
  // Already a blob (offline) or relative proxy url — keep as-is
  if (url.startsWith('blob:') || url.startsWith('/')) return url;
  try {
    const u = new URL(url);
    // Only proxy web.saavncdn.com (auth URLs) through /saavn-stream
    if (u.hostname === 'web.saavncdn.com') {
      return `${STREAM}${u.pathname}${u.search}`;
    }
    // For preview URLs (preview.saavncdn.com) — return direct (no Referer needed for previews)
    return url;
  } catch {
    return url;
  }
}

function pickBestCover(s) {
  if (s.images?.['500x500']) return s.images['500x500'];
  if (typeof s.image === 'string') return s.image.replace('150x150', '500x500');
  const imgs = s.image || [];
  return imgs.find(i => i.quality === '500x500')?.link
    || imgs.find(i => i.quality === '150x150')?.link
    || imgs[imgs.length - 1]?.link
    || null;
}

// Normalize a song returned by the Vercel search API
function normVercelSong(s) {
  const primary  = decodeHtml(s.primaryArtists || s.primary_artists || '');
  const featured = decodeHtml(s.featuredArtists || '');
  const singers  = [primary, featured].filter(Boolean).join(', ');
  return {
    id:        s.id,
    title:     decodeHtml(s.name || s.song || s.title || 'Unknown'),
    artist:    primary || 'Unknown Artist',
    singers:   singers || primary,
    album:     decodeHtml(s.album?.name || s.album || ''),
    year:      s.year || '',
    duration:  parseDuration(s.duration),
    coverUrl:  pickBestCover(s),
    audioUrl:  null,   // Will be resolved on play via getStreamUrl()
    quality:   '320kbps',
    language:  s.language || '',
    label:     decodeHtml(s.label || ''),
    copyright: decodeHtml(s.copyright || s.copyright_text || ''),
    hasLyrics: s.hasLyrics === 'true' || s.hasLyrics === true,
  };
}

function formatLyrics(raw) {
  if (!raw) return null;
  let text = decodeHtml(String(raw))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\uFFFD/g, "'")
    .trim();
  if (!text.includes('\n')) text = text.replace(/\s{2,}/g, '\n');
  return text.split('\n').map(l => l.trim()).filter(Boolean).join('\n') || null;
}

// ─── CORE API: Get fresh signed stream URL ───────────────────────────────────
// Returns { streamUrl, song } where streamUrl is a proxied /saavn-stream/... URL
async function getStreamUrl(songId) {
  // 1. Fetch song details via local proxy → https://www.jiosaavn.com/api.php
  const detRes = await fetch(
    `${API}?__call=song.getDetails&pids=${songId}&_format=json&_marker=0&ctx=web6dot0`
  );
  if (!detRes.ok) throw new Error(`Song details failed: ${detRes.status}`);
  const detJson = await detRes.json();
  const detail  = detJson.songs?.[0];
  if (!detail) throw new Error('Song not found in API response');

  // 2. Generate auth token → signed web.saavncdn.com URL
  const encUrl   = encodeURIComponent(detail.encrypted_media_url);
  const tokRes   = await fetch(
    `${API}?__call=song.generateAuthToken&url=${encUrl}&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`
  );
  if (!tokRes.ok) throw new Error(`Auth token failed: ${tokRes.status}`);
  const tokJson  = await tokRes.json();
  const authUrl  = tokJson.auth_url;
  if (!authUrl) throw new Error('No auth_url in token response');

  // 3. Convert to proxied URL (adds Referer automatically via Vite proxy)
  const streamUrl = toProxiedStream(authUrl);

  // 4. Build a normalized song object from official API data
  const primary = decodeHtml(detail.primary_artists || '');
  const image   = (detail.image || '').replace('150x150', '500x500');
  const song = {
    id:        detail.id,
    title:     decodeHtml(detail.song || detail.name || 'Unknown'),
    artist:    primary || 'Unknown Artist',
    singers:   primary,
    album:     decodeHtml(detail.album || ''),
    year:      detail.year || '',
    duration:  parseDuration(detail.duration),
    coverUrl:  image || null,
    audioUrl:  authUrl,           // raw URL for download fallback
    streamUrl,                    // proxied URL for playback
    quality:   '320kbps',
    language:  detail.language || '',
    label:     decodeHtml(detail.label || ''),
    copyright: decodeHtml(detail.copyright_text || ''),
    hasLyrics: detail.has_lyrics === 'true' || detail.has_lyrics === true,
    mediaPreview: detail.media_preview_url || null,
  };

  return song;
}

// ─── SEARCH API ──────────────────────────────────────────────────────────────
const searchSongs = async (query, limit = 24) => {
  const res = await fetch(
    `${SEARCH}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const j = await res.json();
  return (j.data?.results || j.results || []).map(normVercelSong);
};

const fetchLyrics = async (songId) => {
  const res = await fetch(`${SEARCH}/lyrics?id=${songId}`);
  if (res.ok) {
    const j = await res.json();
    const raw = j.data?.lyrics || j.lyrics;
    const f = formatLyrics(raw);
    if (f) return f;
  }
  return null;
};

// ─── DOWNLOAD: fetch blob through proxy ──────────────────────────────────────
async function fetchStreamBlob(authUrl) {
  // Primary: through our /saavn-stream proxy (adds Referer)
  const proxied = toProxiedStream(authUrl);
  try {
    const r = await fetch(proxied);
    if (r.ok) return await r.blob();
    console.warn('Proxy fetch status:', r.status);
  } catch (e) {
    console.warn('Proxy fetch error:', e.message);
  }
  // Fallback: try corsproxy.io
  try {
    const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(authUrl)}`);
    if (r.ok) return await r.blob();
  } catch {}
  throw new Error('Could not fetch audio blob');
}

// ─── LOCAL STORAGE ───────────────────────────────────────────────────────────
const LS = {
  get: (k, fb = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set: (k, v)        => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return <div className={`toast ${msg ? 'show' : ''}`}>{msg}</div>;
}

// ─── RINGTONE MODAL ──────────────────────────────────────────────────────────
function RingtoneModal({ song, onClose, showToast }) {
  const [start, setStart] = useState(0);
  const [end,   setEnd]   = useState(30);
  const [busy,  setBusy]  = useState(false);
  const maxDur = song?.duration || 240;
  useEffect(() => { if (song?.duration) setEnd(Math.min(30, song.duration)); }, [song]);

  const handleCut = async () => {
    setBusy(true); showToast('✂️ Cutting ringtone...');
    try {
      const blob   = await fetchStreamBlob(song.audioUrl || song.streamUrl);
      const arrBuf = await blob.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx    = new AudioCtx();
      const decoded = await ctx.decodeAudioData(arrBuf);
      const safeS  = Math.max(0, Math.min(start, decoded.duration - 1));
      const safeE  = Math.min(end, decoded.duration);
      const dur    = safeE - safeS;
      const offCtx = new OfflineAudioContext(
        decoded.numberOfChannels,
        Math.ceil(decoded.sampleRate * dur),
        decoded.sampleRate
      );
      const src = offCtx.createBufferSource();
      src.buffer = decoded; src.connect(offCtx.destination); src.start(0, safeS, dur);
      const rendered = await offCtx.startRendering();
      const wavBuf   = audioBufferToWav(rendered);
      const wavBlob  = new Blob([wavBuf], { type: 'audio/wav' });
      const url      = URL.createObjectURL(wavBlob);
      const a        = document.createElement('a');
      a.href = url; a.download = `${song.title.replace(/\s+/g, '_')}_ringtone.wav`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      ctx.close();
      showToast('✅ Ringtone downloaded!'); onClose();
    } catch (e) {
      console.error(e); showToast('❌ Ringtone failed. Try again.');
    }
    setBusy(false);
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>✂️ Ringtone Maker</h3>
        <p>Trim a ringtone from <strong>{song.title}</strong></p>
        <div className="range-row">
          <label><span>Start</span><span className="accent">{fmt(start)}</span></label>
          <input type="range" min={0} max={maxDur - 1} step={1} value={start}
            onChange={e => { const v = +e.target.value; setStart(v); if (v >= end) setEnd(Math.min(v + 5, maxDur)); }}/>
        </div>
        <div className="range-row">
          <label><span>End</span><span className="accent">{fmt(end)}</span></label>
          <input type="range" min={1} max={maxDur} step={1} value={end}
            onChange={e => { const v = +e.target.value; setEnd(v); if (v <= start) setStart(Math.max(v - 5, 0)); }}/>
        </div>
        <div className="modal-preview">
          Duration: <strong className="accent">{end - start}s</strong> ({fmt(start)} → {fmt(end)})
        </div>
        <div className="modal-actions">
          <button className="m-cancel" onClick={onClose}>Cancel</button>
          <button className="m-dl" onClick={handleCut} disabled={busy}>
            {busy ? 'Cutting...' : '⬇️ Download Ringtone'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL PANEL ────────────────────────────────────────────────────────────
function DetailPanel({ song, onClose, liked, toggleLike, onPlay, isPlaying, showToast, onDownload, onRingtone }) {
  const [lyrics, setLyrics]     = useState(null);
  const [lyricsBusy, setLyBusy] = useState(false);
  const [lyricsNone, setLyNone] = useState(false);

  useEffect(() => {
    if (!song) return;
    setLyrics(null); setLyNone(false); setLyBusy(true);
    fetchLyrics(song.id)
      .then(txt => { setLyrics(txt); if (!txt) setLyNone(true); })
      .catch(() => setLyNone(true))
      .finally(() => setLyBusy(false));
  }, [song?.id]);

  if (!song) return null;
  const isLiked = liked(song.id);

  return (
    <div className="detail-panel">
      <div className="panel-header">
        <h3>Now Playing</h3>
        <button className="close-btn" onClick={onClose}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="panel-scroll">
        {song.coverUrl
          ? <img src={song.coverUrl} alt="" className="panel-cover"/>
          : <div className="panel-cover-ph">🎵</div>}

        <div className="panel-info">
          <div className="panel-top-row">
            <div className="panel-titles">
              <div className="panel-title">{song.title}</div>
              <div className="panel-artist">{song.artist}</div>
            </div>
            <button className={`icon-btn ${isLiked ? 'liked' : ''}`} onClick={() => toggleLike(song)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
          </div>

          <div className="panel-action-row">
            <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onPlay}>
              {isPlaying ? '⏸ Pause' : '▶ Play Song'}
            </button>
            <button className="btn-outline" onClick={() => onDownload(song)}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {song.offline ? 'Saved ✓' : 'Save Offline'}
            </button>
            <button className="btn-outline" onClick={() => onRingtone(song)}>✂️</button>
          </div>

          <div className="panel-meta">
            {song.album    && <div className="meta-row"><span className="meta-label">Album</span><span className="meta-value">{song.album}</span></div>}
            {song.year     && <div className="meta-row"><span className="meta-label">Year</span><span className="meta-value">{song.year}</span></div>}
            {song.duration > 0 && <div className="meta-row"><span className="meta-label">Duration</span><span className="meta-value">{fmt(song.duration)}</span></div>}
            {song.singers  && <div className="meta-row"><span className="meta-label">Singers</span><span className="meta-value">{song.singers}</span></div>}
            {song.label    && <div className="meta-row"><span className="meta-label">Label</span><span className="meta-value">{song.label}</span></div>}
            {song.language && <div className="meta-row"><span className="meta-label">Language</span><span className="meta-value" style={{ textTransform: 'capitalize' }}>{song.language}</span></div>}
            <div className="meta-row">
              <span className="meta-label">Quality</span>
              <span className="quality-badge">{song.offline ? '📴 Offline' : '🎧 320kbps HD'}</span>
            </div>
          </div>

          <div className="lyrics-section">
            <div className="panel-section-title">LYRICS</div>
            {lyricsBusy ? (
              <div className="lyrics-loading">
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}/>
                <span>Loading lyrics...</span>
              </div>
            ) : lyrics ? (
              <div className="lyrics-text">
                {lyrics.split('\n').map((line, i) => (
                  <p key={i} className="lyrics-line">{line || <br/>}</p>
                ))}
              </div>
            ) : lyricsNone ? (
              <div className="lyrics-empty"><span>🎵</span><p>Lyrics not available.</p></div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, likedCount, dlCount, onPlaylistSearch }) {
  const navItems = [
    { id: 'home',      label: 'Home',     icon: '🏠' },
    { id: 'search',    label: 'Search',   icon: '🔍' },
    { id: 'liked',     label: `Liked Songs${likedCount > 0 ? ` (${likedCount})` : ''}`, icon: '❤️' },
    { id: 'downloads', label: `Downloads${dlCount > 0 ? ` (${dlCount})` : ''}`, icon: '⬇️' },
  ];
  const playlists = [
    { label: '🎵 My Top Songs',         term: 'top hits 2025' },
    { label: '⭐ Tamil Kuthu Hits',     term: 'tamil kuthu hits' },
    { label: '📻 Evergreen Retro',      term: 'evergreen retro hits' },
    { label: '🎹 A.R. Rahman Specials', term: 'ar rahman hits' },
  ];
  return (
    <div className="sidebar">
      <div className="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <span className="logo-text">SoundWave</span>
      </div>
      <div className="sidebar-scroll">
        {navItems.map(n => (
          <button key={n.id} className={`nav-item ${activeTab === n.id ? 'active' : ''}`} onClick={() => setActiveTab(n.id)}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
          </button>
        ))}
        <div className="nav-label">Your Playlists</div>
        {playlists.map(pl => (
          <button key={pl.term} className="pl-item" onClick={() => onPlaylistSearch(pl.term, pl.label)}>{pl.label}</button>
        ))}
      </div>
    </div>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────
function Topbar({ q, setQ, activeLang, setLang, onSearch, onSuggestionClick }) {
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
    </div>
  );
}

// ─── PLAYER BAR ──────────────────────────────────────────────────────────────
function PlayerBar({ currentSong, isPlaying, setIsPlaying, playNext, playPrev,
                     liked, toggleLike, onRingtone, onDetails, showToast, shuffle, setShuffle,
                     onDownload }) {
  const audioRef  = useRef(null);
  const [curTime, setCurTime] = useState(0);
  const [dur,     setDur]     = useState(0);
  const [vol,     setVol]     = useState(0.85);
  const [muted,   setMuted]   = useState(false);
  const [repeat,  setRepeat]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);

  // KEY: Resolve a fresh signed stream URL every time the song changes
  useEffect(() => {
    if (!currentSong) { setStreamUrl(null); return; }

    // Offline song → use blob URL directly
    if (currentSong.localUrl) {
      setStreamUrl(currentSong.localUrl);
      return;
    }

    // Online song → fetch fresh signed token URL
    setStreamUrl(null);
    setLoading(true);
    showToast(`▶️ Loading: ${currentSong.title}...`);

    getStreamUrl(currentSong.id)
      .then(fresh => {
        setStreamUrl(fresh.streamUrl);
        setLoading(false);
      })
      .catch(err => {
        console.error('getStreamUrl error:', err);
        setLoading(false);
        setIsPlaying(false);
        showToast('⚠️ Could not load stream. Try again.');
      });
  }, [currentSong?.id, currentSong?.localUrl]); // eslint-disable-line

  // Load audio element whenever streamUrl changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    setCurTime(0); setDur(0); setLoading(true);
    a.src = streamUrl;
    a.load();
  }, [streamUrl]);

  // Play / pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !streamUrl) return;
    if (isPlaying) {
      const tryPlay = () => {
        a.play()
          .then(() => setLoading(false))
          .catch(err => {
            console.error('play error:', err);
            setLoading(false);
            setIsPlaying(false);
            showToast('⚠️ Playback failed. Try another song.');
          });
      };
      if (a.readyState >= 3) tryPlay();
      else a.addEventListener('canplay', tryPlay, { once: true });
    } else {
      a.pause();
    }
  }, [isPlaying, streamUrl, setIsPlaying, showToast]);

  // Volume
  useEffect(() => { if (audioRef.current) audioRef.current.volume = muted ? 0 : vol; }, [vol, muted]);

  // Media Session API for lock screen / headphone controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title, artist: currentSong.artist, album: currentSong.album || '',
      artwork: currentSong.coverUrl ? [{ src: currentSong.coverUrl, sizes: '300x300', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play',          () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause',         () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler('nexttrack',     playNext);
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
  }, [currentSong?.id, playNext, playPrev, setIsPlaying]);

  // Spacebar shortcut
  useEffect(() => {
    const kd = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener('keydown', kd);
    return () => window.removeEventListener('keydown', kd);
  }, [setIsPlaying]);

  const onTimeUpdate = () => {
    const a = audioRef.current;
    if (a) { setCurTime(a.currentTime); if (a.duration && !isNaN(a.duration)) setDur(a.duration); }
  };
  const onLoaded = () => {
    setLoading(false);
    const a = audioRef.current;
    if (a?.duration && !isNaN(a.duration)) setDur(a.duration);
  };
  const onAudioError = (e) => {
    console.error('Audio error:', e.nativeEvent || e);
    setLoading(false);
    if (currentSong && !currentSong.localUrl) {
      showToast('⚠️ Stream error — trying next song...');
      setTimeout(playNext, 1200);
    } else {
      setIsPlaying(false);
      showToast('⚠️ Playback error.');
    }
  };
  const onEnded = () => { if (repeat && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } else playNext(); };
  const onSeek  = e => { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); if (audioRef.current && dur) audioRef.current.currentTime = pct * dur; };
  const onVol   = e => { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); setVol(pct); if (pct > 0) setMuted(false); };

  const prog   = dur ? (curTime / dur) * 100 : 0;
  const volPct = muted ? 0 : vol * 100;
  const isLiked = currentSong ? liked(currentSong.id) : false;

  if (!currentSong) return (
    <div className="player">
      <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, gap: 10 }}>
        <span>🎵</span> Select any song to play — 100% free, full songs, no login required
      </div>
    </div>
  );

  return (
    <div className="player">
      <audio ref={audioRef} preload="auto"
        onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoaded}
        onCanPlay={onLoaded} onEnded={onEnded} onError={onAudioError}/>

      {/* Left */}
      <div className="p-left">
        {currentSong.coverUrl ? <img src={currentSong.coverUrl} alt="" className="p-img"/> : <div className="p-img-ph">🎵</div>}
        <div className="p-info" onClick={() => onDetails(currentSong)}>
          <h4>{currentSong.title}</h4>
          <p>{currentSong.artist}{currentSong.year ? ` • ${currentSong.year}` : ''}</p>
        </div>
        <div className="p-left-acts">
          {currentSong.offline && <span className="offline-badge">📴</span>}
          <button className={`icon-btn ${isLiked ? 'liked' : ''}`} onClick={() => toggleLike(currentSong)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Center */}
      <div className="p-center">
        <div className="p-controls">
          <button className={`ctrl-btn ${shuffle ? 'on' : ''}`} onClick={() => setShuffle(s => !s)} title="Shuffle">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
          </button>
          <button className="ctrl-btn" onClick={playPrev}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button className="play-btn" onClick={() => setIsPlaying(p => !p)}>
            {loading
              ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}/>
              : isPlaying
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <button className="ctrl-btn" onClick={playNext}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button className={`ctrl-btn ${repeat ? 'on' : ''}`} onClick={() => setRepeat(r => !r)} title="Repeat">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </button>
        </div>
        <div className="prog-wrap">
          <span className="p-time">{fmt(curTime)}</span>
          <div className="prog-track" onClick={onSeek}>
            <div className="prog-fill" style={{ width: `${prog}%` }}/>
            <div className="prog-dot" style={{ left: `${prog}%` }}/>
          </div>
          <span className="p-time">{fmt(dur || currentSong.duration)}</span>
        </div>
      </div>

      {/* Right */}
      <div className="p-right">
        <button className="act-btn rt" onClick={() => onRingtone(currentSong)}>✂️ Ringtone</button>
        <button className="act-btn" onClick={() => onDownload(currentSong)}>
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download
        </button>
        <div className="vol-wrap">
          <button className="ctrl-btn" onClick={() => setMuted(m => !m)}>
            {muted || vol === 0
              ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
          </button>
          <div className="vol-track" onClick={onVol}>
            <div className="vol-fill" style={{ width: `${volPct}%` }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SONG CARD & ROW ─────────────────────────────────────────────────────────
function SongCard({ song, isActive, isPlaying, onPlay, onDetails }) {
  return (
    <div className={`song-card ${isActive ? 'now-playing' : ''}`}
      onClick={() => { onPlay(); onDetails(song); }}>
      {song.coverUrl ? <img src={song.coverUrl} alt="" loading="lazy"/> : <div className="sc-ph">🎵</div>}
      <button className="card-play" onClick={e => { e.stopPropagation(); onPlay(); }}>
        {isActive && isPlaying
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="black"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>}
      </button>
      {song.offline && <span className="card-offline-badge">📴</span>}
      <h4 style={{ color: isActive ? 'var(--accent)' : undefined }}>{song.title}</h4>
      <p>{song.artist}</p>
    </div>
  );
}

function SongRow({ song, idx, isActive, isPlaying, onPlay, onDownload, onLike, liked, onRingtone, onDetails, onDelete }) {
  return (
    <div className={`song-row ${isActive ? 'now-playing' : ''}`}
      onClick={() => { onPlay(); onDetails(song); }}>
      <div className="row-num">
        {isActive && isPlaying
          ? <div className="eq"><span/><span/><span/></div>
          : <span style={{ color: isActive ? 'var(--accent)' : undefined }}>{idx + 1}</span>}
      </div>
      <div className="row-info">
        {song.coverUrl ? <img src={song.coverUrl} alt="" loading="lazy"/> : <div className="r-ph">🎵</div>}
        <div className="row-text">
          <h4 style={{ color: isActive ? 'var(--accent)' : undefined }}>{song.title}</h4>
          <p>{song.artist}{song.year ? ` • ${song.year}` : ''}{song.offline ? ' 📴' : ''}</p>
        </div>
      </div>
      <div className="row-album">{song.album}</div>
      <div className="row-dur">{song.duration > 0 ? fmt(song.duration) : '—'}</div>
      <div className="row-acts">
        <button className={`icon-btn ${liked ? 'liked' : ''}`} onClick={e => { e.stopPropagation(); onLike(song); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        <button className="icon-btn" title="Save offline" onClick={e => { e.stopPropagation(); onDownload(song); }}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        {onRingtone && (
          <button className="icon-btn" title="Ringtone" onClick={e => { e.stopPropagation(); onRingtone(song); }}>✂️</button>
        )}
        {onDelete && (
          <button className="icon-btn" title="Remove" onClick={e => { e.stopPropagation(); onDelete(song); }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab,       setActiveTab]       = useState('home');
  const [searchQ,         setSearchQ]         = useState('');
  const [activeLang,      setActiveLang]      = useState('All');
  const [playlist,        setPlaylist]        = useState([]);
  const [currentIndex,    setCurrentIndex]    = useState(0);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [toastMsg,        setToastMsg]        = useState('');
  const toastTimer = useRef(null);

  const [homeData,        setHomeData]        = useState({});
  const [homeLoading,     setHomeLoading]     = useState(true);
  const [searchResults,   setSearchResults]   = useState([]);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const [searched,        setSearched]        = useState(false);

  const [likedSongs,      setLikedSongs]      = useState(() => LS.get('sw_liked', []));
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [recentlyPlayed,  setRecentlyPlayed]  = useState(() => LS.get('sw_recent', []));
  const [ringtoneTarget,  setRingtoneTarget]  = useState(null);
  const [detailSong,      setDetailSong]      = useState(null);
  const [shuffle,         setShuffle]         = useState(false);

  const currentSong = playlist[currentIndex] || null;
  const panelOpen   = !!detailSong;

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3500);
  }, []);

  // Load offline library
  useEffect(() => {
    listOfflineTracks()
      .then(records => setDownloadedSongs(records.map(r => ({ ...r.song, offline: true, localUrl: blobUrlForTrack(r) }))))
      .catch(console.error);
  }, []);

  // Home feed
  useEffect(() => {
    setHomeLoading(true);
    Promise.all(
      HOME_SECTIONS.map(sec =>
        searchSongs(sec.term, 12)
          .then(songs => ({ key: sec.key, label: sec.label, songs }))
          .catch(() => ({ key: sec.key, label: sec.label, songs: [] }))
      )
    ).then(results => {
      const data = {};
      results.forEach(r => { data[r.key] = r; });
      setHomeData(data);
      const all = results.flatMap(r => r.songs);
      if (all.length && !playlist.length) { setPlaylist(all); setCurrentIndex(0); }
    }).finally(() => setHomeLoading(false));
  }, []); // eslint-disable-line

  const addRecent = useCallback((song) => {
    setRecentlyPlayed(prev => {
      const next = [song, ...prev.filter(s => s.id !== song.id)].slice(0, 8);
      LS.set('sw_recent', next);
      return next;
    });
  }, []);

  const playSong = useCallback(async (song, context, contextIdx) => {
    if (!song) return;

    // Check offline cache first
    const offline = await getOfflineTrack(song.id).catch(() => null);
    if (offline) {
      const localUrl = blobUrlForTrack(offline);
      const enriched = { ...song, ...offline.song, offline: true, localUrl };
      const ctxWithOffline = (context || []).map(s => s.id === song.id ? enriched : s);
      setPlaylist(ctxWithOffline.length ? ctxWithOffline : [enriched]);
      setCurrentIndex(ctxWithOffline.findIndex(s => s.id === song.id));
      setIsPlaying(true);
      addRecent(enriched);
      setDetailSong(enriched);
      return;
    }

    // Online: set playlist and let PlayerBar fetch fresh stream
    const ctx = context || [song];
    setPlaylist(ctx);
    setCurrentIndex(contextIdx != null ? contextIdx : ctx.findIndex(s => s.id === song.id));
    setIsPlaying(true);
    addRecent(song);
    setDetailSong(song);
  }, [addRecent]);

  const playNext = useCallback(() => {
    if (!playlist.length) return;
    let next = shuffle && playlist.length > 1
      ? (() => { let i; do { i = Math.floor(Math.random() * playlist.length); } while (i === currentIndex); return i; })()
      : (currentIndex + 1) % playlist.length;
    setCurrentIndex(next);
    setIsPlaying(true);
    if (playlist[next]) addRecent(playlist[next]);
  }, [playlist, currentIndex, shuffle, addRecent]);

  const playPrev = useCallback(() => {
    if (!playlist.length) return;
    const prev = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prev);
    setIsPlaying(true);
    if (playlist[prev]) addRecent(playlist[prev]);
  }, [playlist, currentIndex, addRecent]);

  const isLiked    = useCallback((id) => likedSongs.some(s => s.id === id), [likedSongs]);
  const toggleLike = useCallback((song) => {
    setLikedSongs(prev => {
      const already = prev.some(s => s.id === song.id);
      const next    = already ? prev.filter(s => s.id !== song.id) : [...prev, song];
      LS.set('sw_liked', next);
      showToast(already ? '💔 Removed from Liked Songs' : '❤️ Added to Liked Songs');
      return next;
    });
  }, [showToast]);

  // Download & save offline
  const handleDownload = useCallback(async (song) => {
    if (song.offline) { showToast('✅ Already saved offline!'); return; }
    showToast(`⬇️ Saving offline: ${song.title}...`);
    try {
      // Always fetch a fresh stream URL before downloading
      const fresh = await getStreamUrl(song.id);
      const blob  = await fetchStreamBlob(fresh.audioUrl);
      await saveOfflineTrack({ ...song, audioUrl: fresh.audioUrl, streamUrl: fresh.streamUrl }, blob);
      const localUrl = URL.createObjectURL(blob);
      const offlineSong = { ...song, offline: true, localUrl };
      setDownloadedSongs(prev => prev.some(s => s.id === song.id) ? prev : [...prev, offlineSong]);
      showToast(`✅ Saved offline: ${song.title}`);
    } catch (e) {
      console.error('Download error:', e);
      showToast(`❌ Download failed: ${e.message}`);
    }
  }, [showToast]);

  const handleDeleteOffline = useCallback(async (song) => {
    try {
      await deleteOfflineTrack(song.id);
      setDownloadedSongs(prev => prev.filter(s => s.id !== song.id));
      showToast(`🗑️ Removed: ${song.title}`);
    } catch { showToast('❌ Delete failed.'); }
  }, [showToast]);

  const openRingtone = useCallback(async (song) => {
    showToast('✂️ Preparing ringtone cutter...');
    try {
      const fresh = await getStreamUrl(song.id);
      setRingtoneTarget({ ...song, audioUrl: fresh.audioUrl, streamUrl: fresh.streamUrl });
    } catch { showToast('⚠️ Could not prepare ringtone.'); }
  }, [showToast]);

  const doSearch = useCallback(async (override) => {
    const q = (override ?? searchQ).trim();
    if (!q) return;
    setActiveTab('search'); setSearched(true); setSearchLoading(true);
    try {
      const langObj = LANG_QUERIES.find(l => l.label === activeLang);
      const term    = langObj?.term ? `${q} ${langObj.term}` : q;
      const songs   = await searchSongs(term, 50);
      setSearchResults(songs);
      if (songs.length) { setPlaylist(songs); setCurrentIndex(0); }
      else showToast('No results found.');
    } catch { showToast('⚠️ Search failed.'); }
    finally { setSearchLoading(false); }
  }, [searchQ, activeLang, showToast]);

  const handleSuggestionClick = useCallback((song) => {
    setSearchResults([song]); setPlaylist([song]); setCurrentIndex(0);
    setIsPlaying(true); setDetailSong(song); addRecent(song);
    setActiveTab('search'); setSearched(true);
  }, [addRecent]);

  const handlePlaylistSearch = useCallback((term, label) => {
    setSearchQ(term); setActiveTab('search'); setSearched(true); setSearchLoading(true);
    searchSongs(term, 40)
      .then(songs => { setSearchResults(songs); if (songs.length) { setPlaylist(songs); setCurrentIndex(0); } showToast(`📂 ${label}`); })
      .catch(() => showToast('⚠️ Could not load.'))
      .finally(() => setSearchLoading(false));
  }, [showToast]);

  const handleLangChip = useCallback((lang) => {
    setActiveLang(lang);
    if (lang === 'All') { setActiveTab('home'); return; }
    const langObj = LANG_QUERIES.find(l => l.label === lang);
    if (!langObj?.term) return;
    setSearchQ(lang); setSearched(true); setActiveTab('search'); setSearchLoading(true);
    searchSongs(langObj.term, 40)
      .then(songs => { setSearchResults(songs); if (songs.length) { setPlaylist(songs); setCurrentIndex(0); } })
      .catch(() => showToast('⚠️ Could not load.'))
      .finally(() => setSearchLoading(false));
  }, [showToast]);

  // ── Views ──
  const HomeView = () => (
    <>
      {recentlyPlayed.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="sec-title">Recently Played</div>
          <div className="quick-grid">
            {recentlyPlayed.map((song, i) => {
              const isA = currentSong?.id === song.id;
              return (
                <div key={song.id} className={`quick-card ${isA ? 'now-playing' : ''}`}
                  onClick={() => playSong(song, recentlyPlayed, i)}>
                  {song.coverUrl ? <img src={song.coverUrl} alt=""/> : <div className="qph">🎵</div>}
                  <span className="quick-card-name" style={{ color: isA ? 'var(--accent)' : undefined }}>{song.title}</span>
                  <button className="qplay-btn" onClick={e => { e.stopPropagation(); playSong(song, recentlyPlayed, i); }}>
                    {isA && isPlaying
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="black"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      : <svg width="13" height="13" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {homeLoading ? (
        <div className="spinner-wrap"><div className="spinner"/><p style={{ color: 'var(--text-muted)' }}>Loading music feed...</p></div>
      ) : (
        HOME_SECTIONS.map(sec => {
          const d = homeData[sec.key];
          if (!d?.songs?.length) return null;
          return (
            <div key={sec.key}>
              <div className="sec-head">
                <h3>{sec.label}</h3>
                <button className="see-all" onClick={() => { setSearchQ(sec.term); doSearch(sec.term); }}>See All</button>
              </div>
              <div className="song-scroll">
                {d.songs.map((song, i) => (
                  <SongCard key={song.id} song={song}
                    isActive={currentSong?.id === song.id} isPlaying={isPlaying}
                    onPlay={() => playSong(song, d.songs, i)}
                    onDetails={setDetailSong}/>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );

  const SearchView = () => {
    if (searchLoading) return <div className="spinner-wrap"><div className="spinner"/><p style={{ color: 'var(--text-muted)' }}>Searching...</p></div>;
    if (!searched) return (
      <div className="empty">
        <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <h3>Search songs, movies, artists</h3>
        <p>Type in the search box — live suggestions appear as you type</p>
      </div>
    );
    if (!searchResults.length) return <div className="empty"><h3>No results found</h3><p>Try a different query</p></div>;
    return (
      <>
        <div style={{ marginBottom: 14, color: 'var(--text-secondary)', fontSize: 12 }}>{searchResults.length} results</div>
        <div className="table-head"><span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span></div>
        <div className="song-table">
          {searchResults.map((song, i) => (
            <SongRow key={song.id} song={song} idx={i}
              isActive={currentSong?.id === song.id} isPlaying={isPlaying}
              onPlay={() => playSong(song, searchResults, i)}
              onDownload={handleDownload} onLike={toggleLike}
              liked={isLiked(song.id)} onRingtone={openRingtone}
              onDetails={setDetailSong}/>
          ))}
        </div>
      </>
    );
  };

  const LikedView = () => likedSongs.length === 0 ? (
    <div className="empty"><span style={{ fontSize: 48 }}>❤️</span><h3>No liked songs yet</h3><p>Tap ❤️ on any song</p></div>
  ) : (
    <>
      <div className="sec-title">❤️ Liked Songs ({likedSongs.length})</div>
      <div className="table-head"><span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span></div>
      <div className="song-table">
        {likedSongs.map((song, i) => (
          <SongRow key={song.id} song={song} idx={i}
            isActive={currentSong?.id === song.id} isPlaying={isPlaying}
            onPlay={() => playSong(song, likedSongs, i)}
            onDownload={handleDownload} onLike={toggleLike}
            liked={isLiked(song.id)} onRingtone={openRingtone}
            onDetails={setDetailSong}/>
        ))}
      </div>
    </>
  );

  const DownloadsView = () => downloadedSongs.length === 0 ? (
    <div className="empty">
      <span style={{ fontSize: 48 }}>📴</span>
      <h3>No offline songs yet</h3>
      <p>Click ⬇️ on any song to save it for offline use</p>
      <small style={{ color: 'var(--text-muted)', marginTop: 8, display: 'block' }}>Plays without internet once saved!</small>
    </div>
  ) : (
    <>
      <div className="sec-title">📴 Offline Library ({downloadedSongs.length} songs)</div>
      <div className="table-head"><span>#</span><span>SONG</span><span>ALBUM</span><span>DURATION</span><span></span></div>
      <div className="song-table">
        {downloadedSongs.map((song, i) => (
          <SongRow key={song.id} song={song} idx={i}
            isActive={currentSong?.id === song.id} isPlaying={isPlaying}
            onPlay={() => playSong(song, downloadedSongs, i)}
            onDownload={handleDownload} onLike={toggleLike}
            liked={isLiked(song.id)} onRingtone={openRingtone}
            onDetails={setDetailSong}
            onDelete={handleDeleteOffline}/>
        ))}
      </div>
    </>
  );

  return (
    <div className={`app ${panelOpen ? 'panel-open' : ''}`}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab}
        likedCount={likedSongs.length} dlCount={downloadedSongs.length}
        onPlaylistSearch={handlePlaylistSearch}/>

      <div className="body">
        <Topbar q={searchQ} setQ={setSearchQ}
          activeLang={activeLang} setLang={handleLangChip}
          onSearch={() => doSearch()}
          onSuggestionClick={handleSuggestionClick}/>
        <div className="main-scroll">
          {activeTab === 'home'      && <HomeView/>}
          {activeTab === 'search'    && <SearchView/>}
          {activeTab === 'liked'     && <LikedView/>}
          {activeTab === 'downloads' && <DownloadsView/>}
        </div>
      </div>

      {panelOpen && (
        <DetailPanel
          song={detailSong} onClose={() => setDetailSong(null)}
          liked={isLiked} toggleLike={toggleLike}
          onPlay={() => {
            if (currentSong?.id === detailSong?.id) setIsPlaying(p => !p);
            else playSong(detailSong, playlist, playlist.findIndex(s => s.id === detailSong.id));
          }}
          isPlaying={isPlaying && currentSong?.id === detailSong?.id}
          showToast={showToast} onDownload={handleDownload} onRingtone={openRingtone}/>
      )}

      <PlayerBar
        currentSong={currentSong} isPlaying={isPlaying}
        setIsPlaying={setIsPlaying} playNext={playNext} playPrev={playPrev}
        liked={isLiked} toggleLike={toggleLike}
        onRingtone={openRingtone} onDetails={setDetailSong}
        showToast={showToast} shuffle={shuffle} setShuffle={setShuffle}
        onDownload={handleDownload}/>

      {ringtoneTarget && (
        <RingtoneModal song={ringtoneTarget} onClose={() => setRingtoneTarget(null)} showToast={showToast}/>
      )}
      <Toast msg={toastMsg}/>
    </div>
  );
}

// ─── WAV ENCODER ─────────────────────────────────────────────────────────────
function audioBufferToWav(buf) {
  const numCh = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
  const bps = 16, br = sr * numCh * 2, ba = numCh * 2, ds = n * numCh * 2;
  const ab = new ArrayBuffer(44 + ds), v = new DataView(ab);
  const ws = (off, str) => { for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + ds, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
  v.setUint32(24, sr, true); v.setUint32(28, br, true); v.setUint16(32, ba, true); v.setUint16(34, bps, true);
  ws(36, 'data'); v.setUint32(40, ds, true);
  let off = 44;
  for (let i = 0; i < n; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(ch)[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2;
    }
  }
  return ab;
}
