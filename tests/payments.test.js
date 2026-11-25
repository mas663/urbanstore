import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { HttpError } from '../server/lib/http.js';
import { buildInvoicePayload, createMayarClient } from '../server/payments/mayar.js';

/* Tes endpoint pembayaran Mayar dengan lapisan data & klien Mayar PALSU (tanpa internet / Supabase). */

const USERS = {
  'rian-token': { id: 'u-rian', role: 'customer' },
  'maya-token': { id: 'u-maya', role: 'customer' },
  'admin-token': { id: 'u-admin', role: 'admin' },
};

let orders, invoices, marked, mayarCalls;

const newOrder = (over = {}) => ({
  id: 1, code: 'URB-2026-001', owner: 'u-rian', status: 'menunggu_pembayaran',
  customer_name: 'Rian Pratama', email: 'rian@test.id', phone: '081234567890',
  shipping_method: 'regular', shipping_cost: 15000, total: 189000 * 2 + 15000,
  payment_deadline: new Date(Date.now() + 3600e3).toISOString(),
  items: [{ product_name: 'Urban Oversized Heavy Tee', color: 'Hitam', size: 'L', price: 189000, qty: 2 }],
  payment: { status: 'pending', mayar_invoice_id: null, mayar_link: null, mayar_expired_at: null },
  ...over,
});

const fakeData = {
  async authenticate(req) {
    const token = /^Bearer\s+(.+)$/.exec(req.headers.authorization || '')?.[1];
    if (!USERS[token]) throw new HttpError(401, 'Kamu perlu login dulu.');
    return USERS[token];
  },
  payments: {
    // Meniru RLS: hanya pesanan milik user yang login
    async getOwnOrder(user, code) { return orders.find((o) => o.code === code && o.owner === user.id) || null; },
    async expireOverdue() {},
    async attach(orderId, inv) {
      const o = orders.find((x) => x.id === orderId);
      o.payment = { ...o.payment, mayar_invoice_id: inv.invoiceId, mayar_transaction_id: inv.transactionId, mayar_link: inv.link, mayar_expired_at: inv.expiredAt };
    },
    async markPaid(invoiceId, amount) {
      marked.push({ invoiceId, amount });
      const o = orders.find((x) => x.payment.mayar_invoice_id === invoiceId);
      if (amount !== o.total) return 'amount_mismatch';
      o.status = 'lunas';
      return 'paid';
    },
    async findInvoiceIds(ids) {
      return orders.filter((o) => ids.includes(o.payment.mayar_invoice_id) || ids.includes(o.payment.mayar_transaction_id))
        .map((o) => o.payment.mayar_invoice_id);
    },
  },
};

const fakeMayar = {
  enabled: true,
  async createInvoice(payload) {
    mayarCalls.push(['create', payload]);
    const id = `inv-${invoices.size + 1}-aaaa`;
    const total = payload.items.reduce((s, i) => s + i.quantity * i.rate, 0);
    invoices.set(id, { id, amount: total, status: 'unpaid' });
    return { id, transactionId: `trx-${id}`, link: `https://urbanstore.myr.id/invoices/${id}`, expiredAt: Date.parse(payload.expiredAt) };
  },
  async getInvoice(id) {
    mayarCalls.push(['get', id]);
    return invoices.get(id) || null;
  },
};

let server, base;
before(async () => {
  const app = createApp(fakeData, { mayar: fakeMayar, webhookSecret: 'rahasia-webhook' });
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());
beforeEach(() => {
  orders = [newOrder(), newOrder({ id: 2, code: 'URB-2026-002', owner: 'u-maya' })];
  invoices = new Map();
  marked = [];
  mayarCalls = [];
});

const post = async (path, body, token) => {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

test('buildInvoicePayload: item + ongkir, total cocok, expiry ikut batas bayar', () => {
  const o = newOrder();
  const p = buildInvoicePayload(o);
  assert.deepEqual(p.items, [
    { quantity: 2, rate: 189000, description: 'Urban Oversized Heavy Tee · Hitam / L' },
    { quantity: 1, rate: 15000, description: 'Ongkir Regular (2–4 hari kerja)' },
  ]);
  assert.equal(p.mobile, '081234567890');
  assert.equal(p.expiredAt, new Date(o.payment_deadline).toISOString());
  assert.deepEqual(p.extraData, { orderCode: 'URB-2026-001' });
  assert.throws(() => buildInvoicePayload({ ...o, total: 1 }), /tidak cocok/);
});

test('create: wajib login customer, format kode, hanya pesanan sendiri', async () => {
  assert.equal((await post('/payments/mayar/create', { code: 'URB-2026-001' })).status, 401);
  assert.equal((await post('/payments/mayar/create', { code: 'URB-2026-001' }, 'admin-token')).status, 403);
  assert.equal((await post('/payments/mayar/create', { code: 'x; drop' }, 'rian-token')).status, 400);
  assert.equal((await post('/payments/mayar/create', { code: 'URB-2026-002' }, 'rian-token')).status, 404); // milik Maya
  assert.equal(mayarCalls.length, 0);
});

test('create: membuat invoice sekali, lalu link yang sama dipakai ulang', async () => {
  const first = await post('/payments/mayar/create', { code: 'URB-2026-001' }, 'rian-token');
  assert.equal(first.status, 200);
  assert.match(first.body.link, /^https:\/\/urbanstore\.myr\.id\/invoices\//);
  assert.equal(first.body.reused, false);
  const again = await post('/payments/mayar/create', { code: 'URB-2026-001' }, 'rian-token');
  assert.deepEqual(again.body, { link: first.body.link, reused: true });
  assert.equal(mayarCalls.filter(([t]) => t === 'create').length, 1);
});

test('create: pesanan kedaluwarsa / sudah lunas ditolak', async () => {
  orders[0].status = 'kedaluwarsa';
  const r = await post('/payments/mayar/create', { code: 'URB-2026-001' }, 'rian-token');
  assert.equal(r.status, 409);
  assert.match(r.body.error, /kedaluwarsa/);
});

test('webhook: token wajib benar; event lain diabaikan', async () => {
  assert.equal((await post('/webhook/mayar', { event: 'payment.received', data: {} })).status, 401);
  assert.equal((await post('/webhook/mayar?token=salah-tebak-xx', { event: 'payment.received', data: {} })).status, 401);
  const r = await post('/webhook/mayar?token=rahasia-webhook', { event: 'payment.reminder', data: {} });
  assert.deepEqual(r.body, { ok: true, ignored: 'payment.reminder' });
});

test('webhook palsu (invoice belum dibayar) TIDAK membuat pesanan lunas', async () => {
  const { body } = await post('/payments/mayar/create', { code: 'URB-2026-001' }, 'rian-token');
  const invoiceId = body.link.split('/').pop();
  const r = await post('/webhook/mayar?token=rahasia-webhook', { event: 'payment.received', data: { transactionId: `trx-${invoiceId}`, status: 'SUCCESS' } });
  assert.deepEqual(r.body.results, ['unverified:unpaid']);
  assert.equal(orders[0].status, 'menunggu_pembayaran');
  assert.equal(marked.length, 0);
});

test('webhook asli: status dicek ulang ke Mayar → pesanan lunas dengan nominal dari Mayar', async () => {
  const { body } = await post('/payments/mayar/create', { code: 'URB-2026-001' }, 'rian-token');
  const invoiceId = body.link.split('/').pop();
  invoices.get(invoiceId).status = 'paid'; // customer membayar di halaman Mayar
  const r = await post('/webhook/mayar?token=rahasia-webhook', { event: 'payment.received', data: { id: 'random-id-123', transactionId: `trx-${invoiceId}` } });
  assert.deepEqual(r.body, { ok: true, matched: 1, results: ['paid'] });
  assert.deepEqual(marked, [{ invoiceId, amount: orders[0].total }]);
  assert.ok(mayarCalls.some(([t, id]) => t === 'get' && id === invoiceId));
  assert.equal(orders[0].status, 'lunas');
});

test('sync: saat customer kembali dari Mayar, status diperbarui tanpa menunggu webhook', async () => {
  const { body } = await post('/payments/mayar/create', { code: 'URB-2026-001' }, 'rian-token');
  const invoiceId = body.link.split('/').pop();
  let r = await post('/payments/mayar/sync', { code: 'URB-2026-001' }, 'rian-token');
  assert.equal(r.body.mayarStatus, 'unpaid');
  invoices.get(invoiceId).status = 'paid';
  r = await post('/payments/mayar/sync', { code: 'URB-2026-001' }, 'rian-token');
  assert.equal(r.body.result, 'paid');
  assert.equal((await post('/payments/mayar/sync', { code: 'URB-2026-001' }, 'maya-token')).status, 404);
});

test('klien Mayar: header Bearer, statusCode di body menentukan, key kosong → 503', async () => {
  let seen;
  const client = createMayarClient({
    apiKey: 'test-key', baseUrl: 'https://api.mayar.io/hl/v2',
    fetchImpl: async (url, init) => {
      seen = { url, init };
      return new Response(JSON.stringify({ statusCode: 400, messages: 'Validation Error' }), { status: 200 });
    },
  });
  await assert.rejects(client.createInvoice({}), /Gagal memproses pembayaran/);
  assert.equal(seen.url, 'https://api.mayar.io/hl/v2/invoices/create');
  assert.equal(seen.init.headers.Authorization, 'Bearer test-key');
  await assert.rejects(createMayarClient({ apiKey: '' }).getInvoice('x'), (e) => e.status === 503);
});
