const pool = require('../config/db');

// Keys exposed publicly (checkout payment instructions). Never leak everything.
const PUBLIC_KEYS = [
  'instapay_name', 'instapay_identifier',
  'vodafone_name', 'vodafone_identifier',
  'payment_instructions', 'free_shipping', 'store_name'
];

async function getMap() {
  const [rows] = await pool.execute('SELECT `key`, value FROM settings');
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

async function getPublic() {
  const map = await getMap();
  const out = {};
  for (const k of PUBLIC_KEYS) if (map[k] !== undefined) out[k] = map[k];
  return out;
}

async function setMany(obj) {
  const entries = Object.entries(obj).filter(([k]) => typeof k === 'string' && k.length);
  for (const [key, value] of entries) {
    await pool.execute(
      'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [key, value == null ? null : String(value)]
    );
  }
}

module.exports = { getMap, getPublic, setMany, PUBLIC_KEYS };
