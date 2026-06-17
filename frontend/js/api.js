// Same-origin relative base — the Express server serves both the frontend and
// the API, so '/api' works in local dev and any deployment without code changes.
const API_BASE = '/api';

const API = {
  async _req(method, path, body, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) Object.assign(headers, Auth.headers());
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, opts);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Request failed');
    return json.data;
  },

  async _upload(method, path, formData) {
    const headers = Auth.headers();
    const res = await fetch(`${API_BASE}${path}`, { method, headers, body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Request failed');
    return json.data;
  },

  // Multipart upload that works for guests too (auth header attached only if logged in)
  _uploadMaybeAuth(method, path, formData) {
    return API._upload(method, path, formData);
  },

  // Auth
  register: (d) => API._req('POST', '/auth/register', d),
  login: (d) => API._req('POST', '/auth/login', d),
  me: () => API._req('GET', '/auth/me', null, true),
  updateProfile: (d) => API._req('PUT', '/auth/profile', d, true),
  changePassword: (d) => API._req('POST', '/auth/change-password', d, true),

  // Categories
  getCategories: () => API._req('GET', '/categories'),
  getAdminCategories: () => API._req('GET', '/categories/admin/all', null, true),
  createCategory: (d) => API._req('POST', '/categories', d, true),
  updateCategory: (id, d) => API._req('PUT', `/categories/${id}`, d, true),
  deleteCategory: (id) => API._req('DELETE', `/categories/${id}`, null, true),

  // Products
  getProducts: (q = {}) => API._req('GET', `/products?${new URLSearchParams(q)}`),
  getAdminProducts: () => API._req('GET', '/products/admin/all', null, true),
  getProduct: (id) => API._req('GET', `/products/${id}`),
  createProduct: (fd) => API._upload('POST', '/products', fd),
  updateProduct: (id, fd) => API._upload('PUT', `/products/${id}`, fd),
  deleteProduct: (id) => API._req('DELETE', `/products/${id}`, null, true),

  // Colour images
  uploadColourImages: (productId, fd) => API._upload('POST', `/products/${productId}/colour-images`, fd),

  // Variants
  getVariants: (productId) => API._req('GET', `/products/${productId}/variants`),
  getAdminVariants: (productId) => API._req('GET', `/products/${productId}/variants?admin=1`, null, true),
  createVariant: (productId, d) => API._req('POST', `/products/${productId}/variants`, d, true),
  updateVariant: (productId, variantId, d) => API._req('PUT', `/products/${productId}/variants/${variantId}`, d, true),
  deleteVariant: (productId, variantId) => API._req('DELETE', `/products/${productId}/variants/${variantId}`, null, true),
  restockVariant: (productId, variantId, qty) => API._req('PATCH', `/products/${productId}/variants/${variantId}/restock`, { qty }, true),

  // Orders — multipart so an optional payment-proof screenshot can ride along
  placeOrder: (d) => {
    const fd = new FormData();
    fd.append('items', JSON.stringify(d.items));
    fd.append('shipping', JSON.stringify(d.shipping));
    if (d.couponCode) fd.append('couponCode', d.couponCode);
    fd.append('paymentMethod', d.paymentMethod || 'COD');
    if (d.paymentProof) fd.append('paymentProof', d.paymentProof);
    return API._uploadMaybeAuth('POST', '/orders', fd);
  },
  getMyOrders: () => API._req('GET', '/orders', null, true),
  getAdminOrders: () => API._req('GET', '/orders/admin/all', null, true),
  getOrder: (id) => API._req('GET', `/orders/${id}`, null, true),
  updateOrderStatus: (id, d) => API._req('PATCH', `/orders/${id}/status`, d, true),
  verifyPayment: (id, d) => API._req('PATCH', `/orders/${id}/payment`, d, true),

  // Reviews
  getReviews: (productId) => API._req('GET', `/reviews?productId=${productId}`),
  createReview: (d) => API._req('POST', '/reviews', d, true),
  deleteReview: (id) => API._req('DELETE', `/reviews/${id}`, null, true),

  // Wishlist
  getWishlist: () => API._req('GET', '/wishlist', null, true),
  toggleWishlist: (productId) => API._req('POST', `/wishlist/${productId}`, null, true),
  removeWishlist: (productId) => API._req('DELETE', `/wishlist/${productId}`, null, true),

  // Coupons
  validateCoupon: (code, subtotal) => API._req('POST', '/coupons/validate', { code, subtotal }),
  getCoupons: () => API._req('GET', '/coupons', null, true),
  createCoupon: (d) => API._req('POST', '/coupons', d, true),
  updateCoupon: (id, d) => API._req('PUT', `/coupons/${id}`, d, true),
  deleteCoupon: (id) => API._req('DELETE', `/coupons/${id}`, null, true),

  // Product home-section flags (New Arrivals / Best Sellers)
  setProductHomeFlags: (id, d) => API._req('PATCH', `/products/${id}/home-flags`, d, true),

  // Hero CMS
  getHero: () => API._req('GET', '/hero'),
  getAdminHero: () => API._req('GET', '/hero/admin/all', null, true),
  createHero: (d) => API._req('POST', '/hero', d, true),
  updateHero: (id, d) => API._req('PUT', `/hero/${id}`, d, true),
  deleteHero: (id) => API._req('DELETE', `/hero/${id}`, null, true),
  reorderHero: (order) => API._req('POST', '/hero/reorder', { order }, true),
  uploadHeroMedia: (fd) => API._upload('POST', '/hero/upload', fd),

  // Admin
  getStats: () => API._req('GET', '/admin/stats', null, true),
  getUsers: () => API._req('GET', '/admin/users', null, true),
  deleteUser: (id) => API._req('DELETE', `/admin/users/${id}`, null, true),

  // Settings
  getPaymentSettings: () => API._req('GET', '/settings'),
  getAdminSettings: () => API._req('GET', '/settings/admin/all', null, true),
  updateSettings: (d) => API._req('PUT', '/settings', d, true),

  // Contact messages
  sendContactMessage: (d) => API._req('POST', '/contact', d),
  getMessages: () => API._req('GET', '/messages', null, true),
  markMessageRead: (id) => API._req('PATCH', `/messages/${id}/read`, null, true),
  deleteMessage: (id) => API._req('DELETE', `/messages/${id}`, null, true),

  // Utilities
  getCities: () => API._req('GET', '/shipping/cities'),
  subscribe: (email) => API._req('POST', '/newsletter/subscribe', { email })
};
