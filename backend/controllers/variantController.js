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

// Set a variant's stock to an absolute value. 0 is allowed (marks it out of stock).
exports.setVariantStock = async (req, res, next) => {
  try {
    const stock = Number(req.body.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ success: false, message: 'Stock must be 0 or a positive whole number' });
    }
    await Variant.setStock(req.params.vid, stock);
    res.json({ success: true, message: `Stock set to ${stock}` });
  } catch (e) { next(e); }
};
