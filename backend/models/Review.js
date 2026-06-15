const pool = require('../config/db');

async function getByProduct(productId) {
  const [rows] = await pool.execute(
    `SELECT r.*, u.name AS user_name
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ? ORDER BY r.created_at DESC`,
    [productId]
  );
  return rows;
}

async function create({ productId, userId, rating, title, body }) {
  const [result] = await pool.execute(
    'INSERT INTO reviews (product_id, user_id, rating, title, body) VALUES (?, ?, ?, ?, ?)',
    [productId, userId, rating, title || null, body || null]
  );
  return result.insertId;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM reviews WHERE id = ?', [id]);
  return rows[0] || null;
}

async function deleteById(id) {
  await pool.execute('DELETE FROM reviews WHERE id = ?', [id]);
}

module.exports = { getByProduct, create, findById, deleteById };
