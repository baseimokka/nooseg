// ── Meta (Facebook) Pixel — client-side tracking ─────────────────────────────
// Loaded on every customer-facing page (NOT the admin panel). Bootstraps fbq,
// fires PageView once per navigation, and exposes a small `MetaPixel` helper used
// by the product, cart and checkout flows. Purchase events carry an event_id that
// is also sent to the server (see js/api.js + backend) so Meta de-duplicates the
// browser event against the Conversions API event.
(function () {
  'use strict';

  // Public Pixel ID — must match META_PIXEL_ID in backend/.env.
  var PIXEL_ID = '27198387746485042';

  // Official Meta Pixel base code (self-injects connect.facebook.net/fbevents.js).
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
    n.queue = []; t = b.createElement(e); t.async = !0;
    t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' +
      name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // First-party Meta browser cookie, used for Advanced Matching on the server.
  function getFbp() { return getCookie('_fbp') || ''; }

  // Click identifier. Prefer the _fbc cookie; otherwise reconstruct it from the
  // fbclid query param Meta appends to ad clicks (format: fb.1.<ts>.<fbclid>).
  function getFbc() {
    var fbc = getCookie('_fbc');
    if (fbc) return fbc;
    var m = window.location.search.match(/[?&]fbclid=([^&]+)/);
    return m ? 'fb.1.' + Date.now() + '.' + decodeURIComponent(m[1]) : '';
  }

  function genEventId() {
    return 'noos-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function track(name, params, eventId) {
    if (typeof fbq !== 'function') return;
    if (eventId) fbq('track', name, params || {}, { eventID: eventId });
    else fbq('track', name, params || {});
  }

  function ids(items) { return (items || []).map(function (i) { return String(i.productId); }); }
  function contents(items) {
    return (items || []).map(function (i) {
      return { id: String(i.productId), quantity: Number(i.quantity) || 1 };
    });
  }
  function numItems(items) {
    return (items || []).reduce(function (s, i) { return s + (Number(i.quantity) || 1); }, 0);
  }

  window.MetaPixel = {
    PIXEL_ID: PIXEL_ID,
    track: track,
    genEventId: genEventId,
    getFbp: getFbp,
    getFbc: getFbc,

    // Product detail view
    viewContent: function (p) {
      if (!p) return;
      track('ViewContent', {
        content_type: 'product',
        content_ids: [String(p.id)],
        content_name: p.name,
        value: Number(p.price) || 0,
        currency: 'EGP'
      });
    },

    // A single cart-add (item carries the quantity being added)
    addToCart: function (item) {
      if (!item) return;
      var qty = Number(item.quantity) || 1;
      track('AddToCart', {
        content_type: 'product',
        content_ids: [String(item.productId)],
        content_name: item.name,
        contents: [{ id: String(item.productId), quantity: qty }],
        value: (Number(item.price) || 0) * qty,
        currency: 'EGP'
      });
    },

    // Reached the checkout page with a non-empty cart
    initiateCheckout: function (items, value) {
      track('InitiateCheckout', {
        content_type: 'product',
        content_ids: ids(items),
        contents: contents(items),
        num_items: numItems(items),
        value: Number(value) || 0,
        currency: 'EGP'
      });
    },

    // Order placed. Pass the same eventId to the server for de-duplication.
    purchase: function (data, eventId) {
      data = data || {};
      track('Purchase', {
        content_type: 'product',
        content_ids: ids(data.items),
        contents: contents(data.items),
        num_items: numItems(data.items),
        value: Number(data.value) || 0,
        currency: 'EGP',
        order_id: data.orderId
      }, eventId);
    }
  };
})();
