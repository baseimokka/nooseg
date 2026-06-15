# Manual Payment Verification — Implementation Notes

Adds **InstaPay** and **Vodafone Cash** alongside **Cash on Delivery (COD)**. Customers transfer
money externally and upload a proof screenshot; admins verify (approve / reject) from the dashboard.
No payment gateway. Built on the existing Express + `mysql2` + Vanilla-JS stack.

## Database changes

Run once on an existing DB (idempotent):

```bash
cd backend
node config/migrate-payments.js
```

Fresh installs get the same schema from `config/seed.js`.

**`orders` table**
- `payment_method` ENUM widened → `'COD','instapay','vodafone_cash'`
- `payment_status` ENUM widened → `'pending','paid','refunded','pending_verification','verified','rejected'`
- `payment_proof` VARCHAR(500) — URL of uploaded screenshot
- `payment_verified_at` DATETIME
- `payment_verified_by` INT UNSIGNED → FK `users(id)` (the verifying admin)
- `payment_notes` TEXT — admin verification note
- new index `idx_payment_status`

**`settings` table (new)** — generic key/value store, seeded with:
`instapay_name`, `instapay_identifier`, `vodafone_name`, `vodafone_identifier`,
`payment_instructions`, `store_name`, `free_shipping`, `newsletter_code`.
Defaults are inserted with `INSERT IGNORE` so admin edits are never clobbered.

## Payment status meaning
| Method | Initial `payment_status` |
|--------|--------------------------|
| COD | `pending` |
| InstaPay / Vodafone Cash | `pending_verification` |

Admin approve → `verified`; reject → `rejected` (both stamp verifier + timestamp + notes).

## API

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/orders` | optional | **Now multipart.** `items`/`shipping` are JSON strings; optional `paymentProof` file. Proof required server-side for InstaPay/Vodafone. |
| PATCH | `/api/orders/:id/payment` | admin | Body `{ action: 'approve'|'reject', notes }` → sets verified/rejected. |
| GET | `/api/settings` | public | Payment account info + instructions for checkout (whitelisted keys only). |
| GET | `/api/settings/admin/all` | admin | Full settings map. |
| PUT | `/api/settings` | admin | Bulk upsert. |

Order list/detail responses now also include `payment_method`, `payment_status`, `payment_proof`,
`payment_verified_at`, `payment_notes`, `verified_by_name`, and `customer_phone`.

## Upload security (`routes/index.js` → `uploadProof`)
- Dedicated dir `backend/uploads/payments/` (auto-created).
- Image only: extension whitelist `.jpg/.jpeg/.png/.webp` **and** MIME `image/(jpeg|png|webp)`.
- Max 5 MB (multer limit).
- Unique, sanitized filename `proof-<timestamp>-<random><ext>` → never overwrites.
- Proof presence re-checked in `orderController.placeOrder` for manual methods.

## Files changed
**Backend:** `config/migrate-payments.js` (new), `config/seed.js`, `models/Settings.js` (new),
`controllers/settingsController.js` (new), `models/Order.js`, `controllers/orderController.js`,
`routes/index.js`.
**Frontend:** `js/api.js`, `pages/checkout.html`, `pages/admin.html`,
`images/payments/instapay.png` + `vodafone-cash.jpg` (new).

## Customer flow (`checkout.html`)
Step 1 adds a payment-method selector. Choosing InstaPay/Vodafone reveals account name + identifier
(from settings) + amount + a drag-and-drop proof uploader (preview, client-side type/size validation).
Proof is required before continuing. Success screen messaging adapts to "pending verification".

## Admin flow (`admin.html` → Orders)
- Filters: **Payment Method** + **Payment Status** dropdowns; search by order #, name, email, phone.
- "Method" column + payment-status pills (`To Verify` / `Verified` / `Rejected`) with a flag icon on
  pending-verification rows.
- Order modal: payment block with proof thumbnail → click to open full-size lightbox, Approve/Reject
  buttons (with confirm dialog), notes field, and verifier/date once decided.
- **Settings → Payment Settings** card edits the InstaPay/Vodafone account info + instructions
  (server-backed; store config also moved to the `settings` table).

## Adding a future payment method
1. Add the value to both `orders` ENUMs (migration) + `PAYMENT_METHODS` in `orderController.js`.
2. Add settings keys (name/identifier) + a default row.
3. Add a radio card in `checkout.html` and a filter option in `admin.html`.
The verification workflow and proof handling are already method-agnostic.
