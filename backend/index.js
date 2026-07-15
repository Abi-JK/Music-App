// backend/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration: allow Netlify site and any Expo dev scheme (exp://*)
const allowedOrigins = ['https://soundaura.netlify.app'];
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non‑browser requests (e.g., curl, server‑to‑server)
    if (!origin) return callback(null, true);
    if (origin.startsWith('exp://') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
};
app.use(cors(corsOptions));
app.use(express.json());

// Simple in‑memory cache for lyrics
const lyricsCache = new Map();
async function getLyrics(trackId) {
  const cacheKey = `lyrics_${trackId}`;
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }
  const apiKey = process.env.MUSIXMATCH_KEY;
  if (!apiKey) throw new Error('MUSIXMATCH_KEY not set');
  const url = `https://api.musixmatch.com/ws/1.1/track.lyrics.get?track_id=${trackId}&apikey=${apiKey}`;
  const response = await fetch(url);
  const json = await response.json();
  const lyrics = json.message?.body?.lyrics?.lyrics_body || '';
  lyricsCache.set(cacheKey, lyrics);
  return lyrics;
}

app.get('/api/lyrics/:id', async (req, res) => {
  try {
    const lyrics = await getLyrics(req.params.id);
    res.json({ lyrics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
