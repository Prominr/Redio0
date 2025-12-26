const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// API endpoint for games
app.get('/api/games', (req, res) => {
  const games = require('./public/games.json');
  res.json(games);
});

// API endpoint for apps
app.get('/api/apps', (req, res) => {
  const apps = require('./public/apps.json');
  res.json(apps);
});

// Proxy endpoint (basic version)
app.get('/proxy', (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('URL parameter required');
  }
  // For a real proxy, you'd need more complex middleware
  // For now, just redirect
  res.redirect(url);
});

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Redio running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
});