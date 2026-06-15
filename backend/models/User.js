const pool = require('../config/db');

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash, phone }) {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, phone || null]
  );
  return result.insertId;
}

async function update(id, { name, phone }) {
  await pool.execute(
    'UPDATE users SET name = ?, phone = ? WHERE id = ?',
    [name, phone || null, id]
  );
}

async function updatePassword(id, passwordHash) {
  await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

async function getAll() {
  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, role, created_at,
            (SELECT COUNT(*) FROM orders WHERE user_id = users.id) AS order_count
     FROM users WHERE role = 'user' ORDER BY created_at DESC`
  );
  return rows;
}

async function deleteById(id) {
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
}

// Addresses
async function getAddresses(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC',
    [userId]
  );
  return rows;
}

async function createAddress(userId, { fullName, phone, city, area, address, postalCode, isDefault }) {
  if (isDefault) {
    await pool.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
  }
  const [result] = await pool.execute(
    'INSERT INTO addresses (user_id, full_name, phone, city, area, address, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, fullName, phone || null, city, area || null, address, postalCode || null, isDefault ? 1 : 0]
  );
  return result.insertId;
}

async function deleteAddress(id, userId) {
  await pool.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [id, userId]);
}

module.exports = { findById, findByEmail, create, update, updatePassword, getAll, deleteById, getAddresses, createAddress, deleteAddress };
