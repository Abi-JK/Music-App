// netlify/functions/search.js
// Simple search over catalog.json
const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
  const query = event.queryStringParameters?.q?.toLowerCase() || '';
  try {
    const catalogPath = path.resolve(__dirname, '../../backend/catalog.json');
    const data = fs.readFileSync(catalogPath, 'utf-8');
    const tracks = JSON.parse(data);
    const results = tracks.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.artist.toLowerCase().includes(query) ||
      (t.genre && t.genre.toLowerCase().includes(query))
    );
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(results),
    };
  } catch (err) {
    console.error('Search error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Search failed' }),
    };
  }
};
