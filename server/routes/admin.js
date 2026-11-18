import { Router } from 'express';
import { slugify, tx } from '../db.js';
import { requireRole } from '../lib/auth.js';
import { HttpError, badRequest, notFound } from '../lib/http.js';
import { loadOrder, ORDER_STATUS_LABEL, PRODUCT_SELECT, serializeProduct } from '../lib/serialize.js';
import { str, toInt, validateProduct } from '../lib/validate.js';

export const PAID_STATUSES = ['lunas', 'dikirim', 'selesai'];

// Transisi status pesanan yang diizinkan
const TRANSITIONS = {
  menunggu_pembayaran: ['lunas', 'dibatalkan'],
  menunggu_verifikasi: ['lunas', 'menunggu_pembayaran', 'dibatalkan'],
  lunas: ['dikirim', 'dibatalkan'],
  dikirim: ['selesai'],
  selesai: [],
  dibatalkan: [],
};

const PAYMENT_FOR_STATUS = {
  menunggu_pembayaran: 'pending',
  lunas: 'paid',
  dibatalkan: 'cancelled',
};

export function adminRoutes(db) {
  const r = Router();
  r.use(requireRole('admin'));

  const allowedSizes = () => [
    ...new Set(db.prepare('SELECT size FROM size_charts').all().map((s) => s.size)),
  ];

  const uniqueSlug = (name, excludeId = 0) => {
    const base = slugify(name);
    let slug = base;
    for (let i = 2; db.prepare('SELECT 1 FROM products WHERE slug = ? AND id != ?').get(slug, excludeId); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  };

  const checkCategory = (data) => {
    const cat = db.prepare('SELECT size_type FROM categories WHERE id = ?').get(data.categoryId);
    if (!cat) throw badRequest('Kategori tidak ditemukan.', { fields: { categoryId: 'Pilih kategori yang tersedia.' } });
    const valid = db.prepare('SELECT size FROM size_charts WHERE size_type = ?').all(cat.size_type).map((s) => s.size);
    if (data.sizes.some((s) => !valid.includes(s))) {
      throw badRequest('Ukuran tidak cocok dengan kategori.', {
        fields: { sizes: `Kategori ini memakai ukuran: ${valid.join(', ')}.` },
      });
    }
  };

  // ── Dashboard ────────────────────────────────────────────
  r.get('/stats', (_req, res) => {
    const paidIn = PAID_STATUSES.map(() => '?').join(',');
    const totals = db.prepare(`
      SELECT COUNT(*) AS totalOrders,
             SUM(CASE WHEN status IN ('menunggu_verifikasi') THEN 1 ELSE 0 END) AS awaitingVerification,
             SUM(CASE WHEN status IN ('menunggu_pembayaran') THEN 1 ELSE 0 END) AS awaitingPayment,
             COALESCE(SUM(CASE WHEN status IN (${paidIn}) THEN total ELSE 0 END), 0) AS confirmedRevenue
      FROM orders`).get(...PAID_STATUSES);
    const products = db.prepare(`
      SELECT COUNT(*) AS active, SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS outOfStock
      FROM products WHERE is_active = 1`).get();
    const lowStock = db.prepare(`
      SELECT id, name, stock FROM products WHERE is_active = 1 AND stock <= 5 ORDER BY stock ASC, name LIMIT 8`).all();
    res.json({
      totals: {
        totalOrders: totals.totalOrders,
        awaitingVerification: totals.awaitingVerification || 0,
        awaitingPayment: totals.awaitingPayment || 0,
        confirmedRevenue: totals.confirmedRevenue,
        activeProducts: products.active,
        outOfStock: products.outOfStock || 0,
      },
      lowStock,
    });
  });

  // ── Produk ───────────────────────────────────────────────
  r.get('/products', (req, res) => {
    const archived = req.query.status === 'archived';
    const q = str(req.query.q, 60);
    const params = [archived ? 0 : 1];
    let where = 'p.is_active = ?';
    if (q) {
      where += ' AND p.name LIKE ?';
      params.push(`%${q.replace(/[%_]/g, '')}%`);
    }
    const rows = db.prepare(`${PRODUCT_SELECT} WHERE ${where} ORDER BY p.id DESC`).all(...params);
    res.json({ products: rows.map(serializeProduct) });
  });

  r.get('/products/:id', (req, res) => {
    const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(toInt(req.params.id));
    if (!row) throw notFound('Produk tidak ditemukan.');
    res.json({ product: serializeProduct(row) });
  });

  // Fitur 1: Admin tambah produk → langsung tampil di katalog customer
  r.post('/products', (req, res) => {
    const { data, errors } = validateProduct(req.body, { allowedSizes: allowedSizes(), isCreate: true });
    if (Object.keys(errors).length) throw badRequest('Cek lagi form produknya.', { fields: errors });
    checkCategory(data);
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO products (name, slug, category_id, gender, price, compare_at_price, stock, sizes, colors, material,
                            description, image_url, is_featured, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      data.name, uniqueSlug(data.name), data.categoryId, data.gender, data.price, data.compareAtPrice, data.stock,
      JSON.stringify(data.sizes), JSON.stringify(data.colors), data.material, data.description,
      data.imageUrl || '/products/placeholder.svg', data.isFeatured ? 1 : 0, data.isActive ? 1 : 0,
    );
    const row = db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(lastInsertRowid);
    res.status(201).json({ product: serializeProduct(row) });
  });

  r.put('/products/:id', (req, res) => {
    const id = toInt(req.params.id);
    const existing = db.prepare('SELECT id, name, slug FROM products WHERE id = ?').get(id);
    if (!existing) throw notFound('Produk tidak ditemukan.');
    const { data, errors } = validateProduct(req.body, { allowedSizes: allowedSizes(), isCreate: false });
    if (Object.keys(errors).length) throw badRequest('Cek lagi form produknya.', { fields: errors });
    checkCategory(data);
    const slug = data.name === existing.name ? existing.slug : uniqueSlug(data.name, id);
    db.prepare(`
      UPDATE products SET name = ?, slug = ?, category_id = ?, gender = ?, price = ?, compare_at_price = ?, stock = ?,
        sizes = ?, colors = ?, material = ?, description = ?, image_url = ?, is_featured = ?, is_active = ?,
        updated_at = datetime('now')
      WHERE id = ?`).run(
      data.name, slug, data.categoryId, data.gender, data.price, data.compareAtPrice, data.stock,
      JSON.stringify(data.sizes), JSON.stringify(data.colors), data.material, data.description,
      data.imageUrl || '/products/placeholder.svg', data.isFeatured ? 1 : 0, data.isActive ? 1 : 0, id,
    );
    // Hapus ukuran yang sudah tidak tersedia dari keranjang customer
    const rows = db.prepare('SELECT id, size FROM cart_items WHERE product_id = ?').all(id);
    for (const ci of rows) if (!data.sizes.includes(ci.size)) db.prepare('DELETE FROM cart_items WHERE id = ?').run(ci.id);
    res.json({ product: serializeProduct(db.prepare(`${PRODUCT_SELECT} WHERE p.id = ?`).get(id)) });
  });

  // Produk diarsipkan (bukan dihapus permanen) agar riwayat pesanan tetap utuh
  r.delete('/products/:id', (req, res) => {
    const id = toInt(req.params.id);
    const info = db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    if (info.changes === 0) throw notFound('Produk tidak ditemukan.');
    db.prepare('DELETE FROM cart_items WHERE product_id = ?').run(id);
    res.json({ ok: true });
  });

  // ── Pesanan ──────────────────────────────────────────────
  r.get('/orders', (req, res) => {
    const status = str(req.query.status, 30);
    const q = str(req.query.q, 60);
    const where = [];
    const params = [];
    if (status && ORDER_STATUS_LABEL[status]) {
      where.push('o.status = ?');
      params.push(status);
    }
    if (q) {
      where.push('(o.code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ?)');
      const like = `%${q.replace(/[%_]/g, '')}%`;
      params.push(like, like, like);
    }
    const rows = db.prepare(`
      SELECT o.id, o.code, o.customer_name, o.phone, o.city, o.total, o.status, o.created_at,
             (SELECT GROUP_CONCAT(qty || '× ' || product_name || ' (' || size || ')', ', ')
                FROM order_items WHERE order_id = o.id) AS summary
      FROM orders o ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY CASE o.status WHEN 'menunggu_verifikasi' THEN 0 WHEN 'menunggu_pembayaran' THEN 1 WHEN 'lunas' THEN 2 ELSE 3 END,
               o.id DESC
      LIMIT 200`).all(...params);
    res.json({
      orders: rows.map((o) => ({
        id: o.id,
        code: o.code,
        customerName: o.customer_name,
        phone: o.phone,
        city: o.city,
        total: o.total,
        status: o.status,
        statusLabel: ORDER_STATUS_LABEL[o.status],
        summary: o.summary,
        createdAt: o.created_at,
        nextStatuses: TRANSITIONS[o.status],
      })),
    });
  });

  r.get('/orders/:id', (req, res) => {
    const found = loadOrder(db, 'id', toInt(req.params.id));
    if (!found) throw notFound('Pesanan tidak ditemukan.');
    res.json({ order: { ...found.json, nextStatuses: TRANSITIONS[found.row.status] } });
  });

  // Fitur 5: Konfirmasi Lunas / kirim / batalkan (stok dikembalikan saat dibatalkan)
  r.patch('/orders/:id/status', (req, res) => {
    const id = toInt(req.params.id);
    const next = str(req.body.status, 30);
    const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(id);
    if (!order) throw notFound('Pesanan tidak ditemukan.');
    if (!TRANSITIONS[order.status]?.includes(next)) {
      throw new HttpError(409, `Status "${ORDER_STATUS_LABEL[order.status]}" tidak bisa diubah ke "${ORDER_STATUS_LABEL[next] || next}".`);
    }
    tx(db, () => {
      db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(next, id);
      const pay = PAYMENT_FOR_STATUS[next];
      if (pay === 'paid') {
        db.prepare("UPDATE payments SET status = 'paid', verified_at = datetime('now') WHERE order_id = ?").run(id);
      } else if (pay) {
        db.prepare('UPDATE payments SET status = ? WHERE order_id = ?').run(pay, id);
      }
      if (next === 'dibatalkan') {
        const items = db.prepare('SELECT product_id, qty FROM order_items WHERE order_id = ? AND product_id IS NOT NULL').all(id);
        const inc = db.prepare("UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?");
        for (const it of items) inc.run(it.qty, it.product_id);
      }
    });
    const found = loadOrder(db, 'id', id);
    res.json({ order: { ...found.json, nextStatuses: TRANSITIONS[found.row.status] } });
  });

  return r;
}
