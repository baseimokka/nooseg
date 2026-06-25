// Toast
const Toast = {
  show(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); }
};

// Auth
const Auth = {
  TOKEN_KEY: 'noos_token',
  USER_KEY: 'noos_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY)); } catch { return null; }
  },
  isLoggedIn() { return !!this.getToken(); },
  isAdmin() { return this.getUser()?.role === 'admin'; },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  headers() {
    const t = this.getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  },

  requireLogin(redirectTo = '/') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
};

// Utility helpers
function formatEGP(amount) {
  return 'EGP ' + Number(amount).toLocaleString('en-EG');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function starHTML(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// Cart
const Cart = {
  KEY: 'noos_cart',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this._notify();
  },

  add(item) {
    const items = this.getAll();
    const idx = items.findIndex(i => i.variantId === item.variantId && i.productId === item.productId);
    if (idx >= 0) {
      items[idx].quantity += item.quantity;
    } else {
      items.push({ ...item });
    }
    this.save(items);
    // Meta Pixel AddToCart — guarded; pixel.js is absent on the admin panel.
    if (window.MetaPixel) window.MetaPixel.addToCart(item);
  },

  remove(variantId, productId) {
    const items = this.getAll().filter(i => !(i.variantId === variantId && i.productId === productId));
    this.save(items);
  },

  updateQty(variantId, productId, qty) {
    const items = this.getAll();
    const idx = items.findIndex(i => i.variantId === variantId && i.productId === productId);
    if (idx >= 0) {
      if (qty < 1) items.splice(idx, 1);
      else items[idx].quantity = qty;
    }
    this.save(items);
  },

  clear() { this.save([]); },

  count() { return this.getAll().reduce((s, i) => s + i.quantity, 0); },

  subtotal() { return this.getAll().reduce((s, i) => s + i.price * i.quantity, 0); },

  _notify() {
    window.dispatchEvent(new Event('cartUpdated'));
  }
};
