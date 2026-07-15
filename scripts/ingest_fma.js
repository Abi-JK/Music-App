// scripts/ingest_fma.js
// Fetches a subset of the Free Music Archive public dataset and creates catalog.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Example URL – you may replace with a specific query or limit
const API_URL = 'https://freemusicarchive.org/api/get/tracks.json?limit=200';

async function ingest() {
  console.log('Fetching Free Music Archive data...');
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const json = await res.json();
  // Normalize track objects
  const tracks = json.dataset.map(t => ({
    id: t.track_id,
    title: t.track_title,
    artist: t.artist_name,
    url: t.track_listen_url,
    duration: t.track_duration,
    genre: t.genre_title,
    // Additional fields can be added as needed
  }));
  const outPath = path.resolve(__dirname, '../backend/catalog.json');
  fs.writeFileSync(outPath, JSON.stringify(tracks, null, 2), 'utf-8');
  console.log(`Catalog written to ${outPath} with ${tracks.length} tracks`);
}

ingest().catch(err => {
  console.error('Ingestion error:', err);
  process.exit(1);
});
