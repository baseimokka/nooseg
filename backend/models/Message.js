const pool = require('../config/db');

async function create({ name, email, subject, body }) {
  const [r] = await pool.execute(
    'INSERT INTO messages (name, email, subject, body) VALUES (?, ?, ?, ?)',
    [name, email, subject || 'other', body]
  );
  return r.insertId;
}

async function getAll() {
  const [rows] = await pool.execute('SELECT * FROM messages ORDER BY created_at DESC');
  return rows;
}

async function markRead(id) {
  await pool.execute('UPDATE messages SET is_read = 1 WHERE id = ?', [id]);
}

async function remove(id) {
  await pool.execute('DELETE FROM messages WHERE id = ?', [id]);
}

async function unreadCount() {
  const [[{ c }]] = await pool.execute('SELECT COUNT(*) AS c FROM messages WHERE is_read = 0');
  return c;
}

module.exports = { create, getAll, markRead, remove, unreadCount };
