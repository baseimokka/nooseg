// backend/middleware/ssrMeta.js
// ──────────────────────────────────────────────────────────────────────────
// Server-side <head> META injection for product pages (/product/:id/:slug).
// Replaces a marker-delimited block
//     <!--SSR_META_START--> … <!--SSR_META_END-->
// in product.html with per-product title · description · canonical · Open Graph
// + Twitter + Product/Breadcrumb JSON-LD, so crawlers and non-JS social scrapers
// (WhatsApp, Facebook, Instagram, X, LinkedIn) get correct tags in the FIRST
// response. The page body and the existing client-side loader are untouched.
//
// Fail-safe: injection/DB error → original file unchanged; product not found
// (or inactive) → real 404. Never emits broken HTML. No user-agent sniffing.
// ──────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const Product = require('../models/Product');
const { generateSlug } = require('../utils/slug');

const FRONTEND       = path.join(__dirname, '../../frontend');
const SITE           = (process.env.SITE_URL || 'https://nooseg.com').replace(/\/+$/, '');
const PRODUCT_FILE   = path.join(FRONTEND, 'pages/product.html');
const NOT_FOUND_FILE = path.join(FRONTEND, '404.html');

const MARKER = /<!--SSR_META_START-->[\s\S]*?<!--SSR_META_END-->/;

const cache = {};
function template(file) {
  if (cache[file] === undefined) cache[file] = fs.readFileSync(file, 'utf8');
  return cache[file];
}

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function jsonLd(obj) { return JSON.stringify(obj).replace(/</g, '\\u003c'); }
function clean(text, max = 160) { return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max); }
function absUrl(u) {
  if (!u) return `${SITE}/og/default.jpg`;
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE}${u.startsWith('/') ? '' : '/'}${u}`;
}

function buildProductMeta(p) {
  const slug  = generateSlug(p.name || '');
  const url   = `${SITE}/product/${p.id}${slug ? '/' + slug : ''}`;
  const photo = absUrl(p.images && p.images[0] && p.images[0].url);   // real photo → JSON-LD
  const ogImg = `${SITE}/og/product/${p.id}.jpg`;                     // generated 1200×630 card
  const desc  = clean(p.description || `Shop ${p.name} at NOOS — men's fashion, cash on delivery across Egypt.`);
  const title = `${p.name} — NOOS`;
  const inStock = Array.isArray(p.variants) && p.variants.length
    ? p.variants.some(v => Number(v.stock) > 0)
    : true;

  const product = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: p.name,
    image: [photo],
    description: desc,
    brand: { '@type': 'Brand', name: p.brand || 'NOOS' },
    category: p.category_name || undefined,
    sku: p.sku || undefined,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'EGP',
      price: Number(p.price).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    }
  };
  if (Number(p.review_count) > 0 && Number(p.rating) > 0) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(p.rating).toFixed(1),
      reviewCount: Number(p.review_count)
    };
  }
  const breadcrumb = {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE}/shop` },
      { '@type': 'ListItem', position: 3, name: p.name, item: url }
    ]
  };

  return `<title>${escAttr(title)}</title>
  <meta name="description" content="${escAttr(desc)}">
  <link rel="canonical" href="${escAttr(url)}">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="NOOS">
  <meta property="og:title" content="${escAttr(title)}">
  <meta property="og:description" content="${escAttr(desc)}">
  <meta property="og:url" content="${escAttr(url)}">
  <meta property="og:image" content="${escAttr(ogImg)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:alt" content="${escAttr(p.name)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(title)}">
  <meta name="twitter:description" content="${escAttr(desc)}">
  <meta name="twitter:image" content="${escAttr(ogImg)}">
  <script type="application/ld+json">${jsonLd([product, breadcrumb])}</script>`;
}

async function renderProduct(req, res) {
  let tpl;
  try { tpl = template(PRODUCT_FILE); }
  catch (e) { return res.sendFile(PRODUCT_FILE); }

  try {
    const p = await Product.findById(req.params.id);
    if (!p || !p.active) return res.status(404).sendFile(NOT_FOUND_FILE);

    const html = tpl.replace(MARKER, buildProductMeta(p));
    if (html === tpl) return res.sendFile(PRODUCT_FILE);   // marker missing → original
    return res.type('html').send(html);
  } catch (e) {
    console.error('ssrMeta(product): serving static fallback —', e.message);
    if (res.headersSent) return;
    return res.sendFile(PRODUCT_FILE);
  }
}

module.exports = { renderProduct, buildProductMeta, MARKER };
