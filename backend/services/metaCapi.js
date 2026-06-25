// ── Meta (Facebook) Conversions API — server-side event forwarding ───────────
// Sends the Purchase event straight to Meta's Graph API so conversions are
// captured even when the browser Pixel is blocked (ad-blockers, iOS ITP, lost
// network). Each server event carries the SAME event_id as the browser Pixel
// event, so Meta automatically de-duplicates the pair (see frontend/js/pixel.js
// + checkout.html). PII (email/phone) is SHA-256 hashed before it ever leaves
// this server, per Meta's requirements.
//
// Config comes from backend/.env:
//   META_PIXEL_ID         — same numeric ID used by the browser Pixel
//   META_CAPI_TOKEN       — Conversions API access token (Events Manager)
//   META_TEST_EVENT_CODE  — optional; set while verifying in Test Events, then clear
//   META_GRAPH_VERSION    — optional; defaults to a known-good Graph version

const crypto = require('crypto');

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
const PIXEL_ID = process.env.META_PIXEL_ID || '';
const ACCESS_TOKEN = process.env.META_CAPI_TOKEN || '';
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || '';

// CAPI is only active when both the pixel id and the access token are present.
function isEnabled() {
  return Boolean(PIXEL_ID && ACCESS_TOKEN);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Email: trim + lowercase, then hash. Returns undefined for empty input.
function hashEmail(email) {
  if (!email) return undefined;
  const norm = String(email).trim().toLowerCase();
  return norm ? sha256(norm) : undefined;
}

// Phone: reduce to E.164 digits (Egypt country code 20, no '+'), then hash.
//   01xxxxxxxxx  → 2010xxxxxxxx   (local mobile with leading 0)
//   1xxxxxxxxx   → 201xxxxxxxxx   (mobile without leading 0)
//   already 20…  → left as-is
function hashPhone(phone) {
  if (!phone) return undefined;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('20')) {
    // already has the country code
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = '20' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '20' + digits;
  }
  return sha256(digits);
}

// Fire a server-side Purchase event. Always resolves on caller-side via the
// caller's .catch(); never throws into the order flow.
async function sendPurchaseEvent(payload = {}) {
  if (!isEnabled()) return { skipped: true };

  const userData = {};
  const em = hashEmail(payload.email);
  const ph = hashPhone(payload.phone);
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (payload.clientIp) userData.client_ip_address = payload.clientIp;
  if (payload.userAgent) userData.client_user_agent = payload.userAgent;
  if (payload.fbp) userData.fbp = payload.fbp;
  if (payload.fbc) userData.fbc = payload.fbc;

  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    user_data: userData,
    custom_data: {
      currency: payload.currency || 'EGP',
      value: Number(payload.value) || 0,
      content_type: 'product',
      content_ids: payload.contentIds || [],
      contents: payload.contents || [],
      num_items: payload.numItems || 0,
      order_id: payload.orderId
    }
  };
  // event_id + event_source_url are what make browser/server de-duplication work.
  if (payload.eventId) event.event_id = payload.eventId;
  if (payload.eventSourceUrl) event.event_source_url = payload.eventSourceUrl;

  const body = { data: [event] };
  if (TEST_EVENT_CODE) body.test_event_code = TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Meta CAPI ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json().catch(() => ({}));
}

module.exports = { sendPurchaseEvent, isEnabled };
