const pool = require('../config/db');
const User = require('../models/User');
const Variant = require('../models/Variant');

exports.getStats = async (req, res, next) => {
  try {
    const [[{ total: productCount }]] = await pool.execute("SELECT COUNT(*) AS total FROM products WHERE active = 1");
    const [[{ total: orderCount }]] = await pool.execute("SELECT COUNT(*) AS total FROM orders");
    const [[{ total: revenue }]] = await pool.execute("SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE order_status != 'cancelled'");
    const [[{ total: customerCount }]] = await pool.execute("SELECT COUNT(*) AS total FROM users WHERE role = 'user'");

    const [recentOrders] = await pool.execute(
      `SELECT o.id, o.order_number, o.total, o.order_status, o.created_at,
              COALESCE(u.name, o.ship_full_name) AS customer_name
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC LIMIT 5`
    );

    const lowStock = await Variant.getLowStock();

    res.json({
      success: true,
      data: {
        stats: { productCount, orderCount, revenue: Number(revenue), customerCount },
        recentOrders,
        lowStock
      }
    });
  } catch (e) { next(e); }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.getAll();
    res.json({ success: true, data: users });
  } catch (e) { next(e); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    await User.deleteById(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};
