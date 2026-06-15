const pool = require('../config/db');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } = require('../config/pricing');

function generateOrderNumber() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.random().toString(36).toUpperCase().slice(2, 8);
  return `NOOS-${date}-${rand}`;
}

const PAYMENT_METHODS = ['COD', 'instapay', 'vodafone_cash'];
const PROOF_METHODS = ['instapay', 'vodafone_cash'];

exports.placeOrder = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Body arrives as multipart FormData — items/shipping are JSON strings.
    const parse = v => (typeof v === 'string' ? JSON.parse(v) : v);
    let items, shipping;
    try {
      items = parse(req.body.items);
      shipping = parse(req.body.shipping);
    } catch {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Invalid items or shipping payload' });
    }
    const couponCode = req.body.couponCode || null;
    const paymentMethod = PAYMENT_METHODS.includes(req.body.paymentMethod) ? req.body.paymentMethod : 'COD';

    if (!Array.isArray(items) || !items.length || !shipping) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Items and shipping required' });
    }

    // Manual payment methods require a proof screenshot (validated server-side).
    if (PROOF_METHODS.includes(paymentMethod) && !req.file) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Payment proof screenshot is required' });
    }
    const paymentProof = req.file ? `/uploads/payments/${req.file.filename}` : null;
    const paymentStatus = PROOF_METHODS.includes(paymentMethod) ? 'pending_verification' : 'pending';

    // ── Server-side pricing + stock (never trust client-supplied price/qty) ──
    // Each line MUST reference a real, active, in-stock variant. Unit price and
    // line labels are taken from the database, not from the request body.
    const priced = [];
    let subtotal = 0;

    for (const item of items) {
      const variantId = Number(item.variantId);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(variantId) || variantId < 1) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Each item must reference a valid product variant' });
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Item quantity must be a positive whole number' });
      }

      // Authoritative variant + product data, with a row lock on the stock.
      const [[row]] = await conn.execute(
        `SELECT pv.id, pv.product_id, pv.size, pv.colour, pv.price_adj, pv.active AS variant_active,
                p.name AS product_name, p.price AS product_price, p.active AS product_active,
                inv.stock
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         LEFT JOIN inventory inv ON inv.variant_id = pv.id
         WHERE pv.id = ? FOR UPDATE`,
        [variantId]
      );

      if (!row || !row.variant_active || !row.product_active) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'One or more items are no longer available' });
      }
      if (row.stock == null || row.stock < quantity) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Insufficient stock for ${row.product_name}` });
      }

      const unitPrice = parseFloat((Number(row.product_price) + Number(row.price_adj)).toFixed(2));
      subtotal += unitPrice * quantity;

      priced.push({
        variantId,
        productId: row.product_id,
        productName: row.product_name,
        variantLabel: `${row.size} / ${row.colour}`,
        imageUrl: item.image || null,
        unitPrice,
        quantity
      });

      await conn.execute('UPDATE inventory SET stock = stock - ? WHERE variant_id = ?', [quantity, variantId]);
    }

    subtotal = parseFloat(subtotal.toFixed(2));

    // Coupon validation (against the server-computed subtotal)
    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findByCode(couponCode);
      if (coupon) {
        if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
          coupon = null;
        } else if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          coupon = null;
        } else if (subtotal < coupon.min_order_value) {
          coupon = null;
        }
      }
      if (coupon) {
        discount = coupon.discount_type === 'percentage'
          ? parseFloat((subtotal * coupon.discount_value / 100).toFixed(2))
          : Math.min(coupon.discount_value, subtotal);
      }
    }

    const shippingCost = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = parseFloat((subtotal - discount + shippingCost).toFixed(2));

    const orderNumber = generateOrderNumber();
    const orderId = await Order.create(conn, {
      orderNumber,
      userId: req.user?.id || null,
      guestEmail: !req.user ? shipping.email : null,
      guestPhone: !req.user ? shipping.phone : null,
      subtotal, shippingCost, discount, total,
      couponCode: coupon ? couponCode.toUpperCase() : null,
      paymentMethod, paymentStatus, paymentProof,
      shipFullName: shipping.fullName,
      shipPhone: shipping.phone,
      shipCity: shipping.city,
      shipArea: shipping.area,
      shipAddress: shipping.address,
      shipPostal: shipping.postalCode
    });

    for (const line of priced) {
      await Order.addItem(conn, { orderId, ...line });
    }

    if (coupon) {
      await Coupon.recordUsage(conn, { couponId: coupon.id, userId: req.user?.id || null, orderId });
    }

    await conn.commit();
    res.status(201).json({ success: true, data: { orderId, orderNumber, total, paymentMethod, paymentStatus } });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.getByUser(req.user.id);
    res.json({ success: true, data: orders });
  } catch (e) { next(e); }
};

exports.getAll = async (req, res, next) => {
  try {
    const orders = await Order.getAll();
    res.json({ success: true, data: orders });
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    res.json({ success: true, data: order });
  } catch (e) { next(e); }
};

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'pending_verification', 'verified', 'rejected'];

exports.updateStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus, adminNotes } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (orderStatus !== undefined && !ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }
    if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid payment status' });
    }

    // Only overwrite fields that were actually provided (no undefined binds).
    await Order.updateStatus(req.params.id, {
      orderStatus:  orderStatus  !== undefined ? orderStatus  : order.order_status,
      paymentStatus: paymentStatus !== undefined ? paymentStatus : order.payment_status,
      adminNotes:   adminNotes   !== undefined ? adminNotes   : order.admin_notes
    });
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
};

// Admin — approve / reject a manual payment
exports.verifyPayment = async (req, res, next) => {
  try {
    const { action, notes } = req.body; // action: 'approve' | 'reject'
    const map = { approve: 'verified', reject: 'rejected' };
    const status = map[action];
    if (!status) return res.status(400).json({ success: false, message: 'Invalid action' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await Order.verifyPayment(req.params.id, { status, notes, adminId: req.user.id });
    res.json({ success: true, message: `Payment ${status}` });
  } catch (e) { next(e); }
};
