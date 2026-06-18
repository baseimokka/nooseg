/* Migration — custom arrangement for New Arrivals / Best Sellers.
   Adds per-section order columns so the admin can arrange the homepage.
   Idempotent: safe to run multiple times.
   Run:  node config/migrate-home-order.js                                */
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

// Assign 1..N to the currently-selected products of a section, preserving the
// order they were already shown in (newest first for new, most-reviewed first
// for bestsellers) so the migration doesn't reshuffle a live homepage.
async function backfillOrder(flagCol, orderCol, tiebreak) {
  const [[{ n }]] = await pool.query(
    `SELECT COUNT(*) AS n FROM products WHERE ${flagCol} = 1 AND ${orderCol} > 0`
  );
  if (n > 0) { console.log(`  · ${orderCol} already populated — skip backfill`); return; }
  const [rows] = await pool.query(
    `SELECT id FROM products WHERE ${flagCol} = 1 ORDER BY ${tiebreak}`
  );
  for (let i = 0; i < rows.length; i++) {
    await pool.query(`UPDATE products SET ${orderCol} = ? WHERE id = ?`, [i + 1, rows[i].id]);
  }
  console.log(`  ✓ backfilled ${orderCol} for ${rows.length} products`);
}

async function run() {
  console.log('Home-order migration starting…');

  await addColumn('products', 'home_new_order', 'home_new_order INT NOT NULL DEFAULT 0');
  await addColumn('products', 'home_bestseller_order', 'home_bestseller_order INT NOT NULL DEFAULT 0');

  await backfillOrder('home_new', 'home_new_order', 'created_at DESC, id DESC');
  await backfillOrder('home_bestseller', 'home_bestseller_order', 'review_count DESC, id DESC');

  console.log('Home-order migration complete.');
  await pool.end();
}

run().catch(e => { console.error('Migration failed:', e); process.exit(1); });
