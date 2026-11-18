import { Router } from 'express';
import { getCartId } from '../lib/auth.js';
import { HttpError, badRequest, notFound } from '../lib/http.js';
import { toInt, str } from '../lib/validate.js';

/** Ambil isi keranjang + hitung subtotal dari harga database (bukan dari browser). */
export function readCart(db, cartId) {
  if (!cartId) return { items: [], count: 0, subtotal: 0, hasIssues: false };
  const rows = db.prepare(`
    SELECT ci.id, ci.product_id, ci.size, ci.qty, p.name, p.slug, p.price, p.stock, p.image_url, p.is_active
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ? ORDER BY ci.id`).all(cartId);

  // Total qty per produk (beberapa ukuran berbagi stok yang sama)
  const qtyByProduct = {};
  for (const r of rows) qtyByProduct[r.product_id] = (qtyByProduct[r.product_id] || 0) + r.qty;

  const items = rows.map((r) => {
    let issue = null;
    if (!r.is_active) issue = 'Produk ini sudah tidak dijual.';
    else if (r.stock === 0) issue = 'Yah, stoknya habis.';
    else if (qtyByProduct[r.product_id] > r.stock) issue = `Stok cuma tersisa ${r.stock} pcs.`;
    return {
      id: r.id,
      productId: r.product_id,
      slug: r.slug,
      name: r.name,
      imageUrl: r.image_url,
      size: r.size,
      price: r.price,
      qty: r.qty,
      stock: r.stock,
      lineTotal: r.price * r.qty,
      issue,
    };
  });
  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
    hasIssues: items.some((i) => i.issue),
  };
}

export function cartRoutes(db) {
  const r = Router();

  const productQtyInCart = (cartId, productId, excludeItemId = 0) =>
    db.prepare('SELECT COALESCE(SUM(qty),0) AS n FROM cart_items WHERE cart_id = ? AND product_id = ? AND id != ?')
      .get(cartId, productId, excludeItemId).n;

  r.get('/', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(readCart(db, getCartId(req, res)));
  });

  // Add to cart — size picker wajib, qty minimal 1, tidak boleh melebihi stok
  r.post('/items', (req, res) => {
    const productId = toInt(req.body.productId);
    const size = str(req.body.size, 20);
    const qty = req.body.qty === undefined ? 1 : toInt(req.body.qty);
    if (!Number.isInteger(productId)) throw badRequest('Produk tidak valid.');
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw badRequest('Jumlah minimal 1 item.');

    const product = db.prepare('SELECT id, stock, sizes, is_active FROM products WHERE id = ?').get(productId);
    if (!product || !product.is_active) throw notFound('Produk tidak ditemukan.');
    if (!size) throw badRequest('Pilih ukuran dulu ya.');
    if (!JSON.parse(product.sizes).includes(size)) throw badRequest('Ukuran itu nggak tersedia untuk produk ini.');
    if (product.stock === 0) throw new HttpError(409, 'Yah, produk ini lagi habis.');

    const cartId = getCartId(req, res, { create: true });
    const inCart = productQtyInCart(cartId, productId);
    if (inCart + qty > product.stock) {
      throw new HttpError(409, `Stok cuma tersisa ${product.stock} pcs${inCart ? ` (kamu udah punya ${inCart} di keranjang)` : ''}.`);
    }
    db.prepare(`
      INSERT INTO cart_items (cart_id, product_id, size, qty) VALUES (?, ?, ?, ?)
      ON CONFLICT (cart_id, product_id, size) DO UPDATE SET qty = qty + excluded.qty`).run(cartId, productId, size, qty);
    res.status(201).json(readCart(db, cartId));
  });

  r.patch('/items/:id', (req, res) => {
    const cartId = getCartId(req, res);
    const qty = toInt(req.body.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw badRequest('Jumlah minimal 1 item.');
    const item = db.prepare(`
      SELECT ci.id, ci.product_id, p.stock FROM cart_items ci JOIN products p ON p.id = ci.product_id
      WHERE ci.id = ? AND ci.cart_id = ?`).get(toInt(req.params.id), cartId ?? '');
    if (!item) throw notFound('Item keranjang tidak ditemukan.');
    const others = productQtyInCart(cartId, item.product_id, item.id);
    if (others + qty > item.stock) throw new HttpError(409, `Stok cuma tersisa ${item.stock} pcs.`);
    db.prepare('UPDATE cart_items SET qty = ? WHERE id = ?').run(qty, item.id);
    res.json(readCart(db, cartId));
  });

  r.delete('/items/:id', (req, res) => {
    const cartId = getCartId(req, res);
    db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(toInt(req.params.id), cartId ?? '');
    res.json(readCart(db, cartId));
  });

  return r;
}
