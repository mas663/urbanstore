import { Router } from 'express';
import { notFound } from '../lib/http.js';
import { PRODUCT_SELECT, serializeProduct } from '../lib/serialize.js';
import { str } from '../lib/validate.js';

export function loadSizeCharts(db) {
  const charts = {};
  for (const row of db.prepare('SELECT * FROM size_charts ORDER BY size_type, sort').all()) {
    (charts[row.size_type] ||= []).push({ size: row.size, ...JSON.parse(row.data) });
  }
  return charts;
}

export function catalogRoutes(db) {
  const r = Router();

  r.get('/categories', (_req, res) => {
    const rows = db.prepare(`
      SELECT c.id, c.name, c.slug, c.size_type AS sizeType,
             (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS productCount
      FROM categories c ORDER BY c.id`).all();
    res.json({ categories: rows });
  });

  r.get('/size-charts', (_req, res) => res.json({ sizeCharts: loadSizeCharts(db) }));

  // FR-02: katalog dengan search, filter gender & kategori, sorting harga
  r.get('/products', (req, res) => {
    const where = ['p.is_active = 1'];
    const params = [];

    const q = str(req.query.q, 60);
    if (q) {
      where.push('(p.name LIKE ? OR c.name LIKE ? OR p.colors LIKE ?)');
      const like = `%${q.replace(/[%_]/g, '')}%`;
      params.push(like, like, like);
    }
    const gender = str(req.query.gender, 10);
    if (gender === 'pria' || gender === 'wanita') {
      where.push("p.gender IN (?, 'unisex')");
      params.push(gender);
    }
    const category = str(req.query.category, 40);
    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }
    if (req.query.featured === '1') where.push('p.is_featured = 1');
    if (req.query.inStock === '1') where.push('p.stock > 0');

    const sorts = {
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      newest: 'p.created_at DESC, p.id DESC',
    };
    const order = sorts[req.query.sort] || '(p.stock > 0) DESC, p.is_featured DESC, p.id ASC';
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 60, 100);

    const rows = db.prepare(`${PRODUCT_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit}`).all(...params);
    res.set('Cache-Control', 'no-store');
    res.json({ products: rows.map(serializeProduct) });
  });

  // FR-03: detail produk + size chart + produk terkait
  r.get('/products/:slug', (req, res) => {
    const row = db.prepare(`${PRODUCT_SELECT} WHERE p.slug = ? AND p.is_active = 1`).get(String(req.params.slug));
    if (!row) throw notFound('Produk tidak ditemukan atau sudah tidak dijual.');
    const product = serializeProduct(row);
    const sizeChart = loadSizeCharts(db)[product.category.sizeType] || [];
    const related = db
      .prepare(`${PRODUCT_SELECT} WHERE p.is_active = 1 AND p.id != ? AND (p.category_id = ? OR p.gender = ?)
                ORDER BY (p.category_id = ?) DESC, (p.stock > 0) DESC, p.id LIMIT 4`)
      .all(row.id, row.category_id, row.gender, row.category_id)
      .map(serializeProduct);
    res.json({ product, sizeChart, related });
  });

  return r;
}
