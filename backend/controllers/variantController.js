const Variant = require('../models/Variant');

exports.getVariants = async (req, res, next) => {
  try {
    const adminAll = req.query.admin === '1';
    const variants = await Variant.getByProduct(req.params.id, adminAll);
    res.json({ success: true, data: variants });
  } catch (e) { next(e); }
};

exports.createVariant = async (req, res, next) => {
  try {
    const { size, colour, colourHex, sku, stock } = req.body;
    if (!size || !colour) return res.status(400).json({ success: false, message: 'Size and colour required' });
    const id = await Variant.create(req.params.id, { size, colour, colourHex, sku, stock: Number(stock) || 0 });
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.updateVariant = async (req, res, next) => {
  try {
    const { size, colour, colourHex, sku, active } = req.body;
    await Variant.update(req.params.vid, { size, colour, colourHex, sku, active });
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
};

exports.deleteVariant = async (req, res, next) => {
  try {
    await Variant.deleteById(req.params.vid);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};

exports.restockVariant = async (req, res, next) => {
  try {
    const { qty } = req.body;
    if (!qty || qty < 1) return res.status(400).json({ success: false, message: 'qty must be >= 1' });
    await Variant.restock(req.params.vid, Number(qty));
    res.json({ success: true, message: `Restocked +${qty}` });
  } catch (e) { next(e); }
};
