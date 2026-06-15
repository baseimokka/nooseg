const Hero = require('../models/Hero');

// Shape a DB row into the frontend slide contract.
function toSlide(r) {
  return {
    id: r.id,
    enabled: !!r.enabled,
    order: r.sort_order,
    mediaType: r.media_type,
    desktop: { image: r.desktop_image || '', video: r.desktop_video || '' },
    mobile:  { image: r.mobile_image || '',  video: r.mobile_video  || '' },
    label: r.label || '',
    title: r.title || '',
    subtitle: r.subtitle || '',
    description: r.description || '',
    primary:   r.primary_label   ? { label: r.primary_label,   href: r.primary_href   || '#' } : null,
    secondary: r.secondary_label ? { label: r.secondary_label, href: r.secondary_href || '#' } : null
  };
}

exports.getPublic = async (req, res, next) => {
  try {
    const rows = await Hero.getEnabled();
    res.json({ success: true, data: rows.map(toSlide) });
  } catch (e) { next(e); }
};

exports.getAll = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Hero.getAll() });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const id = await Hero.create(req.body);
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await Hero.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Slide not found' });
    // Merge so partial updates (e.g. just enabled toggle) keep existing values.
    const merged = {
      media_type: req.body.media_type ?? existing.media_type,
      desktop_image: req.body.desktop_image ?? existing.desktop_image,
      desktop_video: req.body.desktop_video ?? existing.desktop_video,
      mobile_image: req.body.mobile_image ?? existing.mobile_image,
      mobile_video: req.body.mobile_video ?? existing.mobile_video,
      label: req.body.label ?? existing.label,
      title: req.body.title ?? existing.title,
      subtitle: req.body.subtitle ?? existing.subtitle,
      description: req.body.description ?? existing.description,
      primary_label: req.body.primary_label ?? existing.primary_label,
      primary_href: req.body.primary_href ?? existing.primary_href,
      secondary_label: req.body.secondary_label ?? existing.secondary_label,
      secondary_href: req.body.secondary_href ?? existing.secondary_href,
      sort_order: req.body.sort_order ?? existing.sort_order,
      enabled: req.body.enabled ?? existing.enabled
    };
    await Hero.update(req.params.id, merged);
    res.json({ success: true, message: 'Updated' });
  } catch (e) { next(e); }
};

exports.delete = async (req, res, next) => {
  try {
    await Hero.deleteById(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};

exports.reorder = async (req, res, next) => {
  try {
    const { order } = req.body; // array of ids in desired order
    if (!Array.isArray(order)) return res.status(400).json({ success: false, message: 'order array required' });
    await Hero.setOrder(order);
    res.json({ success: true, message: 'Reordered' });
  } catch (e) { next(e); }
};

// Media upload (image OR video) — returns the stored URL.
exports.uploadMedia = (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({ success: true, data: { url: `/uploads/hero/${req.file.filename}` } });
};
