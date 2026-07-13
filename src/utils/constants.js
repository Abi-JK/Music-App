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

// Home sections — verified JioSaavn curated playlist IDs
export const HOME_PLAYLISTS = [
  { key: 'india_top50',   listid: '1134548194',  label: '🔥 India Superhits Top 50' },
  { key: 'tamil_chart',   listid: '1265148713',  label: '🎬 Tamil Chartbusters 2025' },
  { key: 'hindi_top50',   listid: '1134543272',  label: '🎵 Hindi Top 50' },
  { key: 'tamil_90s',     listid: '1170578779',  label: '🎹 Tamil 90s Classics' },
  { key: 'tamil_2000s',   listid: '1170578783',  label: '🎶 Tamil 2000s Hits' },
  { key: 'telugu_2000s',  listid: '1170578805',  label: '🎤 Telugu 2000s' },
  { key: 'telugu_90s',    listid: '1170578801',  label: '🎤 Telugu 90s Classics' },
  { key: 'pop_hindi',     listid: '940775963',   label: '🌍 Best of Pop - Hindi' },
  { key: 'tamil_90s_rom', listid: '833826860',   label: '❤️ Tamil 90s Romantic' },
  { key: 'tamil_rom_2016',listid: '4280738',     label: '❤️ Romantic Hits Tamil' },
];

export const SIDEBAR_PLAYLISTS = [
  { label: '🎵 My Top Songs',         term: 'top hits 2025' },
  { label: '⭐ Tamil Kuthu Hits',     term: 'tamil kuthu hits' },
  { label: '📻 Evergreen Retro',      term: 'evergreen retro hits' },
  { label: '🎹 A.R. Rahman Specials', term: 'ar rahman hits' },
];

// Language terms used for broad multi-language search when "All" is selected
export const BROAD_TERMS = [
  'tamil', 'hindi', 'telugu', 'kannada', 'malayalam', 'punjabi', 'bengali',
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
