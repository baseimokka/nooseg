const pool = require('../config/db');

async function findByCode(code) {
  const [rows] = await pool.execute(
    'SELECT * FROM coupons WHERE code = ? AND active = 1',
    [code.toUpperCase()]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getAll() {
  const [rows] = await pool.execute('SELECT * FROM coupons ORDER BY created_at DESC');
  return rows;
}

async function create({ code, discountType, discountValue, minOrderValue, usageLimit, expiresAt }) {
  const [result] = await pool.execute(
    `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, usage_limit, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [code.toUpperCase(), discountType, discountValue, minOrderValue || 0, usageLimit || null, expiresAt || null]
  );
  return result.insertId;
}

async function update(id, { code, discountType, discountValue, minOrderValue, usageLimit, active, expiresAt }) {
  await pool.execute(
    `UPDATE coupons SET code=?, discount_type=?, discount_value=?, min_order_value=?,
     usage_limit=?, active=?, expires_at=? WHERE id=?`,
    [code.toUpperCase(), discountType, discountValue, minOrderValue || 0, usageLimit || null, active ? 1 : 0, expiresAt || null, id]
  );
}

async function deleteById(id) {
  await pool.execute('DELETE FROM coupons WHERE id = ?', [id]);
}

async function incrementUsage(id) {
  await pool.execute('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?', [id]);
}

async function recordUsage(conn, { couponId, userId, orderId }) {
  await conn.execute(
    'INSERT INTO coupon_usages (coupon_id, user_id, order_id) VALUES (?, ?, ?)',
    [couponId, userId || null, orderId]
  );
  await conn.execute('UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?', [couponId]);
}

module.exports = { findByCode, findById, getAll, create, update, deleteById, incrementUsage, recordUsage };
