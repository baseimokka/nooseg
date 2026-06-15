# DEPLOYMENT_GUIDE.md — NOOS (Multi-App VPS)

> **Scope:** Deploy **NOOS** ("Never Out Of Stock" menswear store) onto a Hostinger
> Ubuntu VPS that **already runs a production app called `domdom`**.
> **Prime directive:** Do **not** break, restart unnecessarily, or reconfigure
> `domdom`. NOOS is added side-by-side with fully isolated port, PM2 process,
> Nginx server block, MySQL database, MySQL user, `.env`, and SSL certificate.
>
> Generated for the NOOS codebase as it exists today. Architecture-specific
> facts (single Express process, relative `/api`, port 3000 default) are baked in.

---

## 0. Architecture facts that drive this guide (read first)

These come straight from the NOOS code — they change how we deploy:

| Fact | Source | Consequence for deployment |
|------|--------|----------------------------|
| One Express process serves **frontend static files + `/uploads` + `/api`** | `backend/server.js` (`express.static('../frontend')`, `app.use('/uploads', ...)`, `app.use('/api', ...)`) | Nginx proxies **everything** to a single Node port. No separate static host needed. |
| Frontend calls the API with a **relative** base `API_BASE = '/api'` | `frontend/js/api.js:3` | Same-origin in production → no cross-origin config to change, no hardcoded `localhost` to edit. |
| Default port is **3000** | `server.js:55` (`PORT \|\| 3000`) | This is the **collision point** with domdom. NOOS gets an explicit `PORT` (we use **3001**). |
| Server **exits on boot** if `DB_HOST/DB_USER/DB_NAME/JWT_SECRET` missing | `server.js:9-14` | `.env` must be complete or PM2 will crash-loop. |
| Server **exits** if `JWT_SECRET` < 32 chars or equals the known default | `server.js:15-18` | Generate a fresh strong secret (command provided below). |
| DB is auto-created idempotently by the seeder | `backend/config/seed.js` (`CREATE DATABASE/TABLE IF NOT EXISTS`) | Safe to run; will not drop domdom data. |
| Uploads written to `backend/uploads/` on local disk, gitignored | `server.js:33`, `.gitignore` | Directory must exist and **persist** across deploys; never wiped. |
| `cors()` is wide-open, `helmet` CSP disabled | `server.js:25-27` | Tighten CORS to the NOOS origin; CSP optional hardening (Section 8). |

**Net effect:** NOOS is a self-contained monolith. The isolation work is almost
entirely about giving it its **own port, process, vhost, DB, and cert** without
touching domdom's equivalents.

---

## 1. VPS pre-checks (run BEFORE changing anything)

SSH in as a sudo user. Capture the current state so you can prove domdom is
untouched afterward.

```bash
# 1.1 — What is domdom using right now? (DO NOT change any of it)
pm2 list                                  # note domdom's process name + status
pm2 describe domdom 2>/dev/null | grep -E "script path|exec cwd|port|PORT" 
sudo ss -ltnp | grep -E ':(3000|3001|3002)'   # which ports are taken
sudo nginx -T | grep -E "server_name|listen|proxy_pass"   # existing vhosts + upstreams

# 1.2 — Toolchain present?
node -v        # expect v18+ (NOOS uses Express 4, mysql2 3.x — Node 18 LTS or 20 LTS)
npm -v
pm2 -v
nginx -v
mysql --version
certbot --version

# 1.3 — MySQL: confirm domdom's DB exists and note its name/user (do not modify)
sudo mysql -e "SHOW DATABASES;"
sudo mysql -e "SELECT user, host FROM mysql.user;"

# 1.4 — Disk / memory headroom for a second app
df -h /
free -m
```

**Port assignment (confirmed):** domdom runs on **3000** — which is also NOOS's
hardcoded default (`server.js:55`). NOOS is therefore pinned to **3001** throughout
this guide. Confirm `3001` is free in step 1.1; if something else already holds it,
use `3002` and substitute it everywhere below.

> ⚠️ If `node -v` shows a version domdom depends on, **do not upgrade Node** to suit
> NOOS. NOOS runs on Node 18/20 LTS — match or stay compatible with what domdom
> already needs. Use `nvm` only if you must run different majors per app.

---

## 2. Safe multi-app architecture

```
                          Internet
                             │
                  ┌──────────┴───────────┐
                  │   Nginx (port 80/443)│   one Nginx, many server blocks
                  └──────────┬───────────┘
         server_name <domdom domain> │ server_name nooseg.com
                  ┌──────────────┴───────────────┐
                  ▼                               ▼
        proxy_pass 127.0.0.1:3000        proxy_pass 127.0.0.1:3001
                  │                               │
          ┌───────┴────────┐              ┌───────┴────────┐
          │ PM2: domdom    │              │ PM2: noos      │
          │ /var/www/domdom│              │ /var/www/noos  │
          │ port 3000      │              │ port 3001      │
          └───────┬────────┘              └───────┬────────┘
                  │                               │
                  ▼                               ▼
          MySQL db: domdom_*              MySQL db: noos_store
          user: domdom_user               user: noos_user
```

**Isolation matrix** — every row is independent so the two apps cannot collide:

| Concern        | domdom (existing — leave alone) | NOOS (new)                         |
|----------------|----------------------------------|------------------------------------|
| Code path      | `/var/www/domdom`                | `/var/www/noos`                    |
| Node port      | **3000** (existing)              | **3001** (loopback only)           |
| PM2 process    | `domdom`                         | `noos`                             |
| Nginx vhost    | `domdom` server block            | new `noos` server block            |
| Domain         | domdom's domain                  | `nooseg.com` (+ `www.nooseg.com`)  |
| MySQL DB       | domdom's DB                      | `noos_store`                       |
| MySQL user     | domdom's user                    | `noos_user` (scoped to `noos_store`)|
| `.env`         | domdom's `.env`                  | `/var/www/noos/backend/.env`       |
| Uploads        | domdom's dir                     | `/var/www/noos/backend/uploads`    |
| SSL cert       | domdom's cert                    | separate Let's Encrypt cert        |

Both Node apps bind only to `127.0.0.1`; the **only** publicly exposed service is
Nginx. That is what keeps them safely co-resident.

---

## 3. Deploy the NOOS code to `/var/www/noos`

```bash
# 3.1 — Create the path (domdom's /var/www/domdom is untouched)
sudo mkdir -p /var/www/noos
sudo chown -R $USER:$USER /var/www/noos

# 3.2 — Get the code there (choose ONE)
#   a) git
git clone <your-noos-repo-url> /var/www/noos
#   b) or rsync from your machine (run locally):
#   rsync -avz --exclude node_modules --exclude backend/.env \
#     ./ user@vps:/var/www/noos/

cd /var/www/noos/backend

# 3.3 — Install production deps only
npm ci --omit=dev   # falls back to: npm install --production

# 3.4 — Ensure the uploads dir exists and survives future deploys
mkdir -p /var/www/noos/backend/uploads/products
```

> **Persisting uploads across redeploys:** `backend/uploads/` is gitignored, so a
> fresh `git pull`/clone never touches it — good. But if you ever redeploy by
> replacing the directory, keep uploads outside the deploy target or symlink them.
> Simplest safe pattern:
> ```bash
> sudo mkdir -p /var/srv/noos-uploads
> sudo chown -R $USER:$USER /var/srv/noos-uploads
> rsync -a /var/www/noos/backend/uploads/ /var/srv/noos-uploads/   # migrate existing
> rm -rf /var/www/noos/backend/uploads
> ln -s /var/srv/noos-uploads /var/www/noos/backend/uploads
> ```

---

## 4. MySQL — isolated database + user for NOOS

domdom keeps its own database and user. NOOS gets a **dedicated** database and a
**least-privilege** user scoped to that one schema. Never reuse domdom's user, and
**stop using `root`** (the current `.env` does — fix that here).

```bash
sudo mysql
```

```sql
-- Create NOOS database (matches DB_NAME in .env). Seeder also does this, but we
-- create it explicitly so we can grant the scoped user up front.
CREATE DATABASE IF NOT EXISTS noos_store
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dedicated user, strong password, granted ONLY on noos_store.* — cannot see or
-- touch domdom's database.
CREATE USER 'noos_user'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON noos_store.* TO 'noos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Verify the scoping (this user must see `noos_store` but NOT domdom's DB):

```bash
mysql -u noos_user -p -e "SHOW DATABASES;"
```

Then seed the schema + admin + sample data (idempotent — safe to re-run):

```bash
cd /var/www/noos/backend
node config/seed.js
# Then run the migrations the project ships (payments + phase 5):
node config/migrate-payments.js
node config/migrate-phase5.js
```

> The seeder connects with the credentials from `.env`, so complete Section 5
> first if you want it to use `noos_user`. (You can also run the seeder once as
> root and switch `.env` to `noos_user` afterward — either works because the
> schema is identical.) Default admin login created by the seed: `admin@noos.eg`.
> **Change that admin password immediately after first login.**

---

## 5. NOOS environment file (`.env` isolation)

The `.env` lives only inside the NOOS tree and is gitignored. domdom's `.env` is
separate and never read by NOOS.

```bash
cd /var/www/noos/backend
# Generate a strong JWT secret (server.js rejects anything < 32 chars or the default)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create `/var/www/noos/backend/.env`:

```ini
# Port — MUST differ from domdom. 3001 for NOOS.
PORT=3001

# MySQL — dedicated DB + scoped user (NOT root, NOT domdom's user)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=noos_store
DB_USER=noos_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Auth — paste the 96-char hex string generated above
JWT_SECRET=<paste_generated_secret_here>
```

Lock it down:

```bash
chmod 600 /var/www/noos/backend/.env
```

> `server.js` will refuse to boot (exit 1) if any of `DB_HOST/DB_USER/DB_NAME/JWT_SECRET`
> are missing or if `JWT_SECRET` is weak. If PM2 shows NOOS crash-looping, this is
> the first thing to check (`pm2 logs noos`).

Smoke-test before involving PM2:

```bash
cd /var/www/noos/backend
node server.js
# Expect: "NOOS server running on http://localhost:3001"
# In another shell:  curl -s http://127.0.0.1:3001/api/health
# Expect: {"status":"ok",...}.  Ctrl-C to stop.
```

---

## 6. PM2 — isolated process on its own port

Do **not** touch domdom's PM2 entry. Add NOOS as a separate, named process via its
own ecosystem file so config is reproducible.

Create `/var/www/noos/ecosystem.config.js`:

```js
module.exports = {
  apps: [{
    name: 'noos',                          // distinct from 'domdom'
    cwd: '/var/www/noos/backend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',                     // single Express listener; not cluster
    env: { NODE_ENV: 'production' },       // PORT/DB/JWT come from backend/.env
    max_memory_restart: '300M',
    error_file: '/var/log/pm2/noos-error.log',
    out_file: '/var/log/pm2/noos-out.log',
    time: true
  }]
};
```

```bash
sudo mkdir -p /var/log/pm2 && sudo chown -R $USER:$USER /var/log/pm2

cd /var/www/noos
pm2 start ecosystem.config.js     # starts ONLY noos; domdom untouched
pm2 list                          # confirm BOTH domdom (online) and noos (online)

# Persist the new process list so a reboot brings both back.
pm2 save
# If PM2 startup was already configured for domdom, `pm2 save` is enough.
# Run `pm2 startup` ONLY if no systemd PM2 unit exists yet (check: systemctl status pm2-$USER).
```

> ⚠️ `pm2 save` snapshots **all** running processes. Make sure domdom is `online`
> when you save, or you could drop it from the boot list. Verify with `pm2 list`
> immediately before and after.

Confirm NOOS is listening on loopback only:

```bash
sudo ss -ltnp | grep 3001     # should show node bound to 127.0.0.1:3001
curl -s http://127.0.0.1:3001/api/health
```

---

## 7. Nginx — new server block, domdom's vhost untouched

Add a **new file** in `sites-available`. Never edit domdom's existing config file.

```bash
sudo nano /etc/nginx/sites-available/noos
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name nooseg.com www.nooseg.com;

    # Uploads can be large (Multer image uploads, up to ~5MB each)
    client_max_body_size 25M;

    # NOOS Express serves frontend + /uploads + /api itself, so proxy everything.
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/noos /etc/nginx/sites-enabled/noos

# CRITICAL: test before reload. A bad config would otherwise take domdom down too.
sudo nginx -t
# Only if "syntax is ok / test is successful":
sudo systemctl reload nginx    # reload, NOT restart — zero downtime for domdom
```

`sudo nginx -t` validating means domdom's block still parses cleanly. Because each
app is its own `server_name`, Nginx routes by Host header with zero overlap.

> **DNS:** Point an A record for `nooseg.com` (and a `www` A or CNAME record) to the
> VPS IP before requesting SSL. domdom's DNS records are separate and unchanged.

---

## 8. SSL — separate Let's Encrypt cert for NOOS

Certbot issues a **distinct** certificate for the NOOS domain and edits **only**
the NOOS server block. domdom's certificate and its auto-renewal are not affected.

```bash
sudo certbot --nginx -d nooseg.com -d www.nooseg.com
```

- Choose redirect HTTP→HTTPS when prompted.
- Certbot adds `listen 443 ssl` + cert paths to the `noos` block only.

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certificates          # should list BOTH domdom's and noos's certs
sudo certbot renew --dry-run       # confirm renewal works for all certs together
```

### Recommended app-level hardening (optional but advised)

NOOS ships with `cors()` fully open and `helmet` CSP disabled (`server.js:25-27`).
Once the domain is live behind HTTPS, tighten:

- **CORS:** Because the frontend uses a same-origin relative `/api`, you can safely
  restrict CORS to the NOOS origin:
  ```js
  // server.js
  app.use(cors({ origin: 'https://nooseg.com', credentials: true }));
  ```
- **Trust proxy:** add `app.set('trust proxy', 1);` so `express-rate-limit` and
  client-IP logging see the real IP through Nginx.
- **CSP:** the code intentionally leaves Helmet's CSP off due to inline scripts/CDN
  assets. Add a tailored CSP only after auditing inline usage; otherwise leave as-is
  to avoid breaking the UI.

Apply these in `/var/www/noos/backend/server.js`, then `pm2 reload noos` (reloads
NOOS only).

---

## 9. Multi-app deployment validation

Run end-to-end checks proving **both** apps are healthy and independent.

```bash
# 9.1 — Processes: both online
pm2 list                          # domdom: online | noos: online

# 9.2 — Ports: distinct, loopback-bound
sudo ss -ltnp | grep -E ':(3000|3001)'

# 9.3 — Local app health (bypass Nginx)
curl -s http://127.0.0.1:3001/api/health        # NOOS → {"status":"ok",...}
# (domdom's own local health endpoint, if any — leave it running)

# 9.4 — Public, per-domain (proves Host-based routing + SSL isolation)
curl -sI https://nooseg.com/                      # 200, served by NOOS
curl -s  https://nooseg.com/api/health            # NOOS JSON
curl -sI https://<domdom-domain>/                 # 200, still domdom — UNCHANGED

# 9.5 — DB isolation
mysql -u noos_user -p -e "USE noos_store; SHOW TABLES;"   # NOOS tables present
mysql -u noos_user -p -e "SHOW DATABASES;"                # domdom DB NOT listed

# 9.6 — Functional smoke test of NOOS
#   - Load https://nooseg.com in a browser
#   - Log in to /pages/admin.html as admin@noos.eg, confirm dashboard stats load
#   - Add a product image → confirm it lands in /var/www/noos/backend/uploads/products
#   - Place a test order end-to-end

# 9.7 — Reboot survivability (optional, off-peak)
sudo reboot
# After reconnect:
pm2 list                          # BOTH back online automatically
```

Acceptance = every check passes **and** domdom's domain still serves domdom.

---

## 10. Redeploy / update procedure (NOOS only)

```bash
cd /var/www/noos
git pull                          # uploads dir untouched (gitignored)
cd backend && npm ci --omit=dev
# If schema changed, re-run the idempotent seed/migrations:
# node config/seed.js && node config/migrate-payments.js && node config/migrate-phase5.js
pm2 reload noos                   # zero-downtime reload of NOOS ONLY
pm2 logs noos --lines 50          # confirm clean boot
```

Never use `pm2 restart all` or `pm2 reload all` — that would bounce domdom too.
Always target the process by name: `pm2 reload noos`.

---

## 11. Troubleshooting (two apps on one VPS)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| NOOS crash-loops in `pm2 logs noos` with `FATAL: missing required environment variables` | `.env` missing a key or PM2 didn't load it | Confirm `/var/www/noos/backend/.env` has `DB_HOST/DB_USER/DB_NAME/JWT_SECRET`; `cwd` in ecosystem points at `backend/`. |
| `FATAL: JWT_SECRET ... too short ... insecure default` | Secret < 32 chars or left as the doc default | Regenerate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`, paste into `.env`, `pm2 reload noos`. |
| `EADDRINUSE :3001` | Port collides (domdom or a stray node) | `sudo ss -ltnp \| grep 3001`; change NOOS `PORT` to 3002 in `.env` + Nginx `proxy_pass`, reload both. |
| NOOS site shows domdom (or vice versa) | `server_name` overlap / wrong default vhost | Ensure each block has a distinct `server_name`; `sudo nginx -T \| grep server_name`; reload Nginx. |
| `502 Bad Gateway` on nooseg.com | Node process down or wrong proxy port | `pm2 list`; `curl 127.0.0.1:3001/api/health`; match `proxy_pass` port to `.env` PORT. |
| `nginx -t` fails after editing | Syntax error in the new noos block | Fix the noos file; **do not reload** until `nginx -t` passes — domdom stays up on the old running config. |
| MySQL `Access denied for user 'noos_user'` | Wrong password or missing grant | Re-run `GRANT ALL ON noos_store.* TO 'noos_user'@'localhost'; FLUSH PRIVILEGES;`; check `.env` password. |
| Uploaded images 404 after redeploy | uploads dir replaced/wiped | Restore from the persistent location / symlink (Section 3); confirm `/var/www/noos/backend/uploads` exists and is writable by the PM2 user. |
| domdom dropped from boot after `pm2 save` | domdom wasn't `online` at save time | Start domdom, verify `pm2 list`, run `pm2 save` again. |
| 413 Request Entity Too Large on image upload | Nginx body limit too low | `client_max_body_size 25M;` in the noos block; reload Nginx. |
| Certbot renewal warning | Both certs renew together fine, but check | `sudo certbot renew --dry-run`; certs are independent per domain. |

**Golden rules for this VPS**
1. Target NOOS by name (`pm2 reload noos`, the `noos` Nginx file) — never `all`.
2. Always `sudo nginx -t` before `reload`; **reload**, never `restart`.
3. Keep ports, DBs, users, `.env`, and certs fully separated per the matrix in §2.
4. Verify domdom is still serving after every NOOS change (`curl -sI https://<domdom-domain>/`).
