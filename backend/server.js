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

// Behind the Nginx reverse proxy. Trust the first proxy hop so client IPs and
// X-Forwarded-* headers resolve correctly (required by express-rate-limit).
app.set('trust proxy', 1);

// Security headers. CSP is disabled here because the frontend relies on inline
// scripts/styles and CDN assets; add a tailored CSP before public launch.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { generateSlug } = require('./utils/slug');
const pool = require('./config/db');
const FRONTEND = path.join(__dirname, '../frontend');
const SITE = 'https://nooseg.com';

// ── Clean-URL canonical 301 redirects (old physical paths → clean URLs).
//    Runs BEFORE express.static so the .html files are never served at their
//    old paths. Single hop only — the clean targets below return 200. ─────────
const HTML_TO_CLEAN = {
  '/index.html':             '/',
  '/pages/shop.html':        '/shop',
  '/pages/collections.html': '/collections',
  '/pages/about.html':       '/about',
  '/pages/contact.html':     '/contact',
  '/pages/wishlist.html':    '/wishlist',
  '/pages/orders.html':      '/orders',
  '/pages/profile.html':     '/profile',
  '/pages/checkout.html':    '/checkout',
  '/pages/admin.html':       '/admin'
};
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  // /pages/product.html?id=5 → /product/5
  if (req.path === '/pages/product.html') {
    return req.query.id
      ? res.redirect(301, `/product/${encodeURIComponent(req.query.id)}`)
      : res.redirect(301, '/shop');
  }
  const clean = HTML_TO_CLEAN[req.path];
  if (clean) {
    const qIdx = req.originalUrl.indexOf('?');
    const qs = qIdx >= 0 ? req.originalUrl.slice(qIdx) : '';
    return res.redirect(301, clean + qs);
  }
  next();
});

// Static assets (css, js, images, fonts) + the homepage at "/".
app.use(express.static(FRONTEND));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api', require('./routes/index'));

// Unknown API routes → JSON 404 (must come before page routes so API clients
// never receive the HTML homepage with a 200 status)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// ── SEO: robots.txt + dynamic sitemap.xml ───────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    'User-agent: *\nAllow: /\n' +
    'Disallow: /admin\nDisallow: /checkout\nDisallow: /profile\nDisallow: /orders\nDisallow: /wishlist\n' +
    `Sitemap: ${SITE}/sitemap.xml\n`
  );
});
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const staticPaths = ['/', '/shop', '/collections', '/about', '/contact'];
    const urls = staticPaths.map(p => `  <url><loc>${SITE}${p}</loc></url>`);
    const [products] = await pool.execute('SELECT id, name, updated_at FROM products WHERE active = 1');
    for (const p of products) {
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : '';
      urls.push(`  <url><loc>${SITE}/product/${p.id}/${esc(generateSlug(p.name))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`);
    }
    res.type('application/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.join('\n') + '\n</urlset>\n'
    );
  } catch (e) { next(e); }
});

// ── Clean page routes → physical files ──────────────────────────────────────
const page = file => (req, res) => res.sendFile(path.join(FRONTEND, 'pages', file));
app.get('/shop',        page('shop.html'));
app.get('/collections', page('collections.html'));
app.get('/about',       page('about.html'));
app.get('/contact',     page('contact.html'));
app.get('/wishlist',    page('wishlist.html'));
app.get('/orders',      page('orders.html'));
app.get('/profile',     page('profile.html'));
app.get('/checkout',    page('checkout.html'));
app.get('/admin',       page('admin.html'));
app.get('/product/:id/:slug?', page('product.html'));

// Fallback — serve the homepage for any other non-API GET.
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND, 'index.html'));
});

// Error handler — log the full error server-side, return a generic message
app.use((err, req, res, next) => {
  console.error(err.stack);
  // A UNIQUE constraint was violated (e.g. duplicate product SKU, category slug,
  // coupon code) — return a clear 409 instead of a generic 500.
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'That value already exists — please use a unique SKU / slug / code.' });
  }
  res.status(500).json({ success: false, message: 'Server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NOOS server running on http://localhost:${PORT}`));
