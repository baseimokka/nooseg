const pool = require('../config/db');

async function getActive() {
  const [rows] = await pool.execute(
    'SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC'
  );
  return rows;
}

async function getAll() {
  const [rows] = await pool.execute('SELECT * FROM categories ORDER BY sort_order ASC');
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findBySlug(slug) {
  const [rows] = await pool.execute('SELECT * FROM categories WHERE slug = ?', [slug]);
  return rows[0] || null;
}

async function create({ name, slug, subtitle, imageUrl, sortOrder, active, featuredHome, showInCollections }) {
  const [result] = await pool.execute(
    `INSERT INTO categories (name, slug, subtitle, image_url, sort_order, active, featured_home, show_in_collections)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, slug, subtitle || null, imageUrl || null, sortOrder || 0, active !== false ? 1 : 0,
     featuredHome ? 1 : 0, showInCollections === false ? 0 : 1]
  );
  return result.insertId;
}

async function update(id, { name, slug, subtitle, imageUrl, sortOrder, active, featuredHome, showInCollections }) {
  await pool.execute(
    `UPDATE categories SET name = ?, slug = ?, subtitle = ?, image_url = ?, sort_order = ?, active = ?,
       featured_home = ?, show_in_collections = ? WHERE id = ?`,
    [name, slug, subtitle || null, imageUrl || null, sortOrder || 0, active ? 1 : 0,
     featuredHome ? 1 : 0, showInCollections ? 1 : 0, id]
  );
}

async function deleteById(id) {
  await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
}

module.exports = { getActive, getAll, findById, findBySlug, create, update, deleteById };
