const Coupon = require('../models/Coupon');
const pool = require('../config/db');
const { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } = require('../config/pricing');

exports.validate = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code required' });

    const coupon = await Coupon.findByCode(code);
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or expired coupon' });

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }
    if (subtotal && subtotal < coupon.min_order_value) {
      return res.status(400).json({ success: false, message: `Minimum order EGP ${coupon.min_order_value}` });
    }

    const sub = Number(subtotal) || 0;
    const discount = coupon.discount_type === 'percentage'
      ? parseFloat((sub * coupon.discount_value / 100).toFixed(2))
      : Math.min(coupon.discount_value, sub);

    res.json({ success: true, data: { code: coupon.code, discountType: coupon.discount_type, discountValue: coupon.discount_value, discount } });
  } catch (e) { next(e); }
};

exports.getAll = async (req, res, next) => {
  try {
    const coupons = await Coupon.getAll();
    res.json({ success: true, data: coupons });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, minOrderValue, usageLimit, expiresAt } = req.body;
    if (!code || !discountType || !discountValue) return res.status(400).json({ success: false, message: 'code, discountType, discountValue required' });
    const id = await Coupon.create({ code, discountType, discountValue: Number(discountValue), minOrderValue: Number(minOrderValue) || 0, usageLimit: usageLimit ? Number(usageLimit) : null, expiresAt: expiresAt || null });
    res.status(201).json({ success: true, data: { id } });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Coupon code already exists' });
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await Coupon.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Coupon not found' });
    const { code, discountType, discountValue, minOrderValue, usageLimit, active, expiresAt } = req.body;
    await Coupon.update(req.params.id, {
      code:          code          !== undefined ? code          : existing.code,
      discountType:  discountType  !== undefined ? discountType  : existing.discount_type,
      discountValue: discountValue !== undefined ? Number(discountValue) : Number(existing.discount_value),
      minOrderValue: minOrderValue !== undefined ? Number(minOrderValue) : Number(existing.min_order_value),
      usageLimit:    usageLimit    !== undefined ? (usageLimit ? Number(usageLimit) : null) : existing.usage_limit,
      active:        active        !== undefined ? active        : existing.active,
      expiresAt:     expiresAt     !== undefined ? expiresAt     : existing.expires_at
    });
    res.json({ success: true, message: 'Updated' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Coupon code already exists' });
    next(e);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM coupon_usages WHERE coupon_id = ?', [req.params.id]);
    await Coupon.deleteById(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};
