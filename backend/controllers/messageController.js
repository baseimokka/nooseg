const Message = require('../models/Message');

// Public — a visitor submits the contact form
exports.create = async (req, res, next) => {
  try {
    const { name, email, subject, body } = req.body;
    if (!name || !email || !body) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required' });
    }
    if (String(body).length > 5000) {
      return res.status(400).json({ success: false, message: 'Message is too long (max 5000 characters)' });
    }
    await Message.create({
      name: String(name).trim().slice(0, 120),
      email: String(email).trim().slice(0, 191),
      subject: subject ? String(subject).trim().slice(0, 80) : 'other',
      body: String(body).trim()
    });
    res.status(201).json({ success: true, message: 'Message received' });
  } catch (e) { next(e); }
};

// Admin — list all messages
exports.getAll = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Message.getAll() });
  } catch (e) { next(e); }
};

// Admin — mark a message as read
exports.markRead = async (req, res, next) => {
  try {
    await Message.markRead(req.params.id);
    res.json({ success: true, message: 'Marked read' });
  } catch (e) { next(e); }
};

// Admin — delete a message
exports.delete = async (req, res, next) => {
  try {
    await Message.remove(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};
