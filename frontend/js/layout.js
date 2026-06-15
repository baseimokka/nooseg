// Determine active nav link from pathname
function getActivePage() {
  const p = window.location.pathname;
  if (p === '/' || p.endsWith('index.html')) return 'home';
  if (p.includes('collections')) return 'collections';
  if (p.includes('shop')) return 'shop';
  if (p.includes('product')) return 'shop';
  if (p.includes('about')) return 'about';
  if (p.includes('contact')) return 'contact';
  return '';
}

function renderStrip() {
  const items = ['Free shipping over 500 EGP', 'New arrivals weekly', 'Cash on delivery', 'Never out of stock', 'Premium everyday wear'];
  const html = items.map(t => `<span class="strip__item">${t}</span><span class="strip__item strip__sep">—</span>`).join('');
  return `<div class="strip"><div class="strip__track">${html}${html}</div></div>`;
}

function renderNav(activePage) {
  const active = activePage || getActivePage();
  const base = window.location.pathname.includes('/pages/') ? '../' : '';
  const adminLink = Auth.isAdmin()
    ? `<a href="${base}pages/admin.html" class="nav-link">Admin</a>` : '';

  return `
    <nav class="navbar">
      <a href="${base}index.html" class="nav-logo">
        <span class="nav-logo__main">NOOS</span>
        <span class="nav-logo__sub">Never Out Of Stock</span>
      </a>
      <div class="nav-links">
        <a href="${base}index.html" class="nav-link ${active === 'home' ? 'active' : ''}">Home</a>
        <a href="${base}pages/shop.html" class="nav-link ${active === 'shop' ? 'active' : ''}">Shop</a>
        <a href="${base}pages/collections.html" class="nav-link ${active === 'collections' ? 'active' : ''}">Collections</a>
        <a href="${base}pages/about.html" class="nav-link ${active === 'about' ? 'active' : ''}">About</a>
        <a href="${base}pages/contact.html" class="nav-link ${active === 'contact' ? 'active' : ''}">Contact</a>
        ${adminLink}
      </div>
      <div class="nav-icons">
        <button class="nav-icon" id="search-toggle"><i class="ti ti-search"></i></button>
        <a href="${base}pages/wishlist.html" class="nav-icon"><i class="ti ti-heart"></i></a>
        <button class="nav-icon" id="user-btn"><i class="ti ti-user"></i></button>
        <button class="nav-icon" id="cart-btn" style="position:relative">
          <i class="ti ti-shopping-bag"></i>
          <span class="cart-badge" id="cart-count" style="display:none">0</span>
        </button>
        <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu">
          <i class="ti ti-menu-2"></i>
        </button>
      </div>
    </nav>
    <div class="mobile-nav" id="mobile-nav">
      <a href="${base}index.html" class="${active === 'home' ? 'active' : ''}">Home</a>
      <a href="${base}pages/shop.html" class="${active === 'shop' ? 'active' : ''}">Shop</a>
      <a href="${base}pages/collections.html" class="${active === 'collections' ? 'active' : ''}">Collections</a>
      <a href="${base}pages/about.html" class="${active === 'about' ? 'active' : ''}">About</a>
      <a href="${base}pages/contact.html" class="${active === 'contact' ? 'active' : ''}">Contact</a>
      ${Auth.isAdmin() ? `<a href="${base}pages/admin.html">Admin</a>` : ''}
      <a href="${base}pages/wishlist.html">Wishlist</a>
      <a href="#" onclick="document.getElementById('user-btn').click(); document.getElementById('mobile-nav').classList.remove('open'); return false;">My Account</a>
    </div>
    <div class="search-overlay" id="search-overlay">
      <form onsubmit="handleSearch(event)">
        <input type="text" id="search-input" placeholder="Search products..." autocomplete="off">
        <button type="submit"><i class="ti ti-search"></i></button>
      </form>
    </div>
  `;
}

// Shared product card renderer — used by homepage, shop, wishlist, related
function renderProductCard(p, productPath, wishlistedIds = []) {
  const isWished = wishlistedIds.includes(Number(p.id));
  const img = p.image_url
    ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy">`
    : `<i class="ti ti-shirt" style="font-size:52px;color:var(--border2);opacity:0.55"></i>`;
  const badge = p.badge ? `<span class="product-card__badge badge-${p.badge}">${p.badge}</span>` : '';
  const hasDiscount = p.old_price && Number(p.old_price) > Number(p.price);
  const oldPrice = hasDiscount ? `<span class="price-old">EGP ${Number(p.old_price).toFixed(0)}</span>` : '';
  const discPct = hasDiscount ? Math.round((1 - Number(p.price) / Number(p.old_price)) * 100) : 0;
  const discBadge = discPct > 0 ? `<span class="price-discount">-${discPct}%</span>` : '';
  const dots = (p.colours || []).slice(0, 5).map(c =>
    `<span class="pdot" style="background:${c.hex || '#ccc'}" title="${c.colour || ''}"></span>`
  ).join('');
  const dotsRow = dots ? `<div class="product-card__colours">${dots}</div>` : '';
  return `
    <div class="product-card" data-product-id="${p.id}" onclick="window.location='${productPath}?id=${p.id}'">
      <div class="product-card__image">
        ${img}
        ${badge}
        <button class="product-card__wish ${isWished ? 'active' : ''}"
          onclick="event.stopPropagation(); typeof window.toggleWish==='function' && window.toggleWish(${p.id},this)">
          <i class="ti ti-heart"></i>
        </button>
        <button class="quick-view-overlay" onclick="event.stopPropagation(); openQuickView(${p.id})">Quick View</button>
      </div>
      <div class="product-card__info">
        <div class="product-card__cat">${p.category_name || p.brand || 'NOOS'}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__price">
          <span class="price-current">EGP ${Number(p.price).toFixed(0)}</span>
          ${oldPrice}
          ${discBadge}
        </div>
        ${dotsRow}
      </div>
      <button class="card-atc-btn" onclick="event.stopPropagation(); openMiniVariant(${p.id})">
        <i class="ti ti-shopping-bag"></i> Add to Cart
      </button>
    </div>
  `;
}

function renderQuickViewModal() {
  return `
    <div class="modal-overlay" id="qv-modal">
      <div class="modal-box qv-box">
        <button class="modal-close" id="qv-close"><i class="ti ti-x"></i></button>
        <div class="qv-loading" id="qv-loading">
          <div class="qv-spinner"></div>
        </div>
        <div class="qv-content" id="qv-content" style="display:none">
          <div class="qv-grid">
            <div class="qv-left">
              <div class="qv-img-wrap" id="qv-img-wrap">
                <i class="ti ti-shirt placeholder-icon"></i>
              </div>
              <div class="qv-thumbs" id="qv-thumbs" style="display:none"></div>
            </div>
            <div class="qv-right">
              <div class="qv-brand" id="qv-brand">NOOS</div>
              <div class="pdp__cat" id="qv-cat"></div>
              <h2 class="qv-name" id="qv-name"></h2>
              <div class="pdp__rating" style="margin-bottom:10px">
                <span class="pdp__stars" id="qv-stars"></span>
                <span class="pdp__rating-text" id="qv-rating-text"></span>
              </div>
              <div class="pdp__price-row" style="margin-bottom:12px">
                <span class="pdp__price" id="qv-price"></span>
                <span class="pdp__price-old" id="qv-old-price"></span>
                <span class="pdp__discount" id="qv-discount" style="display:none"></span>
              </div>
              <hr class="pdp__divider">
              <div class="pdp__label" style="margin-bottom:8px">Colour — <span id="qv-colour-name">Select</span></div>
              <div class="colour-swatches" id="qv-colour-swatches"></div>
              <div class="pdp__label" style="margin-bottom:8px;margin-top:12px">Size — <span id="qv-size-name">Select a size</span></div>
              <div class="size-grid" id="qv-size-grid" style="margin-bottom:10px"></div>
              <div class="qty-row" style="margin-bottom:12px">
                <div class="qty-box">
                  <button class="qty-btn" onclick="qvChangeQty(-1)">−</button>
                  <div class="qty-val" id="qv-qty">1</div>
                  <button class="qty-btn" onclick="qvChangeQty(1)">+</button>
                </div>
                <div class="stock-indicator" id="qv-stock" style="display:none">
                  <i class="ti ti-circle-check"></i>
                  <span id="qv-stock-text"></span>
                </div>
              </div>
              <button class="btn-atc" id="qv-atc-btn" onclick="qvAddToCart()" style="margin-bottom:10px">
                <i class="ti ti-shopping-bag"></i>
                <span id="qv-atc-text">Add to Cart</span>
              </button>
              <a class="qv-full-link" id="qv-full-link" href="#">View Full Details →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMiniVariantModal() {
  return `
    <div class="modal-overlay" id="mv-modal">
      <div class="modal-box mv-box">
        <button class="modal-close" id="mv-close"><i class="ti ti-x"></i></button>
        <h3 class="modal-title" id="mv-title" style="font-size:18px;margin-bottom:16px;">Select Options</h3>
        <div class="qv-loading" id="mv-loading">
          <div class="qv-spinner"></div>
        </div>
        <div id="mv-content" style="display:none">
          <div class="pdp__label" style="margin-bottom:8px">Colour — <span id="mv-colour-name">Select</span></div>
          <div class="colour-swatches" id="mv-colour-swatches" style="margin-bottom:14px"></div>
          <div class="pdp__label" style="margin-bottom:8px">Size — <span id="mv-size-name">Select</span></div>
          <div class="size-grid" id="mv-size-grid" style="margin-bottom:16px"></div>
          <button class="btn-primary" onclick="mvAddToCart()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;">
            <i class="ti ti-shopping-bag"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  const base = window.location.pathname.includes('/pages/') ? '../' : '';
  return `
    <footer style="background:var(--ink);padding:28px 22px 18px;border-top:0.5px solid #222;">
      <div class="footer-grid">
        <div>
          <div style="font-family:var(--ff);font-size:20px;letter-spacing:0.12em;color:#fff;margin-bottom:8px;">NOOS</div>
          <p style="font-size:11px;color:rgba(255,255,255,0.22);max-width:175px;line-height:1.6;">Built for every day. Never out of stock. Egyptian menswear made for the modern man.</p>
          <div style="display:flex;gap:10px;margin-top:12px;">
            <a href="https://www.instagram.com/noos.eg?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" style="color:rgba(255,255,255,0.28);font-size:15px;"><i class="ti ti-brand-instagram"></i></a>
            <a href="#" style="color:rgba(255,255,255,0.28);font-size:15px;"><i class="ti ti-brand-tiktok"></i></a>
            <a href="https://www.facebook.com/noos.egypt" style="color:rgba(255,255,255,0.28);font-size:15px;"><i class="ti ti-brand-facebook"></i></a>
          </div>
        </div>
        <div>
          <div style="font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:12px;font-family:var(--fb);">Navigate</div>
          <div style="display:flex;flex-direction:column;gap:7px;">
            <a href="${base}index.html" style="font-size:11px;color:rgba(255,255,255,0.42);">Home</a>
            <a href="${base}pages/shop.html" style="font-size:11px;color:rgba(255,255,255,0.42);">Shop</a>
            <a href="${base}pages/collections.html" style="font-size:11px;color:rgba(255,255,255,0.42);">Collections</a>
            <a href="${base}pages/about.html" style="font-size:11px;color:rgba(255,255,255,0.42);">About</a>
            <a href="${base}pages/contact.html" style="font-size:11px;color:rgba(255,255,255,0.42);">Contact</a>
          </div>
        </div>
        <div>
          <div style="font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:12px;font-family:var(--fb);">Help</div>
          <div style="display:flex;flex-direction:column;gap:7px;">
            <a href="#" style="font-size:11px;color:rgba(255,255,255,0.42);">Track Order</a>
            <a href="#" style="font-size:11px;color:rgba(255,255,255,0.42);">Size Guide</a>
            <a href="#" style="font-size:11px;color:rgba(255,255,255,0.42);">Returns</a>
            <a href="#" style="font-size:11px;color:rgba(255,255,255,0.42);">FAQ</a>
            <a href="${base}pages/contact.html" style="font-size:11px;color:rgba(255,255,255,0.42);">Contact</a>
          </div>
        </div>
      </div>
      <div style="border-top:0.5px solid #222;padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:10px;color:rgba(255,255,255,0.18);font-family:var(--fb);">© 2026 NOOS. All rights reserved.</span>
        <span style="font-size:10px;color:rgba(255,255,255,0.18);font-family:var(--fb);">Cairo, Egypt · COD</span>
      </div>
    </footer>
  `;
}

function renderCartSidebar() {
  return `
    <div class="cart-overlay" id="cart-overlay"></div>
    <div class="cart-sidebar" id="cart-sidebar">
      <div class="cart-header">
        <h3>Your Bag</h3>
        <button class="nav-icon cart-close" id="cart-close"><i class="ti ti-x"></i></button>
      </div>
      <div class="cart-items" id="cart-items"></div>
      <div class="cart-footer">
        <div class="cart-totals" id="cart-totals"></div>
        <a href="pages/checkout.html" class="btn-primary cart-checkout" id="cart-checkout-btn">Proceed to Checkout</a>
      </div>
    </div>
  `;
}

function renderAuthModal() {
  return `
    <div class="modal-overlay" id="auth-modal">
      <div class="modal-box">
        <button class="modal-close" id="auth-close"><i class="ti ti-x"></i></button>
        <h2 class="modal-title" id="auth-title">Login</h2>
        <div class="modal-tabs">
          <button class="modal-tab active" id="tab-login" onclick="switchAuthTab('login')">Login</button>
          <button class="modal-tab" id="tab-register" onclick="switchAuthTab('register')">Register</button>
        </div>
        <form class="modal-form" id="auth-form" onsubmit="handleAuth(event)">
          <div id="auth-name-group" style="display:none;" class="form-group">
            <label class="form-label">Full Name</label>
            <input class="form-input" id="auth-name" type="text" placeholder="Ahmed Hassan">
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" id="auth-email" type="email" placeholder="you@example.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" id="auth-password" type="password" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn-primary" id="auth-submit" style="width:100%">Login</button>
        </form>
      </div>
    </div>
  `;
}

function initCart() {
  updateCartUI();

  const cartBtn = document.getElementById('cart-btn');
  const cartClose = document.getElementById('cart-close');
  const cartOverlay = document.getElementById('cart-overlay');
  const sidebar = document.getElementById('cart-sidebar');

  if (cartBtn) cartBtn.addEventListener('click', () => openCart());
  if (cartClose) cartClose.addEventListener('click', () => closeCart());
  if (cartOverlay) cartOverlay.addEventListener('click', () => closeCart());
  window.addEventListener('cartUpdated', updateCartUI);
}

function openCart() {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('active');
}

function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('active');
}

function updateCartUI() {
  const items = Cart.getAll();
  const count = Cart.count();
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  const container = document.getElementById('cart-items');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div class="cart-empty"><i class="ti ti-shopping-bag"></i><p>Your bag is empty</p></div>`;
    document.getElementById('cart-totals').innerHTML = '';
    const btn = document.getElementById('cart-checkout-btn');
    if (btn) btn.style.display = 'none';
    return;
  }

  const base = window.location.pathname.includes('/pages/') ? '../' : '';
  container.innerHTML = items.map(item => `
    <div class="cart-item">
      <div class="cart-item__img">
        ${item.image ? `<img src="${item.image}" alt="${item.name}">` : `<i class="ti ti-shirt" style="font-size:22px;color:var(--border2)"></i>`}
      </div>
      <div class="cart-item__info">
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__variant">${item.size} / ${item.colour}</div>
        <div class="cart-item__row">
          <div class="cart-item__qty">
            <button onclick="cartQty(${item.variantId}, ${item.productId}, ${item.quantity - 1})">−</button>
            <span>${item.quantity}</span>
            <button onclick="cartQty(${item.variantId}, ${item.productId}, ${item.quantity + 1})">+</button>
          </div>
          <span class="cart-item__price">EGP ${(item.price * item.quantity).toFixed(0)}</span>
          <button class="cart-item__remove" onclick="cartRemove(${item.variantId}, ${item.productId})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('');

  const subtotal = Cart.subtotal();
  const shipping = subtotal >= 500 ? 0 : 60;
  const total = subtotal + shipping;

  document.getElementById('cart-totals').innerHTML = `
    <div class="cart-total-row"><span>Subtotal</span><span>EGP ${subtotal.toFixed(0)}</span></div>
    <div class="cart-total-row"><span>Shipping</span><span style="color:${shipping===0?'var(--grn)':'inherit'}">${shipping === 0 ? 'Free' : `EGP ${shipping}`}</span></div>
    <div class="cart-total-row main"><span>Total</span><span>EGP ${total.toFixed(0)}</span></div>
  `;

  const btn = document.getElementById('cart-checkout-btn');
  if (btn) {
    btn.style.display = 'flex';
    btn.href = `${base}pages/checkout.html`;
  }
}

window.cartQty = (variantId, productId, qty) => { Cart.updateQty(variantId, productId, qty); };
window.cartRemove = (variantId, productId) => { Cart.remove(variantId, productId); };

function initAuth() {
  const userBtn = document.getElementById('user-btn');
  const authClose = document.getElementById('auth-close');
  const modal = document.getElementById('auth-modal');

  if (userBtn) {
    userBtn.addEventListener('click', () => {
      if (Auth.isLoggedIn()) {
        const base = window.location.pathname.includes('/pages/') ? '' : 'pages/';
        window.location.href = `${base}profile.html`;
      } else {
        modal?.classList.add('active');
      }
    });
  }
  if (authClose) authClose.addEventListener('click', () => modal?.classList.remove('active'));
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
}

let _authMode = 'login';
window.switchAuthTab = function(mode) {
  _authMode = mode;
  document.getElementById('tab-login')?.classList.toggle('active', mode === 'login');
  document.getElementById('tab-register')?.classList.toggle('active', mode === 'register');
  document.getElementById('auth-title').textContent = mode === 'login' ? 'Login' : 'Create Account';
  document.getElementById('auth-name-group').style.display = mode === 'register' ? 'flex' : 'none';
  document.getElementById('auth-submit').textContent = mode === 'login' ? 'Login' : 'Create Account';
};

window.handleAuth = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('auth-submit');
  btn.textContent = 'Please wait...';
  try {
    let data;
    if (_authMode === 'login') {
      data = await API.login({
        email: document.getElementById('auth-email').value,
        password: document.getElementById('auth-password').value
      });
    } else {
      data = await API.register({
        name: document.getElementById('auth-name').value,
        email: document.getElementById('auth-email').value,
        password: document.getElementById('auth-password').value
      });
    }
    Auth.setSession(data.token, data.user);
    document.getElementById('auth-modal')?.classList.remove('active');
    Toast.success(`Welcome, ${data.user.name}!`);
    setTimeout(() => window.location.reload(), 500);
  } catch (err) {
    Toast.error(err.message);
    btn.textContent = _authMode === 'login' ? 'Login' : 'Create Account';
  }
};

function handleSearch(e) {
  e.preventDefault();
  const q = document.getElementById('search-input')?.value?.trim();
  if (!q) return;
  const base = window.location.pathname.includes('/pages/') ? '' : 'pages/';
  window.location.href = `${base}shop.html?search=${encodeURIComponent(q)}`;
}

function initSearchToggle() {
  const btn = document.getElementById('search-toggle');
  const overlay = document.getElementById('search-overlay');
  if (btn && overlay) {
    btn.addEventListener('click', () => {
      overlay.classList.toggle('active');
      if (overlay.classList.contains('active')) {
        document.getElementById('search-input')?.focus();
      }
    });
  }
}

// Scroll reveal
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

function initMobileNav() {
  const btn = document.getElementById('nav-hamburger');
  const nav = document.getElementById('mobile-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    nav.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && e.target !== btn) {
      nav.classList.remove('open');
    }
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}

// ── Product cache ──
const _productCache = {};
async function _fetchProductCached(id) {
  if (!_productCache[id]) {
    _productCache[id] = await API.getProduct(id);
  }
  return _productCache[id];
}

// ── Quick View ──
let _qvProduct = null, _qvColour = '', _qvSize = '', _qvVariant = null, _qvQty = 1;

window.openQuickView = async function(productId) {
  const modal = document.getElementById('qv-modal');
  if (!modal) return;
  _qvProduct = null; _qvColour = ''; _qvSize = ''; _qvVariant = null; _qvQty = 1;
  document.getElementById('qv-loading').style.display = 'flex';
  document.getElementById('qv-content').style.display = 'none';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  try {
    _qvProduct = await _fetchProductCached(productId);
    _renderQVContent();
  } catch {
    Toast.error('Could not load product');
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

function _renderQVContent() {
  const p = _qvProduct;
  const base = window.location.pathname.includes('/pages/') ? '' : 'pages/';
  document.getElementById('qv-loading').style.display = 'none';
  document.getElementById('qv-content').style.display = 'block';

  // Image
  const imgWrap = document.getElementById('qv-img-wrap');
  if (p.images && p.images.length) {
    imgWrap.innerHTML = `<img src="${p.images[0].url}" alt="${p.name}" id="qv-main-img">`;
  } else {
    imgWrap.innerHTML = `<i class="ti ti-shirt placeholder-icon"></i>`;
  }

  // Thumbnails
  const thumbsEl = document.getElementById('qv-thumbs');
  if (p.images && p.images.length > 1) {
    thumbsEl.style.display = 'flex';
    thumbsEl.innerHTML = p.images.slice(0, 5).map((img, i) =>
      `<div class="qv-thumb ${i===0?'active':''}" onclick="setQVImage('${img.url}',this)">
         <img src="${img.url}" alt="">
       </div>`
    ).join('');
  } else {
    thumbsEl.style.display = 'none';
  }

  // Brand + category
  document.getElementById('qv-brand').textContent = p.brand || 'NOOS';
  document.getElementById('qv-cat').textContent = p.category_name || '';
  document.getElementById('qv-name').textContent = p.name;

  // Rating
  const rating = Number(p.rating) || 0;
  document.getElementById('qv-stars').textContent = starHTML(rating);
  document.getElementById('qv-stars').style.color = 'var(--gold)';
  document.getElementById('qv-rating-text').textContent = rating > 0 ? `${rating.toFixed(1)} · ${p.review_count} reviews` : 'No reviews yet';

  // Price + discount
  document.getElementById('qv-price').textContent = `EGP ${Number(p.price).toFixed(0)}`;
  const oldPriceEl = document.getElementById('qv-old-price');
  const discountEl = document.getElementById('qv-discount');
  if (p.old_price && Number(p.old_price) > Number(p.price)) {
    oldPriceEl.textContent = `EGP ${Number(p.old_price).toFixed(0)}`;
    const disc = Math.round((1 - Number(p.price) / Number(p.old_price)) * 100);
    discountEl.textContent = `-${disc}%`;
    discountEl.style.display = 'inline';
  } else {
    oldPriceEl.textContent = '';
    discountEl.style.display = 'none';
  }

  document.getElementById('qv-full-link').href = `${base}product.html?id=${p.id}`;
  document.getElementById('qv-qty').textContent = 1;
  _qvQty = 1;

  const colours = [...new Map(p.variants.map(v => [v.colour, {colour: v.colour, colour_hex: v.colour_hex}])).values()];
  document.getElementById('qv-colour-swatches').innerHTML = colours.map(c =>
    `<div class="colour-swatch" style="background:${c.colour_hex||'#ccc'}" title="${c.colour}"
         data-colour="${c.colour}"
         onclick="_qvSelectColour('${c.colour.replace(/'/g,"\\'")}','${(c.colour_hex||'#ccc').replace(/'/g,"\\'")}',this)"></div>`
  ).join('');
  if (colours.length > 0) {
    _qvSelectColour(colours[0].colour, colours[0].colour_hex || '#ccc', document.querySelector('#qv-colour-swatches .colour-swatch'));
  }
}

window.setQVImage = function(url, el) {
  const imgWrap = document.getElementById('qv-img-wrap');
  imgWrap.innerHTML = `<img src="${url}" alt="" id="qv-main-img">`;
  document.querySelectorAll('#qv-thumbs .qv-thumb').forEach(t => t.classList.remove('active'));
  el?.classList.add('active');
};

window._qvSelectColour = function _qvSelectColour(colour, hex, el) {
  _qvColour = colour; _qvVariant = null; _qvSize = '';
  document.querySelectorAll('#qv-colour-swatches .colour-swatch').forEach(s => s.classList.remove('active'));
  el?.classList.add('active');
  document.getElementById('qv-colour-name').textContent = colour;
  document.getElementById('qv-size-name').textContent = 'Select a size';

  // Update gallery to show colour-specific images
  const p = _qvProduct;
  if (p.images && p.images.length) {
    const colourImgs = p.images.filter(img => img.colour === colour);
    const imgs = colourImgs.length ? colourImgs : p.images;
    document.getElementById('qv-img-wrap').innerHTML = `<img src="${imgs[0].url}" alt="${p.name}" id="qv-main-img">`;
    const thumbsEl = document.getElementById('qv-thumbs');
    if (imgs.length > 1) {
      thumbsEl.style.display = 'flex';
      thumbsEl.innerHTML = imgs.slice(0, 5).map((img, i) =>
        `<div class="qv-thumb ${i===0?'active':''}" onclick="setQVImage('${img.url}',this)">
           <img src="${img.url}" alt="">
         </div>`
      ).join('');
    } else {
      thumbsEl.style.display = 'none';
      thumbsEl.innerHTML = '';
    }
  }

  const variants = _qvProduct.variants.filter(v => v.colour === colour);
  document.getElementById('qv-size-grid').innerHTML = variants.map(v => {
    const oos = v.stock === 0;
    return `<button class="size-btn ${oos?'oos':''}" ${oos?'disabled':''}
              onclick="${oos?'':`_qvSelectSize('${v.size}',${v.id})`}">${v.size}</button>`;
  }).join('');
  document.getElementById('qv-stock').style.display = 'none';
  _updateQVAtc();
};

window._qvSelectSize = function(size, variantId) {
  _qvSize = size;
  _qvVariant = _qvProduct.variants.find(v => v.id === variantId);
  document.querySelectorAll('#qv-size-grid .size-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('qv-size-name').textContent = size;
  if (_qvVariant) {
    document.getElementById('qv-stock').style.display = 'none';
  }
  _qvQty = 1;
  document.getElementById('qv-qty').textContent = 1;
  _updateQVAtc();
};

window.qvChangeQty = function(delta) {
  _qvQty = Math.max(1, _qvQty + delta);
  if (_qvVariant && _qvQty > _qvVariant.stock) _qvQty = _qvVariant.stock;
  document.getElementById('qv-qty').textContent = _qvQty;
  _updateQVAtc();
};

function _updateQVAtc() {
  const base = Number(_qvProduct?.price || 0);
  document.getElementById('qv-atc-text').textContent = `Add to Cart — EGP ${(base * _qvQty).toFixed(0)}`;
}

window.qvAddToCart = function() {
  if (!_qvColour || !_qvSize || !_qvVariant) { Toast.error('Please select a colour and size'); return; }
  Cart.add({
    productId: _qvProduct.id, variantId: _qvVariant.id,
    name: _qvProduct.name, size: _qvSize, colour: _qvColour,
    image: _qvProduct.images?.[0]?.url || null,
    price: Number(_qvProduct.price),
    quantity: _qvQty
  });
  _closeQV();
  Toast.success('Added to bag!');
};

function _closeQV() {
  document.getElementById('qv-modal')?.classList.remove('active');
  document.body.style.overflow = '';
}

// ── Mini Variant Modal ──
let _mvProduct = null, _mvColour = '', _mvSize = '', _mvVariant = null;

window.openMiniVariant = async function(productId) {
  const modal = document.getElementById('mv-modal');
  if (!modal) return;
  _mvProduct = null; _mvColour = ''; _mvSize = ''; _mvVariant = null;
  document.getElementById('mv-loading').style.display = 'flex';
  document.getElementById('mv-content').style.display = 'none';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  try {
    _mvProduct = await _fetchProductCached(productId);
    document.getElementById('mv-title').textContent = _mvProduct.name;
    _renderMVContent();
  } catch {
    Toast.error('Could not load product');
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

function _renderMVContent() {
  document.getElementById('mv-loading').style.display = 'none';
  document.getElementById('mv-content').style.display = 'block';
  const colours = [...new Map(_mvProduct.variants.map(v => [v.colour, {colour: v.colour, colour_hex: v.colour_hex}])).values()];
  document.getElementById('mv-colour-swatches').innerHTML = colours.map(c =>
    `<div class="colour-swatch" style="background:${c.colour_hex||'#ccc'}" title="${c.colour}"
         data-colour="${c.colour}"
         onclick="_mvSelectColour('${c.colour.replace(/'/g,"\\'")}',this)"></div>`
  ).join('');
  if (colours.length > 0) {
    _mvSelectColour(colours[0].colour, document.querySelector('#mv-colour-swatches .colour-swatch'));
  }
}

window._mvSelectColour = function(colour, el) {
  _mvColour = colour; _mvVariant = null; _mvSize = '';
  document.querySelectorAll('#mv-colour-swatches .colour-swatch').forEach(s => s.classList.remove('active'));
  el?.classList.add('active');
  document.getElementById('mv-colour-name').textContent = colour;
  document.getElementById('mv-size-name').textContent = 'Select';
  const variants = _mvProduct.variants.filter(v => v.colour === colour);
  document.getElementById('mv-size-grid').innerHTML = variants.map(v => {
    const oos = v.stock === 0;
    return `<button class="size-btn ${oos?'oos':''}" ${oos?'disabled':''}
              onclick="${oos?'':`_mvSelectSize('${v.size}',${v.id})`}">${v.size}</button>`;
  }).join('');
};

window._mvSelectSize = function(size, variantId) {
  _mvSize = size;
  _mvVariant = _mvProduct.variants.find(v => v.id === variantId);
  document.querySelectorAll('#mv-size-grid .size-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('mv-size-name').textContent = size;
};

window.mvAddToCart = function() {
  if (!_mvColour || !_mvSize || !_mvVariant) { Toast.error('Please select a colour and size'); return; }
  Cart.add({
    productId: _mvProduct.id, variantId: _mvVariant.id,
    name: _mvProduct.name, size: _mvSize, colour: _mvColour,
    image: _mvProduct.images?.[0]?.url || null,
    price: Number(_mvProduct.price),
    quantity: 1
  });
  _closeMV();
  Toast.success('Added to bag!');
};

function _closeMV() {
  document.getElementById('mv-modal')?.classList.remove('active');
  document.body.style.overflow = '';
}

function _initModals() {
  // Inject modals into body if not already present
  if (!document.getElementById('qv-modal')) {
    const div = document.createElement('div');
    div.innerHTML = renderQuickViewModal();
    document.body.appendChild(div.firstElementChild);
  }
  if (!document.getElementById('mv-modal')) {
    const div = document.createElement('div');
    div.innerHTML = renderMiniVariantModal();
    document.body.appendChild(div.firstElementChild);
  }
  // Close handlers
  document.getElementById('qv-close')?.addEventListener('click', _closeQV);
  document.getElementById('mv-close')?.addEventListener('click', _closeMV);
  document.getElementById('qv-modal')?.addEventListener('click', (e) => { if (e.target.id === 'qv-modal') _closeQV(); });
  document.getElementById('mv-modal')?.addEventListener('click', (e) => { if (e.target.id === 'mv-modal') _closeMV(); });
  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { _closeQV(); _closeMV(); }
  });
}

// Init layout
function initLayout() {
  initCart();
  initAuth();
  initSearchToggle();
  initScrollReveal();
  initMobileNav();
  _initModals();
}
