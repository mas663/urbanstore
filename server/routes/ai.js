import { Router } from 'express';
import { asyncHandler, badRequest, HttpError } from '../lib/http.js';
import { AiError, aiStatus, assertConfigured, callAi, cleanText } from '../ai/provider.js';
import {
  analyzeSystemPrompt, chatSystemPrompt, compactCatalog, compactSizeCharts, describeSystemPrompt, describeUserPrompt,
} from '../ai/prompts.js';

const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

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

const quotaView = (q) => ({ limit: q.limit, used: q.used, remaining: q.remaining, resetAt: q.resetAt ? new Date(q.resetAt).getTime() : null });

/**
 * Endpoint AI (Sesi 5). `data` = lapisan data Supabase (lihat server/data.js).
 *   POST /api/chat             → AI Shopping Assistant (customer, kuota 5 pesan / 12 jam)
 *   POST /api/admin/describe   → AI Generate Deskripsi Produk (admin)
 *   POST /api/admin/analyze    → AI Analisis Penjualan (admin, streaming)
 */
export function aiRoutes(data) {
  const r = Router();

  const auth = (role) => asyncHandler(async (req, _res, next) => {
    req.user = await data.authenticate(req);
    if (role && req.user.role !== role) {
      throw new HttpError(403, role === 'admin' ? 'Khusus Store Admin.' : 'AI Shopping Assistant khusus akun customer.');
    }
    next();
  });

  // ?scope=customer | admin — dipakai UI untuk menampilkan status AI per sisi aplikasi
  r.get('/ai/status', (req, res) => res.json(aiStatus(req.query.scope === 'admin' ? 'admin' : 'customer')));

  /* ── 1. AI Shopping Assistant ── */
  r.get('/chat/quota', auth('customer'), asyncHandler(async (req, res) => {
    res.json({ quota: quotaView(await data.quota.get(req.user.id)), ai: aiStatus('customer') });
  }));

  r.post('/chat', auth('customer'), asyncHandler(async (req, res) => {
    const message = str(req.body.message, 500);
    if (!message) throw badRequest('Tulis pertanyaan kamu dulu ya.');
    assertConfigured('customer');

    // Riwayat percakapan sesi ini (maks. 8 pesan terakhir, dipotong supaya hemat token).
    // Role selain user/assistant dibuang → mencegah prompt injection lewat "system".
    const history = (Array.isArray(req.body.history) ? req.body.history : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));

    const quota = await data.quota.consume(req.user.id);
    if (!quota.ok) {
      throw new HttpError(429, 'Kuota chat kamu sudah habis untuk 12 jam ini. Coba lagi nanti ya.', { quota: quotaView(quota) });
    }

    let system;
    try {
      const [catalog, charts] = await Promise.all([data.getCatalog(req.user), data.getSizeCharts(req.user)]);
      system = chatSystemPrompt({
        catalog: compactCatalog(catalog),
        sizeCharts: compactSizeCharts(charts),
        customerName: req.user.name.split(' ')[0],
      });
    } catch (err) {
      await data.quota.refund(req.user.id);
      throw err;
    }

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
      send({ type: 'done', quota: quotaView(await data.quota.get(req.user.id)) });
    } catch (err) {
      await data.quota.refund(req.user.id).catch(() => {});
      if (err.status !== 499) {
        if (!(err instanceof AiError)) console.error('[chat]', err);
        send({
          type: 'error',
          status: err.status || 500,
          error: err instanceof AiError ? err.message : 'Ada masalah di server. Coba lagi ya.',
          quota: quotaView(await data.quota.get(req.user.id).catch(() => quota)),
        });
      }
    }
    res.end();
  }));

  /* ── 2. AI Generate Deskripsi Produk ── */
  r.post('/admin/describe', auth('admin'), asyncHandler(async (req, res) => {
    const b = req.body || {};
    const price = Number.parseInt(b.price, 10);
    const product = {
      name: str(b.name, 120),
      category: str(b.category, 40),
      gender: { pria: 'Pria', wanita: 'Wanita', unisex: 'Unisex (pria & wanita)' }[str(b.gender, 10)] || '',
      price: price > 0 ? price : null,
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
    res.json({ description: cleanText(raw).replace(/^["“]|["”]$/g, '').slice(0, 3000) });
  }));

  /* ── 3. AI Analisis Penjualan ── */
  r.post('/admin/analyze', auth('admin'), asyncHandler(async (req, res) => {
    const metrics = await data.getMetrics(req.user);
    if (metrics.orders.total + metrics.orders.cancelled === 0) {
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
