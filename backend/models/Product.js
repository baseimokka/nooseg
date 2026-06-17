const pool = require('../config/db');

async function getAll({ category, badge, search, sort, minPrice, maxPrice, size, colour, adminAll, homeNew, homeBestseller } = {}) {
  // Params are bound positionally, so they must be collected in the same order
  // the placeholders appear in the SQL: JOIN clauses first, then WHERE clauses.
  const joinParams = [];
  const whereParams = [];

  let sizeJoin = '';
  if (size) {
    sizeJoin = 'JOIN product_variants pv_sz ON pv_sz.product_id = p.id AND pv_sz.size = ? AND pv_sz.active = 1 JOIN inventory inv_sz ON inv_sz.variant_id = pv_sz.id AND inv_sz.stock > 0';
    joinParams.push(size);
  }

  let colourJoin = '';
  if (colour) {
    colourJoin = 'JOIN product_variants pv_cl ON pv_cl.product_id = p.id AND pv_cl.colour = ? AND pv_cl.active = 1';
    joinParams.push(colour);
  }

  let where = adminAll ? [] : ['p.active = 1'];

  if (category) { where.push('c.slug = ?'); whereParams.push(category); }
  if (badge) { where.push('p.badge = ?'); whereParams.push(badge); }
  if (homeNew) { where.push('p.home_new = 1'); }
  if (homeBestseller) { where.push('p.home_bestseller = 1'); }
  if (minPrice) { where.push('p.price >= ?'); whereParams.push(Number(minPrice)); }
  if (maxPrice) { where.push('p.price <= ?'); whereParams.push(Number(maxPrice)); }
  if (search) {
    where.push('MATCH(p.name, p.description, p.sku) AGAINST(? IN BOOLEAN MODE)');
    whereParams.push(`${search}*`);
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const params = [...joinParams, ...whereParams];

  let orderBy = 'p.created_at DESC';
  if (sort === 'price_asc') orderBy = 'p.price ASC';
  else if (sort === 'price_desc') orderBy = 'p.price DESC';
  else if (sort === 'bestseller') orderBy = 'p.review_count DESC';
  else if (sort === 'rating') orderBy = 'p.rating DESC';

  const sql = `
    SELECT p.id, p.name, p.brand, p.price, p.base_price, p.old_price, p.badge, p.rating, p.review_count, p.is_featured,
           p.home_new, p.home_bestseller, p.sku, p.active, p.created_at,
           c.name AS category_name, c.slug AS category_slug,
           (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) AS image_url,
           (SELECT JSON_ARRAYAGG(JSON_OBJECT('colour', pv2.colour, 'hex', pv2.colour_hex))
            FROM (SELECT DISTINCT colour, colour_hex FROM product_variants WHERE product_id = p.id AND active = 1) pv2
           ) AS colours
    FROM products p
    JOIN categories c ON c.id = p.category_id
    ${sizeJoin}
    ${colourJoin}
    ${whereSQL}
    GROUP BY p.id
    ORDER BY ${orderBy}
  `;

  const [rows] = await pool.execute(sql, params);
  return rows.map(r => ({
    ...r,
    colours: r.colours
      ? (typeof r.colours === 'string' ? JSON.parse(r.colours) : r.colours)
      : []
  }));
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );
  if (!rows[0]) return null;

  const product = rows[0];

  const [images] = await pool.execute(
    'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
    [id]
  );
  product.images = images;

  const [variants] = await pool.execute(
    `SELECT pv.*, i.stock, i.low_stock_threshold
     FROM product_variants pv
     LEFT JOIN inventory i ON i.variant_id = pv.id
     WHERE pv.product_id = ? AND pv.active = 1
     ORDER BY pv.size, pv.colour`,
    [id]
  );
  product.variants = variants;

  const [related] = await pool.execute(
    `SELECT p.id, p.name, p.price, p.old_price, p.badge,
            c.name AS category_name,
            (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image_url
     FROM products p JOIN categories c ON c.id = p.category_id
     WHERE p.category_id = ? AND p.id != ? AND p.active = 1 LIMIT 4`,
    [product.category_id, id]
  );
  product.related = related;

  return product;
}

async function create({ name, description, brand, categoryId, price, basePrice, oldPrice, sku, badge, isFeature, active, homeNew, homeBestseller }) {
  const [result] = await pool.execute(
    `INSERT INTO products (name, description, brand, category_id, price, base_price, old_price, sku, badge, is_featured, active, home_new, home_bestseller)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, description || null, brand || null, categoryId, price, basePrice || null, oldPrice || null, sku || null, badge || null, isFeature ? 1 : 0, active !== false ? 1 : 0, homeNew ? 1 : 0, homeBestseller ? 1 : 0]
  );
  return result.insertId;
}

async function update(id, { name, description, brand, categoryId, price, basePrice, oldPrice, sku, badge, isFeature, active, homeNew, homeBestseller }) {
  await pool.execute(
    `UPDATE products SET name=?, description=?, brand=?, category_id=?, price=?, base_price=?, old_price=?, sku=?, badge=?, is_featured=?, active=?, home_new=?, home_bestseller=? WHERE id=?`,
    [name, description || null, brand || null, categoryId, price, basePrice || null, oldPrice || null, sku || null, badge || null, isFeature ? 1 : 0, active ? 1 : 0, homeNew ? 1 : 0, homeBestseller ? 1 : 0, id]
  );
}

async function softDelete(id) {
  await pool.execute('UPDATE products SET active = 0 WHERE id = ?', [id]);
}

async function setSku(id, sku) {
  await pool.execute('UPDATE products SET sku = ? WHERE id = ?', [sku, id]);
}

async function setHomeFlags(id, { homeNew, homeBestseller }) {
  await pool.execute(
    'UPDATE products SET home_new = ?, home_bestseller = ? WHERE id = ?',
    [homeNew ? 1 : 0, homeBestseller ? 1 : 0, id]
  );
}

async function addImage(productId, url, sortOrder = 0, variantId = null, colour = null) {
  await pool.execute(
    'INSERT INTO product_images (product_id, variant_id, colour, url, sort_order) VALUES (?, ?, ?, ?, ?)',
    [productId, variantId, colour || null, url, sortOrder]
  );
}

async function recalcRating(productId) {
  await pool.execute(
    `UPDATE products p SET
       p.rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = ?), 0),
       p.review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?)
     WHERE p.id = ?`,
    [productId, productId, productId]
  );
}

module.exports = { getAll, findById, create, update, softDelete, setSku, setHomeFlags, addImage, recalcRating };
