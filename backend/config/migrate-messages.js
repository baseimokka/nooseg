/* Contact messages migration. Idempotent: safe to run multiple times.
   Run:  node config/migrate-messages.js                                  */
require('dotenv').config();
const pool = require('./db');

async function run() {
  console.log('Messages migration starting…');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(120) NOT NULL,
      email      VARCHAR(191) NOT NULL,
      subject    VARCHAR(80)  NOT NULL DEFAULT 'other',
      body       TEXT         NOT NULL,
      is_read    TINYINT(1)   NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_is_read (is_read),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('  ✓ messages table ready');
  console.log('Messages migration complete.');
  await pool.end();
}

run().catch(e => { console.error('Migration failed:', e); process.exit(1); });
