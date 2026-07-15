// backend/routes/tracks.js
const express = require('express');
const router = express.Router();

// Mock track data – multi‑language sample
const mockTracks = [
  { id: '1', title: 'Vinnaithaandi Polae', album: 'Tamil Hits', language: 'Tamil', audioUrl: '/assets/sample1.mp3' },
  { id: '2', title: 'Shape of You', album: 'English Pop', language: 'English', audioUrl: '/assets/sample2.mp3' },
  { id: '3', title: 'Madhurame', album: 'Malayalam Classics', language: 'Malayalam', audioUrl: '/assets/sample3.mp3' },
  { id: '4', title: 'Kal Ho Naa Ho', album: 'Bollywood', language: 'Hindi', audioUrl: '/assets/sample4.mp3' },
];

router.get('/', (req, res) => {
  res.json({ tracks: mockTracks });
});

module.exports = router;
