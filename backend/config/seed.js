require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });

  console.log('Connected to MySQL');

  await conn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE ${process.env.DB_NAME}`);

  console.log('Creating tables...');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(120)  NOT NULL,
      email         VARCHAR(191)  NOT NULL UNIQUE,
      password_hash VARCHAR(255)  NOT NULL,
      phone         VARCHAR(30),
      role          ENUM('user','admin') NOT NULL DEFAULT 'user',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_role  (role)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS addresses (
      id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id     INT UNSIGNED NOT NULL,
      full_name   VARCHAR(120) NOT NULL,
      phone       VARCHAR(30),
      city        VARCHAR(100) NOT NULL,
      area        VARCHAR(100),
      address     VARCHAR(255) NOT NULL,
      postal_code VARCHAR(20),
      is_default  TINYINT(1) NOT NULL DEFAULT 0,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      slug       VARCHAR(120) NOT NULL UNIQUE,
      image_url  VARCHAR(500),
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      active     TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_slug   (slug),
      INDEX idx_active (active)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name         VARCHAR(255) NOT NULL,
      description  TEXT,
      category_id  INT UNSIGNED NOT NULL,
      price        DECIMAL(10,2) NOT NULL,
      old_price    DECIMAL(10,2),
      sku          VARCHAR(100) UNIQUE,
      badge        ENUM('new','sale','bestseller','limited') DEFAULT NULL,
      rating       DECIMAL(3,2) NOT NULL DEFAULT 0.00,
      review_count INT UNSIGNED NOT NULL DEFAULT 0,
      is_featured  TINYINT(1) NOT NULL DEFAULT 0,
      active       TINYINT(1) NOT NULL DEFAULT 1,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FULLTEXT idx_search (name, description, sku),
      INDEX idx_category (category_id),
      INDEX idx_active   (active),
      INDEX idx_featured (is_featured),
      INDEX idx_badge    (badge)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NOT NULL,
      size       VARCHAR(20)  NOT NULL,
      colour     VARCHAR(50)  NOT NULL,
      colour_hex VARCHAR(10),
      sku        VARCHAR(120) UNIQUE,
      price_adj  DECIMAL(8,2) NOT NULL DEFAULT 0.00,
      active     TINYINT(1) NOT NULL DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY uq_variant (product_id, size, colour),
      INDEX idx_product_id (product_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NOT NULL,
      variant_id INT UNSIGNED,
      colour     VARCHAR(50),
      url        VARCHAR(500) NOT NULL,
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
      INDEX idx_product_id (product_id)
    )
  `);

  // Migration: add colour column if upgrading from older schema
  try {
    await conn.query('ALTER TABLE product_images ADD COLUMN colour VARCHAR(50) NULL AFTER variant_id');
    console.log('Migration: added colour column to product_images');
  } catch (e) {
    if (!(e.message || '').includes('Duplicate column')) throw e;
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      variant_id          INT UNSIGNED NOT NULL UNIQUE,
      stock               INT UNSIGNED NOT NULL DEFAULT 0,
      low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5,
      updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_number   VARCHAR(30)  NOT NULL UNIQUE,
      user_id        INT UNSIGNED,
      guest_email    VARCHAR(191),
      guest_phone    VARCHAR(30),
      subtotal       DECIMAL(10,2) NOT NULL,
      shipping_cost  DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
      discount       DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
      total          DECIMAL(10,2) NOT NULL,
      coupon_code    VARCHAR(50),
      payment_method ENUM('COD','instapay','vodafone_cash') NOT NULL DEFAULT 'COD',
      payment_status ENUM('pending','paid','refunded','pending_verification','verified','rejected') NOT NULL DEFAULT 'pending',
      payment_proof       VARCHAR(500),
      payment_verified_at DATETIME,
      payment_verified_by INT UNSIGNED,
      payment_notes       TEXT,
      order_status   ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
      admin_notes    TEXT,
      ship_full_name VARCHAR(120) NOT NULL,
      ship_phone     VARCHAR(30)  NOT NULL,
      ship_city      VARCHAR(100) NOT NULL,
      ship_area      VARCHAR(100),
      ship_address   VARCHAR(255) NOT NULL,
      ship_postal    VARCHAR(20),
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (payment_verified_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_user_id      (user_id),
      INDEX idx_order_status (order_status),
      INDEX idx_payment_status (payment_status),
      INDEX idx_created_at   (created_at)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_id      INT UNSIGNED NOT NULL,
      product_id    INT UNSIGNED,
      variant_id    INT UNSIGNED,
      product_name  VARCHAR(255) NOT NULL,
      variant_label VARCHAR(80)  NOT NULL,
      image_url     VARCHAR(500),
      unit_price    DECIMAL(10,2) NOT NULL,
      quantity      INT UNSIGNED  NOT NULL,
      line_total    DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
      INDEX idx_order_id (order_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      product_id INT UNSIGNED NOT NULL,
      user_id    INT UNSIGNED NOT NULL,
      rating     TINYINT UNSIGNED NOT NULL,
      title      VARCHAR(150),
      body       TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      UNIQUE KEY uq_user_product (user_id, product_id),
      INDEX idx_product_id (product_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id    INT UNSIGNED NOT NULL,
      product_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE KEY uq_user_product (user_id, product_id)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      code            VARCHAR(50)  NOT NULL UNIQUE,
      discount_type   ENUM('percentage','fixed') NOT NULL,
      discount_value  DECIMAL(8,2) NOT NULL,
      min_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      usage_limit     INT UNSIGNED,
      usage_count     INT UNSIGNED NOT NULL DEFAULT 0,
      active          TINYINT(1)   NOT NULL DEFAULT 1,
      expires_at      DATETIME,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_code   (code),
      INDEX idx_active (active)
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS coupon_usages (
      id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      coupon_id INT UNSIGNED NOT NULL,
      user_id   INT UNSIGNED,
      order_id  INT UNSIGNED NOT NULL,
      used_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coupon_id) REFERENCES coupons(id),
      FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL,
      FOREIGN KEY (order_id)  REFERENCES orders(id)  ON DELETE CASCADE
    )
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\`       VARCHAR(100) PRIMARY KEY,
      value      TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  // Seed default settings (payment config + store) — never clobbers admin edits
  const settingDefaults = [
    ['instapay_name',        'NOOS Store'],
    ['instapay_identifier',  'noos@instapay'],
    ['vodafone_name',        'NOOS Store'],
    ['vodafone_identifier',  '01000000000'],
    ['payment_instructions', 'Transfer the exact order total to the account shown above, then upload a clear screenshot of the successful transfer. Your order will be confirmed once we verify the payment.'],
    ['store_name',           'NOOS'],
    ['free_shipping',        '500'],
    ['newsletter_code',      'NOOS10']
  ];
  for (const [k, v] of settingDefaults) {
    await conn.query('INSERT IGNORE INTO settings (`key`, value) VALUES (?, ?)', [k, v]);
  }

  console.log('Tables created');

  // ── Column migrations (idempotent) ──────────────────────────────
  // brand column for products
  try {
    await conn.query("ALTER TABLE products ADD COLUMN brand VARCHAR(100) DEFAULT NULL AFTER description");
    console.log('Added brand column to products');
  } catch(e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  // base_price column for products (markup system)
  try {
    await conn.query("ALTER TABLE products ADD COLUMN base_price DECIMAL(10,2) DEFAULT NULL AFTER old_price");
    console.log('Added base_price column to products');
  } catch(e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

  // Backfill base_price for existing products (reverse 5% markup)
  await conn.query("UPDATE products SET base_price = ROUND(price / 1.05, 2) WHERE base_price IS NULL");
  console.log('Backfilled base_price values');

  // Seed admin user
  const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', ['admin@noos.eg']);
  if (existing.length === 0) {
    const hash = await bcrypt.hash('password123', 12);
    await conn.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Admin', 'admin@noos.eg', hash, 'admin']
    );
    console.log('Admin seeded: admin@noos.eg / password123');
  }

  // Seed categories
  const cats = [
    ['T-Shirts', 't-shirts', 1],
    ['Oversized T-Shirts', 'oversized-t-shirts', 2],
    ['Shirts', 'shirts', 3],
    ['Polo Shirts', 'polo-shirts', 4],
    ['Jeans', 'jeans', 5],
    ['Trousers', 'trousers', 6],
    ['Chinos', 'chinos', 7],
    ['Jackets', 'jackets', 8],
    ['Hoodies', 'hoodies', 9],
    ['Sweatshirts', 'sweatshirts', 10],
    ['Knitwear', 'knitwear', 11],
    ['Shoes', 'shoes', 12],
    ['Accessories', 'accessories', 13]
  ];

  for (const [name, slug, sort_order] of cats) {
    await conn.query(
      'INSERT IGNORE INTO categories (name, slug, sort_order) VALUES (?, ?, ?)',
      [name, slug, sort_order]
    );
  }
  console.log('Categories seeded');

  // Seed sample products
  const [[tshirtCat]] = await conn.query('SELECT id FROM categories WHERE slug = ?', ['t-shirts']);
  const [[shirtCat]] = await conn.query('SELECT id FROM categories WHERE slug = ?', ['shirts']);
  const [[chinoCat]] = await conn.query('SELECT id FROM categories WHERE slug = ?', ['chinos']);

  const products = [
    {
      name: 'Boxy Oversized Tee',
      description: 'Premium heavyweight cotton tee with a relaxed boxy fit. Perfect for casual everyday wear.',
      category_id: tshirtCat.id,
      price: 349.00,
      old_price: null,
      sku: 'NOOS-TEE-001',
      badge: 'new',
      is_featured: 1
    },
    {
      name: 'Oxford Button-Down',
      description: 'Classic Oxford cloth button-down shirt. Versatile enough for smart casual or relaxed office days.',
      category_id: shirtCat.id,
      price: 599.00,
      old_price: null,
      sku: 'NOOS-SHT-001',
      badge: 'bestseller',
      is_featured: 1
    },
    {
      name: 'Slim Chino Trouser',
      description: 'Clean-cut slim chino with stretch fabric. Goes with everything from loafers to sneakers.',
      category_id: chinoCat.id,
      price: 449.00,
      old_price: 599.00,
      sku: 'NOOS-CHN-001',
      badge: 'sale',
      is_featured: 1
    }
  ];

  for (const p of products) {
    const [existing] = await conn.query('SELECT id FROM products WHERE sku = ?', [p.sku]);
    if (existing.length > 0) continue;

    const [result] = await conn.query(
      `INSERT INTO products (name, description, category_id, price, old_price, sku, badge, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.name, p.description, p.category_id, p.price, p.old_price, p.sku, p.badge, p.is_featured]
    );
    const productId = result.insertId;

    // Seed variants for tops
    const isTop = [tshirtCat.id, shirtCat.id].includes(p.category_id);
    const isBottom = p.category_id === chinoCat.id;
    const sizes = isTop ? ['XS', 'S', 'M', 'L', 'XL', 'XXL'] : isBottom ? ['28', '30', '32', '34', '36', '38'] : ['One Size'];
    const colours = p.category_id === tshirtCat.id
      ? [{ name: 'Black', hex: '#0D0D0D' }, { name: 'White', hex: '#FFFFFF' }, { name: 'Forest Green', hex: '#4A6741' }]
      : p.category_id === shirtCat.id
      ? [{ name: 'Off White', hex: '#F5F2EC' }, { name: 'Navy', hex: '#1B2A4A' }]
      : [{ name: 'Camel', hex: '#C4955A' }, { name: 'Olive', hex: '#6B7C45' }];

    for (const colour of colours) {
      for (const size of sizes) {
        const varSku = `${p.sku}-${size}-${colour.name.replace(/\s/g, '').toUpperCase()}`;
        const [vr] = await conn.query(
          `INSERT IGNORE INTO product_variants (product_id, size, colour, colour_hex, sku) VALUES (?, ?, ?, ?, ?)`,
          [productId, size, colour.name, colour.hex, varSku]
        );
        if (vr.insertId) {
          const stock = size === 'XS' ? 0 : Math.floor(Math.random() * 20) + 5;
          await conn.query(
            'INSERT IGNORE INTO inventory (variant_id, stock) VALUES (?, ?)',
            [vr.insertId, stock]
          );
        }
      }
    }
  }
  console.log('Sample products + variants + inventory seeded');

  // Seed sample coupon
  const [existCoupon] = await conn.query('SELECT id FROM coupons WHERE code = ?', ['NOOS10']);
  if (existCoupon.length === 0) {
    await conn.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_value, active)
       VALUES ('NOOS10', 'percentage', 10.00, 0.00, 1)`
    );
    console.log('Coupon NOOS10 seeded');
  }

  await conn.end();
  console.log('\nSeed complete. Run: npm run dev');
}

seed().catch(err => { console.error(err); process.exit(1); });
