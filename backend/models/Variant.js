const pool = require('../config/db');

async function getByProduct(productId, adminAll = false) {
  const activeClause = adminAll ? '' : 'AND pv.active = 1';
  const [rows] = await pool.execute(
    `SELECT pv.*, i.stock, i.low_stock_threshold
     FROM product_variants pv
     LEFT JOIN inventory i ON i.variant_id = pv.id
     WHERE pv.product_id = ? ${activeClause}
     ORDER BY pv.size, pv.colour`,
    [productId]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT pv.*, i.stock FROM product_variants pv
     LEFT JOIN inventory i ON i.variant_id = pv.id
     WHERE pv.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function create(productId, { size, colour, colourHex, sku, stock }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      'INSERT INTO product_variants (product_id, size, colour, colour_hex, sku, price_adj) VALUES (?, ?, ?, ?, ?, 0)',
      [productId, size, colour, colourHex || null, sku || null]
    );
    const variantId = result.insertId;
    await conn.execute(
      'INSERT INTO inventory (variant_id, stock) VALUES (?, ?)',
      [variantId, stock || 0]
    );
    await conn.commit();
    return variantId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function update(id, { size, colour, colourHex, sku, active }) {
  await pool.execute(
    'UPDATE product_variants SET size=?, colour=?, colour_hex=?, sku=?, price_adj=0, active=? WHERE id=?',
    [size, colour, colourHex || null, sku || null, active ? 1 : 0, id]
  );
}

async function deleteById(id) {
  await pool.execute('DELETE FROM product_variants WHERE id = ?', [id]);
}

async function restock(variantId, qty) {
  await pool.execute(
    'UPDATE inventory SET stock = stock + ? WHERE variant_id = ?',
    [qty, variantId]
  );
}

async function getLowStock() {
  const [rows] = await pool.execute(
    `SELECT pv.id AS variant_id, pv.size, pv.colour, pv.product_id,
            p.name AS product_name, i.stock, i.low_stock_threshold
     FROM inventory i
     JOIN product_variants pv ON pv.id = i.variant_id
     JOIN products p ON p.id = pv.product_id
     WHERE i.stock <= i.low_stock_threshold AND p.active = 1
     ORDER BY i.stock ASC
     LIMIT 20`
  );
  return rows;
}

module.exports = { getByProduct, findById, create, update, deleteById, restock, getLowStock };
