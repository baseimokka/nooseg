// backend/middleware/ogImage.js
// ──────────────────────────────────────────────────────────────────────────
// On-the-fly Open Graph share images (1200×630 JPEG) so product/page links
// preview correctly on WhatsApp, Facebook, Instagram, X, iMessage & LinkedIn.
//
//   GET /og/product/:id.jpg  → product photo centred on a 1200×630 card
//   GET /og/default.jpg      → NOOS monogram card for non-product pages
//
// Fail-safe: sharp is loaded lazily; if it is unavailable (or an image can't be
// processed) the routes fall back to the raw favicon, so the site keeps working
// and the deploy can't break. Generated cards are cached on disk.
// ──────────────────────────────────────────────────────────────────────────
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const pool   = require('../config/db');

const BACKEND   = path.join(__dirname, '..');
const FRONTEND  = path.join(BACKEND, '../frontend');
const MONOGRAM  = path.join(FRONTEND, 'images/noos-monogram.jpg');
const FAVICON   = path.join(FRONTEND, 'images/favicon.jpg');
const CACHE_DIR = path.join(BACKEND, 'uploads', 'og-cache');
const W = 1200, H = 630;
const MIST = { r: 247, g: 244, b: 238 };          // brand page background

try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch {}

// Lazy, optional sharp — never crash the process if it isn't installed.
let _sharp, _tried = false;
function sharp() {
  if (!_tried) { _tried = true; try { _sharp = require('sharp'); } catch (e) {
    console.warn('ogImage: sharp unavailable, OG images fall back to favicon —', e.message);
    _sharp = null;
  } }
  return _sharp;
}

function localFile(imgPath) {
  if (!imgPath || /^https?:\/\//i.test(imgPath)) return null;
  const rel = imgPath.replace(/^\/+/, '');
  if (!rel.startsWith('uploads/')) return null;
  const file = path.join(BACKEND, rel);
  return fs.existsSync(file) ? file : null;
}

function sendJpeg(res, file) {
  res.type('jpeg');
  res.set('Cache-Control', 'public, max-age=86400');
  return res.sendFile(file);
}

async function card(innerBuffer) {
  return sharp()({ create: { width: W, height: H, channels: 3, background: MIST } })
    .composite([{ input: innerBuffer, gravity: 'centre' }])
    .jpeg({ quality: 84, progressive: true })
    .toBuffer();
}

// ── default (branded) card ──────────────────────────────────────────────────
async function buildDefault() {
  const srcLogo = fs.existsSync(MONOGRAM) ? MONOGRAM : FAVICON;
  const logo = await sharp()(srcLogo).resize(440, 440, { fit: 'inside', withoutEnlargement: false }).toBuffer();
  return card(logo);
}
async function defaultFile() {
  const f = path.join(CACHE_DIR, 'default.jpg');
  if (!fs.existsSync(f)) fs.writeFileSync(f, await buildDefault());
  return f;
}
async function serveDefault(res) {
  try {
    if (!sharp()) return sendJpeg(res, FAVICON);
    return sendJpeg(res, await defaultFile());
  } catch (e) {
    console.error('ogImage(default):', e.message);
    return sendJpeg(res, FAVICON);
  }
}

// ── product card ────────────────────────────────────────────────────────────
async function buildProduct(srcFile) {
  const photo = await sharp()(srcFile).rotate()
    .resize(560, 560, { fit: 'inside', withoutEnlargement: true }).toBuffer();
  return card(photo);
}
async function firstImageUrl(id) {
  const [rows] = await pool.execute(
    'SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1', [id]
  );
  return rows[0] && rows[0].url;
}

async function productOgImage(req, res) {
  try {
    if (!sharp()) return serveDefault(res);
    const src = localFile(await firstImageUrl(req.params.id));
    if (!src) return serveDefault(res);

    const key  = crypto.createHash('md5').update(src + ':' + fs.statSync(src).mtimeMs).digest('hex');
    const file = path.join(CACHE_DIR, key + '.jpg');
    if (!fs.existsSync(file)) fs.writeFileSync(file, await buildProduct(src));
    return sendJpeg(res, file);
  } catch (e) {
    console.error('ogImage(product):', e.message);
    return serveDefault(res);
  }
}

function defaultOgImage(req, res) { return serveDefault(res); }

module.exports = { productOgImage, defaultOgImage };
