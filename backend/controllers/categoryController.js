const Category = require('../models/Category');
const pool = require('../config/db');
const { generateSlug } = require('../utils/slug');

async function uniqueSlug(baseName, excludeId = null) {
  const base = generateSlug(baseName);
  let slug = base;
  let i = 0;
  while (true) {
    const existing = await Category.findBySlug(slug);
    if (!existing || (excludeId && String(existing.id) === String(excludeId))) return slug;
    i++;
    slug = `${base}-${i}`;
  }
}

exports.getActive = async (req, res, next) => {
  try {
    const cats = await Category.getActive();
    res.json({ success: true, data: cats });
  } catch (e) { next(e); }
};

exports.getAll = async (req, res, next) => {
  try {
    const cats = await Category.getAll();
    res.json({ success: true, data: cats });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, subtitle, imageUrl, sortOrder, active, featuredHome, showInCollections } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const slug = await uniqueSlug(name);
    const id = await Category.create({ name, slug, subtitle, imageUrl, sortOrder, active, featuredHome, showInCollections });
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await Category.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });
    const { name, subtitle, imageUrl, sortOrder, active, featuredHome, showInCollections } = req.body;
    const finalName = name || existing.name;
    const slug = await uniqueSlug(finalName, req.params.id);
    const bool = (v, fallback) => v !== undefined ? (v === true || v === 'true' || v === 1 || v === '1' ? 1 : 0) : fallback;
    await Category.update(req.params.id, {
      name: finalName,
      slug,
      subtitle: subtitle !== undefined ? subtitle : existing.subtitle,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.image_url,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing.sort_order,
      active: bool(active, existing.active),
      featuredHome: bool(featuredHome, existing.featured_home),
      showInCollections: bool(showInCollections, existing.show_in_collections)
    });
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
};

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });
    const url = `/uploads/categories/${req.file.filename}`;
    res.json({ success: true, data: { url } });
  } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try {
    const [[{ cnt }]] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM products WHERE category_id = ? AND active = 1',
      [req.params.id]
    );
    if (cnt > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${cnt} active product(s) are in this category. Reassign or deactivate them first.`
      });
    }
    await Category.deleteById(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};
