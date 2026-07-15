// backend/routes/download.js
const express = require('express');
const path = require('path');
const router = express.Router();

// In a real app this would stream an actual MP3 file.
// Here we just send a placeholder text file as a demo.
router.get('/:id', (req, res) => {
  const dummyFile = path.join(__dirname, '..', '..', 'public', 'offline.html');
  res.sendFile(dummyFile, err => {
    if (err) res.status(500).json({ error: 'Download error' });
  });
});

module.exports = router;
