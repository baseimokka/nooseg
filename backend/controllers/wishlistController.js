const pool = require('../config/db');

exports.getWishlist = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT w.id, w.product_id, w.created_at,
              p.name, p.brand, p.price, p.old_price, p.badge,
              c.name AS category_name,
              (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url
       FROM wishlist w
       JOIN products p ON p.id = w.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.toggle = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    const [existing] = await pool.execute(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [req.user.id, productId]
    );
    if (existing.length > 0) {
      await pool.execute('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
      return res.json({ success: true, data: { added: false } });
    }
    await pool.execute('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
    res.json({ success: true, data: { added: true } });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', [req.user.id, Number(req.params.productId)]);
    res.json({ success: true, message: 'Removed' });
  } catch (e) { next(e); }
};
