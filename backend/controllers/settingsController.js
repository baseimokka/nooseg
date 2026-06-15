const Settings = require('../models/Settings');

// Public — payment instructions / account info shown at checkout
exports.getPublic = async (req, res, next) => {
  try {
    const data = await Settings.getPublic();
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// Admin — full settings map
exports.getAll = async (req, res, next) => {
  try {
    const data = await Settings.getMap();
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// Admin — bulk upsert
exports.update = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, message: 'Invalid settings payload' });
    }
    await Settings.setMany(body);
    const data = await Settings.getMap();
    res.json({ success: true, data });
  } catch (e) { next(e); }
};
