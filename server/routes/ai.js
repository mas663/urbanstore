import { Router } from 'express';
import { config } from '../config.js';
import { tx } from '../db.js';
import { requireRole } from '../lib/auth.js';
import { asyncHandler, badRequest, HttpError } from '../lib/http.js';
import { str, toInt } from '../lib/validate.js';
import { AiError, aiStatus, assertConfigured, callAi, cleanText } from '../ai/provider.js';
import {
  analyzeSystemPrompt, chatSystemPrompt, compactCatalog, compactSizeCharts, describeSystemPrompt, describeUserPrompt,
} from '../ai/prompts.js';
import { loadSizeCharts } from './catalog.js';
import { PAID_STATUSES } from './admin.js';

/* ── Kuota chat: maks N pesan per customer per jendela 12 jam (dihitung di backend) ── */

export function getQuota(db, userId, now = Date.now()) {
  const { limit, windowMs } = config.chatQuota;
  const row = db.prepare('SELECT window_start, used FROM chat_quota WHERE user_id = ?').get(userId);
  if (!row || now - row.window_start >= windowMs) return { limit, used: 0, remaining: limit, resetAt: null };
  return { limit, used: row.used, remaining: Math.max(limit - row.used, 0), resetAt: row.window_start + windowMs };
}

export function consumeQuota(db, userId, now = Date.now()) {
  const { limit, windowMs } = config.chatQuota;
  return tx(db, () => {
    const row = db.prepare('SELECT window_start, used FROM chat_quota WHERE user_id = ?').get(userId);
    if (!row || now - row.window_start >= windowMs) {
      db.prepare(`INSERT INTO chat_quota (user_id, window_start, used) VALUES (?, ?, 1)
                  ON CONFLICT (user_id) DO UPDATE SET window_start = excluded.window_start, used = 1`).run(userId, now);
      return { ok: true, ...getQuota(db, userId, now) };
    }
    if (row.used >= limit) return { ok: false, ...getQuota(db, userId, now) };
    db.prepare('UPDATE chat_quota SET used = used + 1 WHERE user_id = ?').run(userId);
    return { ok: true, ...getQuota(db, userId, now) };
  });
}

/** Kembalikan kuota jika AI gagal menjawab (supaya tombol Retry tidak menghabiskan kuota). */
export function refundQuota(db, userId) {
  db.prepare('UPDATE chat_quota SET used = MAX(used - 1, 0) WHERE user_id = ?').run(userId);
}

/* ── Agregasi metrik penjualan (dihitung di backend, bukan dikirim mentah ke AI) ── */

export function buildSalesMetrics(db) {
  const paid = PAID_STATUSES.map(() => '?').join(',');
  const one = (sql, ...p) => db.prepare(sql).get(...p);
  const all = (sql, ...p) => db.prepare(sql).all(...p);

  const byStatus = Object.fromEntries(all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').map((r) => [r.status, r.n]));
  const totals = one(`
    SELECT COUNT(*) AS orders,
      COALESCE(SUM(CASE WHEN status IN (${paid}) THEN total END), 0) AS confirmedRevenue,
      COALESCE(SUM(CASE WHEN status IN (${paid}) THEN 1 END), 0) AS confirmedOrders,
      COALESCE(SUM(CASE WHEN status IN ('menunggu_pembayaran','menunggu_verifikasi') THEN total END), 0) AS pendingRevenue
    FROM orders WHERE status != 'dibatalkan'`, ...PAID_STATUSES, ...PAID_STATUSES); // placeholder dipakai 2×
  const last30 = one(`
    SELECT COUNT(*) AS orders, COALESCE(SUM(CASE WHEN status IN (${paid}) THEN total END), 0) AS confirmedRevenue
    FROM orders WHERE status != 'dibatalkan' AND created_at >= datetime('now', '-30 days')`, ...PAID_STATUSES);

  const itemsBase = `FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status != 'dibatalkan'`;
  const topProducts = all(`
    SELECT oi.product_name AS name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price_at_purchase) AS revenue
    ${itemsBase} GROUP BY oi.product_name ORDER BY qty DESC, revenue DESC LIMIT 5`);
  const byCategory = all(`
    SELECT COALESCE(c.name, 'Lainnya') AS category, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price_at_purchase) AS revenue
    FROM order_items oi JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id LEFT JOIN categories c ON c.id = p.category_id
    WHERE o.status != 'dibatalkan' GROUP BY category ORDER BY revenue DESC`);
  const bySize = all(`SELECT oi.size, SUM(oi.qty) AS qty ${itemsBase} GROUP BY oi.size ORDER BY qty DESC`);
  const byShipping = all(`SELECT shipping_method AS method, COUNT(*) AS orders FROM orders WHERE status != 'dibatalkan' GROUP BY shipping_method`);
  const lowStock = all(`SELECT name, stock FROM products WHERE is_active = 1 AND stock <= 5 ORDER BY stock, name LIMIT 8`);
  const noSales = all(`
    SELECT p.name, p.stock FROM products p
    WHERE p.is_active = 1 AND NOT EXISTS (
      SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = p.id AND o.status != 'dibatalkan')
    ORDER BY p.stock DESC LIMIT 8`);
  const catalog = one('SELECT COUNT(*) AS activeProducts, ROUND(AVG(price)) AS avgPrice FROM products WHERE is_active = 1');

  return {
    orders: {
      total: totals.orders,
      confirmed: totals.confirmedOrders,
      cancelled: byStatus.dibatalkan || 0,
      byStatus,
    },
    revenue: {
      confirmed: totals.confirmedRevenue,
      pending: totals.pendingRevenue,
      avgOrderValue: totals.confirmedOrders ? Math.round(totals.confirmedRevenue / totals.confirmedOrders) : 0,
    },
    last30Days: last30,
    topProducts,
    byCategory,
    bySize,
    byShipping,
    lowStock,
    noSales,
    catalog,
  };
}

/* ── Streaming NDJSON ke browser ── */

function startStream(res) {
  res.status(200).set({
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  return (obj) => res.write(JSON.stringify(obj) + '\n');
}

export function aiRoutes(db) {
  const r = Router();

  // ?scope=customer | admin — dipakai UI untuk menampilkan status AI per sisi aplikasi
  r.get('/ai/status', (req, res) => res.json(aiStatus(req.query.scope === 'admin' ? 'admin' : 'customer')));

  /* ── 1. AI Shopping Assistant — khusus customer yang login ── */
  r.get('/chat/quota', requireRole('customer'), (req, res) => {
    res.json({ quota: getQuota(db, req.user.id), ai: aiStatus('customer') });
  });

  r.post('/chat', requireRole('customer'), asyncHandler(async (req, res) => {
    const message = str(req.body.message, 500);
    if (!message) throw badRequest('Tulis pertanyaan kamu dulu ya.');
    assertConfigured('customer');

    // Riwayat percakapan sesi ini (maks. 8 pesan terakhir, dipotong supaya hemat token)
    const history = (Array.isArray(req.body.history) ? req.body.history : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));

    const quota = consumeQuota(db, req.user.id);
    if (!quota.ok) {
      throw new HttpError(429, 'Kuota chat kamu sudah habis untuk 12 jam ini. Coba lagi nanti ya.', { quota: strip(quota) });
    }

    const products = db.prepare(`
      SELECT p.*, c.name AS category_name, c.size_type FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1 ORDER BY p.id`).all();
    const system = chatSystemPrompt({
      catalog: compactCatalog(products),
      sizeCharts: compactSizeCharts(loadSizeCharts(db)),
      customerName: req.user.name.split(' ')[0],
    });

    const ctrl = new AbortController();
    res.on('close', () => { if (!res.writableEnded) ctrl.abort(); });
    const send = startStream(res);
    try {
      await callAi({
        scope: 'customer', // key "urbanstore-customer"
        system,
        messages: [...history, { role: 'user', content: message }],
        temperature: 0.6,
        maxTokens: 700,
        signal: ctrl.signal,
        onDelta: (text) => send({ type: 'delta', text }),
      });
      send({ type: 'done', quota: strip(getQuota(db, req.user.id)) });
    } catch (err) {
      refundQuota(db, req.user.id);
      if (err.status !== 499) {
        if (!(err instanceof AiError)) console.error('[chat]', err);
        send({
          type: 'error',
          status: err.status || 500,
          error: err instanceof AiError ? err.message : 'Ada masalah di server. Coba lagi ya.',
          quota: strip(getQuota(db, req.user.id)),
        });
      }
    }
    res.end();
  }));

  /* ── 2. AI Generate Deskripsi Produk — admin ── */
  r.post('/admin/describe', requireRole('admin'), asyncHandler(async (req, res) => {
    const b = req.body || {};
    const product = {
      name: str(b.name, 120),
      category: str(b.category, 40),
      gender: { pria: 'Pria', wanita: 'Wanita', unisex: 'Unisex (pria & wanita)' }[str(b.gender, 10)] || '',
      price: toInt(b.price) > 0 ? toInt(b.price) : null,
      colors: str(b.colors, 120),
      sizes: (Array.isArray(b.sizes) ? b.sizes : []).map((s) => str(s, 10)).filter(Boolean).slice(0, 10),
      material: str(b.material, 150),
      details: str(b.details, 400),
    };
    const missing = [];
    if (product.name.length < 3) missing.push('nama produk');
    if (!product.category) missing.push('kategori');
    if (!product.material) missing.push('bahan');
    if (missing.length) throw badRequest(`Lengkapi dulu ${missing.join(', ')} supaya AI tidak mengarang.`);

    const raw = await callAi({
      scope: 'admin', // key "urbanstore-admin"
      system: describeSystemPrompt(),
      messages: [{ role: 'user', content: describeUserPrompt(product) }],
      temperature: 0.8,
      maxTokens: 600,
    });
    const description = cleanText(raw).replace(/^["“]|["”]$/g, '').slice(0, 3000);
    res.json({ description });
  }));

  /* ── 3. AI Analisis Penjualan — admin ── */
  r.get('/admin/analytics', requireRole('admin'), (_req, res) => {
    res.json({ metrics: buildSalesMetrics(db), ai: aiStatus('admin') });
  });

  r.post('/admin/analyze', requireRole('admin'), asyncHandler(async (req, res) => {
    const metrics = buildSalesMetrics(db);
    if (metrics.orders.total === 0) {
      throw badRequest('Belum ada data transaksi untuk dianalisis. Analisis bisa dibuat setelah ada pesanan masuk.');
    }
    assertConfigured('admin');
    const ctrl = new AbortController();
    res.on('close', () => { if (!res.writableEnded) ctrl.abort(); });
    const send = startStream(res);
    try {
      await callAi({
        scope: 'admin', // key "urbanstore-admin"
        system: analyzeSystemPrompt(),
        messages: [{ role: 'user', content: `METRIK TOKO (mata uang Rupiah):\n${JSON.stringify(metrics)}` }],
        temperature: 0.5,
        maxTokens: 1400,
        signal: ctrl.signal,
        onDelta: (text) => send({ type: 'delta', text }),
      });
      send({ type: 'done', generatedAt: new Date().toISOString() });
    } catch (err) {
      if (err.status !== 499) {
        send({ type: 'error', status: err.status || 500, error: err instanceof AiError ? err.message : 'Ada masalah di server.' });
      }
    }
    res.end();
  }));

  return r;
}

const strip = ({ limit, used, remaining, resetAt }) => ({ limit, used, remaining, resetAt });
