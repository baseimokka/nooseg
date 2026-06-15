const Review = require('../models/Review');
const Product = require('../models/Product');

exports.getByProduct = async (req, res, next) => {
  try {
    const reviews = await Review.getByProduct(req.query.productId);
    res.json({ success: true, data: reviews });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { productId, rating, title, body } = req.body;
    if (!productId || !rating) return res.status(400).json({ success: false, message: 'productId and rating required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be 1–5' });
    const id = await Review.create({ productId: Number(productId), userId: req.user.id, rating: Number(rating), title, body });
    await Product.recalcRating(Number(productId));
    res.status(201).json({ success: true, data: { id } });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Already reviewed this product' });
    next(e);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (req.user.role !== 'admin' && review.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await Review.deleteById(req.params.id);
    await Product.recalcRating(review.product_id);
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { next(e); }
};
