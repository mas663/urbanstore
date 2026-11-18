import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { tx } from '../db.js';
import { getCartId, requireRole } from '../lib/auth.js';
import { HttpError, badRequest, notFound, rateLimit } from '../lib/http.js';
import { randomToken } from '../lib/password.js';
import { loadOrder, ORDER_STATUS_LABEL } from '../lib/serialize.js';
import { normalizePhone, str, validateCheckout } from '../lib/validate.js';
import { readCart } from './cart.js';

function nextOrderCode(db) {
  const year = new Date().getFullYear();
  const prefix = `URB-${year}-`;
  const { maxSeq } = db
    .prepare('SELECT MAX(CAST(substr(code, ?) AS INTEGER)) AS maxSeq FROM orders WHERE code LIKE ?')
    .get(prefix.length + 1, `${prefix}%`);
  return `${prefix}${String((maxSeq || 0) + 1).padStart(3, '0')}`;
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Invoice hanya bisa dibuka oleh pemegang token, pemilik akun, atau admin. */
function canAccess(req, row, token) {
  if (req.user?.role === 'admin') return true;
  if (req.user && row.user_id === req.user.id) return true;
  return Boolean(token) && safeEqual(token, row.access_token);
}

export function orderRoutes(db) {
  const r = Router();

  r.get('/shipping-options', (_req, res) => {
    res.json({
      shipping: Object.entries(config.shipping).map(([id, s]) => ({ id, ...s })),
      bank: config.bank,
    });
  });

  /**
   * Checkout → Order Generation (Sesi 4, Fitur 3):
   * 1 validasi form · 2 generate nomor order unik · 3 simpan snapshot item & total
   * 4 status awal "Menunggu Pembayaran" · 5 kosongkan keranjang · 6 arahkan ke invoice
   */
  r.post('/orders', (req, res) => {
    const { data, errors } = validateCheckout(req.body);
    if (Object.keys(errors).length) throw badRequest('Cek lagi data pengirimannya ya.', { fields: errors });

    const cartId = getCartId(req, res);
    const result = tx(db, () => {
      const cart = readCart(db, cartId);
      if (cart.items.length === 0) throw badRequest('Keranjang kamu masih kosong.');
      if (cart.hasIssues) {
        throw new HttpError(409, 'Ada item di keranjang yang stoknya berubah. Cek keranjang dulu ya.', { cart });
      }

      // Kurangi stok (dicek ulang di dalam transaksi supaya tidak oversell)
      const qtyByProduct = {};
      for (const i of cart.items) qtyByProduct[i.productId] = (qtyByProduct[i.productId] || 0) + i.qty;
      const dec = db.prepare('UPDATE products SET stock = stock - ?, updated_at = datetime(\'now\') WHERE id = ? AND stock >= ?');
      for (const [pid, qty] of Object.entries(qtyByProduct)) {
        if (dec.run(qty, Number(pid), qty).changes !== 1) {
          throw new HttpError(409, 'Stok salah satu produk baru saja habis. Cek keranjang dulu ya.');
        }
      }

      const shipping = config.shipping[data.shippingMethod];
      const code = nextOrderCode(db);
      const token = randomToken(24);
      const total = cart.subtotal + shipping.cost;

      const { lastInsertRowid: orderId } = db.prepare(`
        INSERT INTO orders (code, access_token, user_id, customer_name, phone, email, address, city, postal_code,
                            notes, shipping_method, shipping_cost, subtotal, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        code, token, req.user?.role === 'customer' ? req.user.id : null, data.name, data.phone, data.email,
        data.address, data.city, data.postalCode, data.notes, data.shippingMethod, shipping.cost, cart.subtotal, total,
      );

      const insItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, image_url, size, price_at_purchase, qty)
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
      for (const i of cart.items) insItem.run(orderId, i.productId, i.name, i.imageUrl, i.size, i.price, i.qty);

      db.prepare("INSERT INTO payments (order_id, method, status, amount) VALUES (?, 'bank_transfer', 'pending', ?)")
        .run(orderId, total);
      db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cartId);
      return { code, token };
    });

    res.status(201).json(result);
  });

  r.get('/orders/:code', (req, res) => {
    const found = loadOrder(db, 'code', str(req.params.code, 20).toUpperCase());
    if (!found || !canAccess(req, found.row, str(req.query.t, 64))) throw notFound('Pesanan tidak ditemukan.');
    res.set('Cache-Control', 'no-store');
    res.json({ order: found.json, bank: config.bank });
  });

  // Customer klik "Saya Sudah Transfer" → menunggu verifikasi admin
  r.post('/orders/:code/confirm-transfer', (req, res) => {
    const found = loadOrder(db, 'code', str(req.params.code, 20).toUpperCase());
    if (!found || !canAccess(req, found.row, str(req.body.t, 64))) throw notFound('Pesanan tidak ditemukan.');
    if (found.row.status !== 'menunggu_pembayaran') {
      throw new HttpError(409, `Status pesanan sekarang "${ORDER_STATUS_LABEL[found.row.status]}".`);
    }
    tx(db, () => {
      db.prepare("UPDATE orders SET status = 'menunggu_verifikasi', updated_at = datetime('now') WHERE id = ?").run(found.row.id);
      db.prepare("UPDATE payments SET status = 'awaiting_verification', claimed_at = datetime('now') WHERE order_id = ?").run(found.row.id);
    });
    res.json({ order: loadOrder(db, 'id', found.row.id).json, bank: config.bank });
  });

  // Cek pesanan tanpa akun: nomor order + nomor WhatsApp
  r.post(
    '/orders/lookup',
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' }),
    (req, res) => {
      const code = str(req.body.code, 20).toUpperCase().replace(/^#/, '');
      const phone = normalizePhone(req.body.phone);
      const row = db.prepare('SELECT code, phone, access_token FROM orders WHERE code = ?').get(code);
      if (!row || row.phone !== phone) throw notFound('Pesanan tidak ditemukan. Cek lagi nomor order & WhatsApp-nya.');
      res.json({ code: row.code, token: row.access_token });
    },
  );

  r.get('/me/orders', requireRole('customer'), (req, res) => {
    const rows = db.prepare(`
      SELECT o.code, o.status, o.total, o.created_at, o.access_token,
             (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS itemCount
      FROM orders o WHERE o.user_id = ? ORDER BY o.id DESC`).all(req.user.id);
    res.json({
      orders: rows.map((o) => ({
        code: o.code,
        status: o.status,
        statusLabel: ORDER_STATUS_LABEL[o.status],
        total: o.total,
        itemCount: o.itemCount,
        createdAt: o.created_at,
        token: o.access_token,
      })),
    });
  });

  return r;
}
