// netlify/functions/api.js
// Netlify Function wrapper exposing the Express backend via serverless-http

const serverless = require('serverless-http');
const path = require('path');

// Resolve the backend app (relative to this file)
const app = require(path.resolve(__dirname, '../../backend/index.js'));

exports.handler = serverless(app);
