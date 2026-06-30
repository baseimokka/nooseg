const pool = require('../config/db');

async function getByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT o.*,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT(
              'id', oi.id, 'productName', oi.product_name, 'variantLabel', oi.variant_label,
              'imageUrl', oi.image_url, 'unitPrice', oi.unit_price, 'quantity', oi.quantity,
              'lineTotal', oi.line_total
            )) FROM order_items oi WHERE oi.order_id = o.id) AS items
     FROM orders o
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return rows.map(r => {
    const items = r.items
      ? (typeof r.items === 'string' ? JSON.parse(r.items) : r.items)
      : [];
    return { ...r, items };
  });
}

async function getAll() {
  const [rows] = await pool.execute(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
            v.name AS verified_by_name,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN users v ON v.id = o.payment_verified_by
     ORDER BY o.created_at DESC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
            v.name AS verified_by_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     LEFT JOIN users v ON v.id = o.payment_verified_by
     WHERE o.id = ?`,
    [id]
  );
  if (!rows[0]) return null;
  const order = rows[0];
  const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [id]);
  order.items = items;
  return order;
}

async function create(conn, {
  orderNumber, userId, guestEmail, guestPhone,
  subtotal, shippingCost, discount, total, couponCode,
  paymentMethod, paymentStatus, paymentProof,
  shipFullName, shipPhone, shipCity, shipArea, shipAddress, shipPostal
}) {
  const [result] = await conn.execute(
    `INSERT INTO orders
       (order_number, user_id, guest_email, guest_phone, subtotal, shipping_cost, discount, total,
        coupon_code, payment_method, payment_status, payment_proof,
        ship_full_name, ship_phone, ship_city, ship_area, ship_address, ship_postal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderNumber, userId || null, guestEmail || null, guestPhone || null,
     subtotal, shippingCost, discount, total, couponCode || null,
     paymentMethod || 'COD', paymentStatus || 'pending', paymentProof || null,
     shipFullName, shipPhone, shipCity, shipArea || null, shipAddress, shipPostal || null]
  );
  return result.insertId;
}

// Admin verification: status = 'verified' | 'rejected'
async function verifyPayment(id, { status, notes, adminId }) {
  await pool.execute(
    `UPDATE orders
       SET payment_status = ?, payment_notes = ?, payment_verified_by = ?, payment_verified_at = NOW()
     WHERE id = ?`,
    [status, notes || null, adminId || null, id]
  );
}

async function addItem(conn, { orderId, productId, variantId, productName, variantLabel, imageUrl, unitPrice, quantity }) {
  await conn.execute(
    `INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, image_url, unit_price, quantity, line_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [orderId, productId || null, variantId || null, productName, variantLabel, imageUrl || null, unitPrice, quantity, unitPrice * quantity]
  );
}

async function updateStatus(conn, id, { orderStatus, paymentStatus, adminNotes }) {
  await conn.execute(
    'UPDATE orders SET order_status = ?, payment_status = ?, admin_notes = ? WHERE id = ?',
    [orderStatus, paymentStatus, adminNotes || null, id]
  );
}

// Return every line's quantity back to inventory (used when an order is cancelled).
// Skips items whose variant was deleted (variant_id IS NULL).
async function restockItems(conn, orderId) {
  await conn.execute(
    `UPDATE inventory inv
       JOIN order_items oi ON oi.variant_id = inv.variant_id
        SET inv.stock = inv.stock + oi.quantity
      WHERE oi.order_id = ? AND oi.variant_id IS NOT NULL`,
    [orderId]
  );
}

module.exports = { getByUser, getAll, findById, create, addItem, updateStatus, restockItems, verifyPayment };
