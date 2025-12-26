const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const proxyRouter = require('./proxy');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/proxy/', limiter);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/proxy', proxyRouter);

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/games', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/games.html'));
});

app.get('/apps', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/apps.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/settings.html'));
});

app.get('/cloak', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/cloak.html'));
});

// API endpoints
app.get('/api/search-engines', (req, res) => {
  const engines = require('../config/search-engines.json');
  res.json(engines);
});

app.get('/api/games', (req, res) => {
  const games = require('../config/games.json');
  res.json(games);
});

app.get('/api/apps', (req, res) => {
  const apps = require('../config/apps.json');
  res.json(apps);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Redio server running on port ${PORT}`);
  console.log(`Access at: http://localhost:${PORT}`);
});