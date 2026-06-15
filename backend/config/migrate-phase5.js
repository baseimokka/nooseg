/* Phase 5 migration — Hero CMS + homepage/collection controls.
   Idempotent: safe to run multiple times.
   Run:  node config/migrate-phase5.js                                   */
require('dotenv').config();
const pool = require('./db');

async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [process.env.DB_NAME, table, column]
  );
  return rows[0].c > 0;
}

async function addColumn(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`  · ${table}.${column} already exists — skip`);
    return;
  }
  await pool.query(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  console.log(`  ✓ added ${table}.${column}`);
}

async function run() {
  console.log('Phase 5 migration starting…');

  // ── hero_slides ──────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hero_slides (
      id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      media_type     ENUM('image','video','none') NOT NULL DEFAULT 'image',
      desktop_image  VARCHAR(500),
      desktop_video  VARCHAR(500),
      mobile_image   VARCHAR(500),
      mobile_video   VARCHAR(500),
      label          VARCHAR(150),
      title          VARCHAR(150),
      subtitle       VARCHAR(200),
      description    TEXT,
      primary_label  VARCHAR(80),
      primary_href   VARCHAR(255),
      secondary_label VARCHAR(80),
      secondary_href  VARCHAR(255),
      sort_order     INT UNSIGNED NOT NULL DEFAULT 0,
      enabled        TINYINT(1) NOT NULL DEFAULT 1,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_enabled (enabled),
      INDEX idx_sort (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('  ✓ hero_slides table ready');

  // ── categories: subtitle + home/collections flags ───────────
  await addColumn('categories', 'subtitle', "subtitle VARCHAR(200) AFTER name");
  await addColumn('categories', 'featured_home', "featured_home TINYINT(1) NOT NULL DEFAULT 0");
  await addColumn('categories', 'show_in_collections', "show_in_collections TINYINT(1) NOT NULL DEFAULT 1");

  // ── products: explicit home-section flags ────────────────────
  await addColumn('products', 'home_new', "home_new TINYINT(1) NOT NULL DEFAULT 0");
  await addColumn('products', 'home_bestseller', "home_bestseller TINYINT(1) NOT NULL DEFAULT 0");

  // ── Seed sensible defaults (only if nothing configured yet) ──
  // Feature the first 6 categories on home if none flagged.
  const [[{ fc }]] = await pool.query('SELECT COUNT(*) AS fc FROM categories WHERE featured_home = 1');
  if (fc === 0) {
    await pool.query(
      'UPDATE categories SET featured_home = 1 WHERE active = 1 ORDER BY sort_order ASC LIMIT 6'
    );
    console.log('  ✓ seeded featured_home on first 6 categories');
  }

  // Backfill home flags from existing badges if none set yet.
  const [[{ hn }]] = await pool.query('SELECT COUNT(*) AS hn FROM products WHERE home_new = 1 OR home_bestseller = 1');
  if (hn === 0) {
    await pool.query("UPDATE products SET home_new = 1 WHERE badge = 'new' AND active = 1");
    await pool.query("UPDATE products SET home_bestseller = 1 WHERE badge = 'bestseller' AND active = 1");
    console.log('  ✓ backfilled home_new / home_bestseller from badges');
  }

  // Seed one default hero slide if table empty.
  const [[{ hs }]] = await pool.query('SELECT COUNT(*) AS hs FROM hero_slides');
  if (hs === 0) {
    await pool.query(
      `INSERT INTO hero_slides
        (media_type, desktop_image, mobile_image, label, title, subtitle, description,
         primary_label, primary_href, secondary_label, secondary_href, sort_order, enabled)
       VALUES ('image','images/hero-ss26.avif','images/hero-ss26.avif',
         'Summer Collection 2026','NOOS','Never Out Of Stock',
         'Premium essentials designed for everyday wear — restocked the moment they sell out.',
         'Shop Now','pages/shop.html','Explore Collection','pages/collections.html', 1, 1)`
    );
    console.log('  ✓ seeded default hero slide');
  }

  console.log('Phase 5 migration complete.');
  await pool.end();
}

run().catch(e => { console.error('Migration failed:', e); process.exit(1); });
