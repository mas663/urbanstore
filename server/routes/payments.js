import crypto from 'node:crypto';
import { Router } from 'express';
import { asyncHandler, badRequest, HttpError, notFound } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';
import { buildInvoicePayload } from '../payments/mayar.js';

const CODE_RE = /^URB-\d{4}-\d{3,}$/;           // format nomor pesanan, mis. URB-2026-007
const ID_RE = /^[A-Za-z0-9-]{6,100}$/;         // format id dari Mayar (uuid) — tolak isi aneh dari webhook
const PAID_STATUSES = ['lunas', 'dikirim', 'selesai'];

const orderCode = (body) => {
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!CODE_RE.test(code)) throw badRequest('Nomor pesanan tidak valid.');
  return code;
};

/** Bandingkan rahasia tanpa bocor lewat perbedaan waktu (timing attack). */
function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Endpoint Payment Gateway Mayar.id (Sesi 6):
 *   GET  /api/payments/config        → apakah Mayar aktif (UI menyembunyikan tombol kalau belum)
 *   POST /api/payments/mayar/create  → buat / pakai ulang link bayar untuk pesanan customer
 *   POST /api/payments/mayar/sync    → cek status ke Mayar (saat customer kembali dari halaman bayar)
 *   POST /api/webhook/mayar          → notifikasi dari server Mayar setelah customer membayar
 */
export function paymentRoutes(data, mayar, { webhookSecret = '' } = {}) {
  const r = Router();
  const customer = requireUser(data, 'customer', 'Pembayaran hanya untuk akun customer.');

  r.get('/payments/config', (_req, res) => res.json({ mayar: mayar.enabled }));

  /* ── 1. Buat link pembayaran ─────────────────────────────── */
  r.post('/payments/mayar/create', customer, asyncHandler(async (req, res) => {
    const code = orderCode(req.body);
    if (!mayar.enabled) throw new HttpError(503, 'Pembayaran otomatis belum aktif. Pakai transfer manual dulu ya.');

    await data.payments.expireOverdue(req.user);
    const order = await data.payments.getOwnOrder(req.user, code);
    if (!order) throw notFound('Pesanan tidak ditemukan.');
    if (order.status !== 'menunggu_pembayaran') {
      throw new HttpError(409, order.status === 'kedaluwarsa'
        ? 'Pesanan ini sudah kedaluwarsa (lewat 1 jam). Silakan checkout ulang ya.'
        : 'Pesanan ini sedang tidak menunggu pembayaran.');
    }

    // Link lama masih berlaku → pakai lagi (hindari invoice ganda & aturan "duplicate request" Mayar)
    const pay = order.payment;
    if (pay?.mayar_link && pay.mayar_expired_at && new Date(pay.mayar_expired_at).getTime() > Date.now() + 60_000) {
      return res.json({ link: pay.mayar_link, reused: true });
    }

    const invoice = await mayar.createInvoice(buildInvoicePayload(order));
    if (!invoice?.id || !invoice?.link) throw new HttpError(502, 'Mayar tidak mengirim link pembayaran. Coba lagi ya.');

    await data.payments.attach(order.id, {
      invoiceId: invoice.id,
      transactionId: invoice.transactionId || null,
      link: invoice.link,
      expiredAt: new Date(invoice.expiredAt ? Number(invoice.expiredAt) : order.payment_deadline).toISOString(),
    });
    res.json({ link: invoice.link, reused: false });
  }));

  /* ── 2. Cek status langsung ke Mayar ─────────────────────────
     Berguna kalau webhook terlambat/tidak sampai (mis. saat development di localhost,
     server Mayar tidak bisa menjangkau komputer kita). */
  r.post('/payments/mayar/sync', customer, asyncHandler(async (req, res) => {
    const code = orderCode(req.body);
    const order = await data.payments.getOwnOrder(req.user, code);
    if (!order) throw notFound('Pesanan tidak ditemukan.');
    const invoiceId = order.payment?.mayar_invoice_id;
    if (!invoiceId || PAID_STATUSES.includes(order.status)) {
      return res.json({ status: order.status, result: null });
    }
    const invoice = await mayar.getInvoice(invoiceId);
    const result = invoice?.status === 'paid' ? await data.payments.markPaid(invoiceId, Number(invoice.amount)) : null;
    res.json({ status: order.status, mayarStatus: invoice?.status || null, result });
  }));

  /* ── 3. Webhook dari Mayar ───────────────────────────────────
     PRINSIP: jangan percaya isi webhook begitu saja (Mayar belum punya signature).
     Webhook hanya jadi "pemicu" → server menanyakan status invoice ke API Mayar memakai API key kita.
     Orang iseng yang mengirim webhook palsu tidak bisa membuat pesanan jadi lunas. */
  r.post('/webhook/mayar', asyncHandler(async (req, res) => {
    if (webhookSecret && !safeEqual(req.query.token || '', webhookSecret)) {
      throw new HttpError(401, 'Unauthorized');
    }
    const event = req.body?.event;
    const d = req.body?.data || {};
    if (event !== 'payment.received') {
      return res.json({ ok: true, ignored: typeof event === 'string' ? event : 'unknown' }); // event lain (reminder, tes) cukup dibalas OK
    }

    const ids = [d.id, d.transactionId, d.invoiceId, d.productId, d.paymentLinkId]
      .filter((v) => typeof v === 'string' && ID_RE.test(v));
    const invoiceIds = ids.length ? await data.payments.findInvoiceIds([...new Set(ids)]) : [];

    const results = [];
    for (const invoiceId of invoiceIds) {
      const invoice = await mayar.getInvoice(invoiceId); // ← verifikasi ulang
      results.push(invoice?.status === 'paid'
        ? await data.payments.markPaid(invoiceId, Number(invoice.amount))
        : `unverified:${invoice?.status || 'unknown'}`);
    }
    if (invoiceIds.length) console.log('[mayar webhook]', event, results.join(', '));
    res.json({ ok: true, matched: invoiceIds.length, results });
  }));

  return r;
}
