const pool = require('../config/db');

const FIELDS = [
  'media_type', 'desktop_image', 'desktop_video', 'mobile_image', 'mobile_video',
  'label', 'title', 'subtitle', 'description',
  'primary_label', 'primary_href', 'secondary_label', 'secondary_href',
  'sort_order', 'enabled'
];

async function getEnabled() {
  const [rows] = await pool.execute(
    'SELECT * FROM hero_slides WHERE enabled = 1 ORDER BY sort_order ASC, id ASC'
  );
  return rows;
}

async function getAll() {
  const [rows] = await pool.execute('SELECT * FROM hero_slides ORDER BY sort_order ASC, id ASC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM hero_slides WHERE id = ?', [id]);
  return rows[0] || null;
}

function pick(data) {
  return FIELDS.map(f => {
    const v = data[f];
    if (f === 'enabled' || f === 'sort_order') return v == null ? (f === 'enabled' ? 1 : 0) : Number(v);
    return v == null || v === '' ? null : v;
  });
}

async function create(data) {
  const cols = FIELDS.join(', ');
  const placeholders = FIELDS.map(() => '?').join(', ');
  const [result] = await pool.execute(
    `INSERT INTO hero_slides (${cols}) VALUES (${placeholders})`,
    pick(data)
  );
  return result.insertId;
}

async function update(id, data) {
  const setSQL = FIELDS.map(f => `${f} = ?`).join(', ');
  await pool.execute(`UPDATE hero_slides SET ${setSQL} WHERE id = ?`, [...pick(data), id]);
}

async function deleteById(id) {
  await pool.execute('DELETE FROM hero_slides WHERE id = ?', [id]);
}

async function setOrder(orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.execute('UPDATE hero_slides SET sort_order = ? WHERE id = ?', [i + 1, orderedIds[i]]);
  }
}

module.exports = { getEnabled, getAll, findById, create, update, deleteById, setOrder };
