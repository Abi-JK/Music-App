// ─── CONSTANTS ───────────────────────────────────────────────────────────────
// API endpoints — same paths work in both Vite dev (proxy) and Netlify production (redirects)
export const API    = '/saavn-api';
export const SEARCH = '/saavn-search';
export const STREAM = '/saavn-stream';

export const LANG_QUERIES = [
  { label: 'All',       term: '' },
  { label: 'Tamil',     term: 'tamil' },
  { label: 'Hindi',     term: 'hindi' },
  { label: 'English',   term: 'english pop' },
  { label: 'Telugu',    term: 'telugu' },
  { label: 'Malayalam', term: 'malayalam' },
  { label: 'Kannada',   term: 'kannada' },
  { label: 'Punjabi',   term: 'punjabi' },
  { label: 'Bengali',   term: 'bengali' },
  { label: 'Bhojpuri',  term: 'bhojpuri' },
  { label: 'Gujarati',  term: 'gujarati' },
  { label: 'Marathi',   term: 'marathi' },
  { label: 'Odia',      term: 'odia' },
  { label: 'Urdu',      term: 'urdu' },
  { label: 'Devotional',term: 'bhakti songs devotional' },
  { label: '90s Hits',  term: '90s hits' },
  { label: 'Retro',     term: 'retro hits' },
];

export const HOME_SECTIONS = [
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
  { key: 'bengali_new',  term: 'bengali hits 2025',      label: '🎸 Bengali Hits' },
  { key: 'devotional',   term: 'bhakti devotional songs', label: '🛕 Devotional' },
  { key: 'kannada_new',  term: 'kannada hits 2025',      label: '🏔️ Kannada Hits' },
  { key: 'bhojpuri_new', term: 'bhojpuri hits 2025',     label: '🎭 Bhojpuri Hits' },
  { key: 'marathi_new',  term: 'marathi hits 2025',      label: '🎤 Marathi Hits' },
  { key: 'gujarati_new', term: 'gujarati hits 2025',     label: '🎧 Gujarati Hits' },
];

export const SIDEBAR_PLAYLISTS = [
  { label: '🎵 My Top Songs',         term: 'top hits 2025' },
  { label: '⭐ Tamil Kuthu Hits',     term: 'tamil kuthu hits' },
  { label: '📻 Evergreen Retro',      term: 'evergreen retro hits' },
  { label: '🎹 A.R. Rahman Specials', term: 'ar rahman hits' },
];

export const SLEEP_TIMER_OPTIONS = [
  { label: '5 minutes',  value: 5 },
  { label: '10 minutes', value: 10 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour',     value: 60 },
  { label: '2 hours',    value: 120 },
];
