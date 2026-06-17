const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Throttle credential endpoints to blunt brute-force / credential stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' }
});

const { authMiddleware, adminMiddleware, optionalAuth } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const categoryCtrl = require('../controllers/categoryController');
const productCtrl = require('../controllers/productController');
const variantCtrl = require('../controllers/variantController');
const orderCtrl = require('../controllers/orderController');
const reviewCtrl = require('../controllers/reviewController');
const wishlistCtrl = require('../controllers/wishlistController');
const couponCtrl = require('../controllers/couponController');
const userCtrl = require('../controllers/userController');
const heroCtrl = require('../controllers/heroController');
const settingsCtrl = require('../controllers/settingsController');
const messageCtrl = require('../controllers/messageController');
const cities = require('../config/cities');

// Throttle the public contact form to blunt spam.
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many messages. Please try again later.' }
});

// Multer
const productDir = path.join(__dirname, '../uploads/products');
fs.mkdirSync(productDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).array('images', 20);

const catDir = path.join(__dirname, '../uploads/categories');
fs.mkdirSync(catDir, { recursive: true });
const catStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, catDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const uploadCat = multer({ storage: catStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single('image');

// Hero media — images OR video (desktop/mobile)
const heroDir = path.join(__dirname, '../uploads/hero');
fs.mkdirSync(heroDir, { recursive: true });
const heroStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, heroDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const heroFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.mp4', '.webm', '.mov', '.m4v'];
  cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
};
const uploadHero = multer({ storage: heroStorage, fileFilter: heroFilter, limits: { fileSize: 60 * 1024 * 1024 } }).single('file');

// Payment proof — images only, unique sanitized filename, dedicated dir
const paymentDir = path.join(__dirname, '../uploads/payments');
fs.mkdirSync(paymentDir, { recursive: true });
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, paymentDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    const rand = Math.random().toString(36).slice(2, 10);
    cb(null, `proof-${Date.now()}-${rand}${ext}`); // unique → never overwrites
  }
});
const paymentFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const okExt = allowed.includes(path.extname(file.originalname).toLowerCase());
  const okMime = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
  cb(null, okExt && okMime);
};
const uploadProof = multer({ storage: paymentStorage, fileFilter: paymentFilter, limits: { fileSize: 5 * 1024 * 1024 } }).single('paymentProof');

// Health
router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Auth
router.post('/auth/register', authLimiter, authCtrl.register);
router.post('/auth/login', authLimiter, authCtrl.login);
router.get('/auth/me', authMiddleware, authCtrl.me);
router.put('/auth/profile', authMiddleware, authCtrl.updateProfile);
router.post('/auth/change-password', authMiddleware, authCtrl.changePassword);

// Categories
router.get('/categories', categoryCtrl.getActive);
router.get('/categories/admin/all', adminMiddleware, categoryCtrl.getAll);
router.post('/categories/upload', adminMiddleware, uploadCat, categoryCtrl.uploadImage);
router.post('/categories', adminMiddleware, categoryCtrl.create);
router.put('/categories/:id', adminMiddleware, categoryCtrl.update);
router.delete('/categories/:id', adminMiddleware, categoryCtrl.delete);

// Products
router.get('/products', productCtrl.getAll);
router.get('/products/admin/all', adminMiddleware, productCtrl.getAdminAll);
router.get('/products/:id', optionalAuth, productCtrl.getOne);
router.post('/products', adminMiddleware, upload, productCtrl.create);
router.put('/products/:id', adminMiddleware, upload, productCtrl.update);
router.delete('/products/:id', adminMiddleware, productCtrl.delete);

// Colour images (must be before /:id/variants to avoid param conflict)
router.post('/products/:id/colour-images', adminMiddleware, upload, productCtrl.uploadColourImages);

// Home-section flags (New Arrivals / Best Sellers selection)
router.patch('/products/:id/home-flags', adminMiddleware, productCtrl.setHomeFlags);

// Hero slides (CMS)
router.get('/hero', heroCtrl.getPublic);
router.get('/hero/admin/all', adminMiddleware, heroCtrl.getAll);
router.post('/hero/upload', adminMiddleware, uploadHero, heroCtrl.uploadMedia);
router.post('/hero/reorder', adminMiddleware, heroCtrl.reorder);
router.post('/hero', adminMiddleware, heroCtrl.create);
router.put('/hero/:id', adminMiddleware, heroCtrl.update);
router.delete('/hero/:id', adminMiddleware, heroCtrl.delete);

// Variants & Inventory
router.get('/products/:id/variants', variantCtrl.getVariants);
router.post('/products/:id/variants', adminMiddleware, variantCtrl.createVariant);
router.put('/products/:id/variants/:vid', adminMiddleware, variantCtrl.updateVariant);
router.delete('/products/:id/variants/:vid', adminMiddleware, variantCtrl.deleteVariant);
router.patch('/products/:id/variants/:vid/restock', adminMiddleware, variantCtrl.restockVariant);

// Orders
router.post('/orders', optionalAuth, uploadProof, orderCtrl.placeOrder);
router.get('/orders', authMiddleware, orderCtrl.getMyOrders);
router.get('/orders/admin/all', adminMiddleware, orderCtrl.getAll);
router.get('/orders/:id', authMiddleware, orderCtrl.getOne);
router.patch('/orders/:id/status', adminMiddleware, orderCtrl.updateStatus);
router.patch('/orders/:id/payment', adminMiddleware, orderCtrl.verifyPayment);

// Reviews
router.get('/reviews', reviewCtrl.getByProduct);
router.post('/reviews', authMiddleware, reviewCtrl.create);
router.delete('/reviews/:id', authMiddleware, reviewCtrl.delete);

// Wishlist
router.get('/wishlist', authMiddleware, wishlistCtrl.getWishlist);
router.post('/wishlist/:productId', authMiddleware, wishlistCtrl.toggle);
router.delete('/wishlist/:productId', authMiddleware, wishlistCtrl.remove);

// Coupons
router.post('/coupons/validate', couponCtrl.validate);
router.get('/coupons', adminMiddleware, couponCtrl.getAll);
router.post('/coupons', adminMiddleware, couponCtrl.create);
router.put('/coupons/:id', adminMiddleware, couponCtrl.update);
router.delete('/coupons/:id', adminMiddleware, couponCtrl.delete);

// Admin
router.get('/admin/stats', adminMiddleware, userCtrl.getStats);
router.get('/admin/users', adminMiddleware, userCtrl.getUsers);
router.delete('/admin/users/:id', adminMiddleware, userCtrl.deleteUser);

// Settings
router.get('/settings', settingsCtrl.getPublic);
router.get('/settings/admin/all', adminMiddleware, settingsCtrl.getAll);
router.put('/settings', adminMiddleware, settingsCtrl.update);

// Contact messages
router.post('/contact', contactLimiter, messageCtrl.create);
router.get('/messages', adminMiddleware, messageCtrl.getAll);
router.patch('/messages/:id/read', adminMiddleware, messageCtrl.markRead);
router.delete('/messages/:id', adminMiddleware, messageCtrl.delete);

// Shipping
router.get('/shipping/cities', (req, res) => res.json({ success: true, data: cities }));

// Newsletter
router.post('/newsletter/subscribe', (req, res) => {
  res.json({ success: true, data: { code: 'NOOS10', message: 'Subscribed! Use NOOS10 for 10% off.' } });
});

module.exports = router;
