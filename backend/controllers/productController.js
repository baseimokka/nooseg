const Product = require('../models/Product');
const path = require('path');

exports.getAll = async (req, res, next) => {
  try {
    const { category, badge, search, sort, minPrice, maxPrice, size, colour, homeNew, homeBestseller } = req.query;
    const products = await Product.getAll({ category, badge, search, sort, minPrice, maxPrice, size, colour, homeNew, homeBestseller });
    res.json({ success: true, data: products });
  } catch (e) { next(e); }
};

exports.getAdminAll = async (req, res, next) => {
  try {
    const products = await Product.getAll({ adminAll: true });
    res.json({ success: true, data: products });
  } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    // Soft-deleted products are only visible to admins (e.g. the edit modal).
    if (!product.active && req.user?.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (e) { next(e); }
};

const MARKUP = 1.05;

exports.create = async (req, res, next) => {
  try {
    const { name, description, brand, categoryId, basePrice, oldPrice, sku, badge, isFeature, active, homeNew, homeBestseller } = req.body;
    if (!name || !categoryId || !basePrice) return res.status(400).json({ success: false, message: 'Name, category, base price required' });
    const bp = Number(basePrice);
    const price = parseFloat((bp * MARKUP).toFixed(2));
    const truthy = v => v === true || v === 'true' || v === 1 || v === '1';
    const id = await Product.create({
      name, description, brand: brand || null,
      categoryId: Number(categoryId),
      price, basePrice: bp,
      oldPrice: oldPrice ? Number(oldPrice) : null,
      sku: sku || null, badge: badge || null, isFeature, active,
      homeNew: truthy(homeNew), homeBestseller: truthy(homeBestseller)
    });
    // Auto-generate a unique SKU when none was supplied, derived from the new
    // product id (e.g. NOOS-00042) so it can never collide.
    if (!sku) await Product.setSku(id, `NOOS-${String(id).padStart(5, '0')}`);
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        await Product.addImage(id, `/uploads/products/${req.files[i].filename}`, i);
      }
    }
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });
    const { name, description, brand, categoryId, basePrice, oldPrice, sku, badge, isFeature, active, homeNew, homeBestseller } = req.body;
    const bp = basePrice !== undefined && basePrice !== '' ? Number(basePrice) : (existing.base_price || existing.price);
    const price = parseFloat((bp * MARKUP).toFixed(2));
    await Product.update(req.params.id, {
      name: name || existing.name,
      description: description !== undefined ? description : existing.description,
      brand: brand !== undefined ? (brand || null) : existing.brand,
      categoryId: categoryId ? Number(categoryId) : existing.category_id,
      price,
      basePrice: bp,
      oldPrice: oldPrice !== undefined ? (oldPrice ? Number(oldPrice) : null) : existing.old_price,
      sku: sku !== undefined ? (sku || null) : existing.sku,
      badge: badge !== undefined ? (badge || null) : existing.badge,
      isFeature: isFeature !== undefined ? (isFeature === 'true' || isFeature === true) : existing.is_featured,
      active: active !== undefined ? (active === 'true' || active === true) : existing.active,
      homeNew: homeNew !== undefined ? (homeNew === 'true' || homeNew === true) : existing.home_new,
      homeBestseller: homeBestseller !== undefined ? (homeBestseller === 'true' || homeBestseller === true) : existing.home_bestseller
    });
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        await Product.addImage(req.params.id, `/uploads/products/${req.files[i].filename}`, i);
      }
    }
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try {
    await Product.remove(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};

exports.setHomeFlags = async (req, res, next) => {
  try {
    const truthy = v => v === true || v === 'true' || v === 1 || v === '1';
    await Product.setHomeFlags(req.params.id, {
      homeNew: truthy(req.body.homeNew),
      homeBestseller: truthy(req.body.homeBestseller)
    });
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
};

// Save the manual arrangement of a homepage section (New Arrivals / Best Sellers).
exports.setHomeOrder = async (req, res, next) => {
  try {
    let { section, orderedIds } = req.body;
    if (section === 'best') section = 'bestseller';
    if (!['new', 'bestseller'].includes(section) || !Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'section and orderedIds[] required' });
    }
    await Product.setHomeOrder(section, orderedIds.map(Number).filter(Number.isInteger));
    res.json({ success: true, message: 'Order updated' });
  } catch (e) { next(e); }
};

exports.uploadColourImages = async (req, res, next) => {
  try {
    const { colour } = req.body;
    if (!colour) return res.status(400).json({ success: false, message: 'colour required' });
    if (!req.files || !req.files.length) return res.status(400).json({ success: false, message: 'No images uploaded' });
    for (let i = 0; i < req.files.length; i++) {
      await Product.addImage(req.params.id, `/uploads/products/${req.files[i].filename}`, i, null, colour);
    }
    res.json({ success: true, message: `Uploaded ${req.files.length} image(s)` });
  } catch (e) { next(e); }
};
