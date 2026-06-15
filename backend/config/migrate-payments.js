/* Payments migration — manual payment verification (InstaPay / Vodafone Cash).
   Idempotent: safe to run multiple times.
   Run:  node config/migrate-payments.js                                       */
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
  console.log('Payments migration starting…');

  // ── orders: widen payment ENUMs (idempotent — re-applying same DDL is safe) ──
  await pool.query(`
    ALTER TABLE orders
      MODIFY COLUMN payment_method ENUM('COD','instapay','vodafone_cash')
        NOT NULL DEFAULT 'COD'
  `);
  await pool.query(`
    ALTER TABLE orders
      MODIFY COLUMN payment_status
        ENUM('pending','paid','refunded','pending_verification','verified','rejected')
        NOT NULL DEFAULT 'pending'
  `);
  console.log('  ✓ orders payment ENUMs widened');

  // ── orders: proof + verification columns ─────────────────────
  await addColumn('orders', 'payment_proof',       "payment_proof VARCHAR(500) AFTER payment_status");
  await addColumn('orders', 'payment_verified_at',  "payment_verified_at DATETIME AFTER payment_proof");
  await addColumn('orders', 'payment_verified_by',  "payment_verified_by INT UNSIGNED AFTER payment_verified_at");
  await addColumn('orders', 'payment_notes',        "payment_notes TEXT AFTER payment_verified_by");

  // FK for verifying admin (best-effort — skip if it already exists)
  const [[{ fk }]] = await pool.execute(
    `SELECT COUNT(*) AS fk FROM information_schema.table_constraints
     WHERE table_schema = ? AND table_name = 'orders' AND constraint_name = 'fk_orders_verified_by'`,
    [process.env.DB_NAME]
  );
  if (fk === 0) {
    try {
      await pool.query(
        `ALTER TABLE orders ADD CONSTRAINT fk_orders_verified_by
           FOREIGN KEY (payment_verified_by) REFERENCES users(id) ON DELETE SET NULL`
      );
      console.log('  ✓ added FK orders.payment_verified_by → users.id');
    } catch (e) {
      console.log('  · FK orders.payment_verified_by skipped:', e.message);
    }
  }

  // ── settings (generic key/value store) ───────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\`       VARCHAR(100) PRIMARY KEY,
      value      TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('  ✓ settings table ready');

  // Seed default payment settings (INSERT IGNORE — never clobbers admin edits)
  const defaults = [
    ['instapay_name',         'NOOS Store'],
    ['instapay_identifier',   'noos@instapay'],
    ['vodafone_name',         'NOOS Store'],
    ['vodafone_identifier',   '01000000000'],
    ['payment_instructions',  'Transfer the exact order total to the account shown above, then upload a clear screenshot of the successful transfer. Your order will be confirmed once we verify the payment.'],
    ['store_name',            'NOOS'],
    ['free_shipping',         '500'],
    ['newsletter_code',       'NOOS10']
  ];
  for (const [k, v] of defaults) {
    await pool.query('INSERT IGNORE INTO settings (`key`, value) VALUES (?, ?)', [k, v]);
  }
  console.log('  ✓ seeded default payment settings');

  console.log('Payments migration complete.');
  await pool.end();
}

run().catch(e => { console.error('Migration failed:', e); process.exit(1); });
