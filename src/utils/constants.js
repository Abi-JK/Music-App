// Audius search doesn't organize by film-industry "language" the way JioSaavn
// did — it's an independent-artist catalog. These filters search by keyword,
// so results vary track by track rather than guaranteeing a whole language's
// film catalog. Kept because some independent artists do tag by language.
export const LANG_QUERIES = [
  { label: 'All',       term: '' },
  { label: 'Tamil',     term: 'tamil' },
  { label: 'Hindi',     term: 'hindi' },
  { label: 'English',   term: 'english' },
  { label: 'Telugu',    term: 'telugu' },
  { label: 'Malayalam', term: 'malayalam' },
  { label: 'Kannada',   term: 'kannada' },
  { label: 'Bengali',   term: 'bengali' },
  { label: 'Punjabi',   term: 'punjabi' },
  { label: 'Marathi',   term: 'marathi' },
];

// Home screen sections — genre/mood based, matching what's actually
// available in Audius's independent-artist catalog.
export const HOME_SECTIONS = [
  { key: 'lofi',       label: 'Lo-Fi & Chill',                query: 'lofi chill' },
  { key: 'electronic', label: 'Electronic',                   query: 'electronic' },
  { key: 'hiphop',     label: 'Hip-Hop & Rap',                query: 'hip hop' },
  { key: 'indie',      label: 'Indie & Alternative',          query: 'indie alternative' },
  { key: 'ambient',    label: 'Ambient & Focus',               query: 'ambient instrumental' },
  { key: 'pop',        label: 'Pop',                           query: 'pop' },
  { key: 'world',      label: 'World & Regional',             query: 'world music' },
  { key: 'tamil',      label: 'Tamil (independent artists)',  query: 'tamil' },
  { key: 'hindi',      label: 'Hindi (independent artists)',  query: 'hindi' },
];

export const API = 'https://discoveryprovider.audius.co';
