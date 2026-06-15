require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// ── Fail fast if the environment isn't configured ──────────────
const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`FATAL: missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'noos_super_secret_key_2025') {
  console.error('FATAL: JWT_SECRET is missing, too short, or still the insecure default. Set a strong random value (>= 32 chars).');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');

// Security headers. CSP is disabled here because the frontend relies on inline
// scripts/styles and CDN assets; add a tailored CSP before public launch.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api', require('./routes/index'));

// Unknown API routes → JSON 404 (must come before the SPA fallback so API
// clients never receive the HTML homepage with a 200 status)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler — log the full error server-side, return a generic message
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NOOS server running on http://localhost:${PORT}`));
