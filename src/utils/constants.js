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
  { key: 'anirudh',      term: 'anirudh ravichander',    label: '⭐ Anirudh' },
  { key: 'bollywood',    term: 'bollywood hits 2025',    label: '🎬 Bollywood Hits' },
  { key: 'english_pop',  term: 'english pop hits',       label: '🌍 Global Pop' },
  // Actors
  { key: 'actor_vijay',  term: 'vijay hits tamil',       label: '🎬 Vijay Hits' },
  { key: 'actor_surya',  term: 'suriya hits tamil',      label: '🎬 Surya Hits' },
  { key: 'actor_rajini', term: 'rajinikanth hits tamil', label: '🎬 Rajinikanth' },
  { key: 'actor_kamal',  term: 'kamal haasan hits tamil',label: '🎬 Kamal Haasan' },
  { key: 'actor_ajith',  term: 'ajith kumar hits tamil', label: '🎬 Ajith Kumar' },
  { key: 'actor_mgr',    term: 'mgr hits tamil',         label: '🎬 MGR Hits' },
  { key: 'actor_dhanush',term: 'dhanush hits tamil',     label: '🎬 Dhanush' },
  { key: 'actor_vikram', term: 'vikram hits tamil',      label: '🎬 Vikram' },
  // Composers
  { key: 'rahman',       term: 'ar rahman hits',         label: '🏆 A.R. Rahman' },
  { key: 'ilayaraja',    term: 'ilayaraja tamil hits',   label: '📻 Ilayaraja' },
  { key: 'ym',           term: 'yuvan shankar raja hits',label: '🎹 Yuvan Shankar Raja' },
  { key: 'gvp',          term: 'g v prakash hits',       label: '🎹 G.V. Prakash' },
  { key: 'harris_j',     term: 'harris jayaraj hits',    label: '🎹 Harris Jayaraj' },
  { key: 'santhosh_n',   term: 'santhosh narayanan hits',label: '🎹 Santhosh Narayanan' },
  { key: 'sam_cs',       term: 'sam cs hits tamil',      label: '🎹 Sam C.S.' },
  { key: 'd_imman',      term: 'd imman hits tamil',     label: '🎹 D. Imman' },
  { key: 'deva',         term: 'deva hits tamil',        label: '🎹 Deva' },
  // Singers
  { key: 'spb',          term: 's p balasubrahmanyam hits',   label: '🎙️ SPB' },
  { key: 'yesudas',      term: 'k j yesudas hits',            label: '🎙️ K.J. Yesudas' },
  { key: 'sid_sriram',   term: 'siddharth hits',              label: '🎙️ Sid Sriram' },
  { key: 'shreya',       term: 'shreya ghoshal hits',         label: '🎙️ Shreya Ghoshal' },
  { key: 'arijit',       term: 'arijit singh hits',           label: '🎙️ Arijit Singh' },
  { key: 'neha',         term: 'neha kakkar hits',            label: '🎙️ Neha Kakkar' },
  { key: 'chithra',      term: 'k s chithra hits',            label: '🎙️ K.S. Chithra' },
  { key: 's_janaki',     term: 's janaki hits',               label: '🎙️ S. Janaki' },
  { key: 'sonu_nigam',   term: 'sonu nigam hits',             label: '🎙️ Sonu Nigam' },
  // Regional genres
  { key: 'retro_hindi',  term: '90s hindi songs',        label: '🎹 90s Bollywood' },
  { key: 'telugu_new',   term: 'telugu hits 2025',       label: '🎶 Telugu Melodies' },
  { key: 'malayalam_n',  term: 'malayalam hits 2025',    label: '🌴 Malayalam Hits' },
  { key: 'kannada_new',  term: 'kannada hits 2025',      label: '🏔️ Kannada Hits' },
  { key: 'punjabi_new',  term: 'punjabi hits 2025',      label: '🎉 Punjabi Beats' },
  { key: 'bengali_new',  term: 'bengali hits 2025',      label: '🎸 Bengali Hits' },
  { key: 'bhojpuri_new', term: 'bhojpuri hits 2025',     label: '🎭 Bhojpuri Hits' },
  { key: 'marathi_new',  term: 'marathi hits 2025',      label: '🎤 Marathi Hits' },
  { key: 'gujarati_new', term: 'gujarati hits 2025',     label: '🎧 Gujarati Hits' },
  { key: 'devotional',   term: 'bhakti devotional songs', label: '🛕 Devotional' },
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
