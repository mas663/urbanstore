import { HttpError } from '../lib/http.js';

/**
 * Klien kecil untuk Mayar Headless API v2 (https://docs.mayar.id/api-reference-v2).
 * - Autentikasi: header "Authorization: Bearer <API_KEY>" (key Read & Write).
 * - Sandbox  : https://api.mayar.io/hl/v2  (key dari web.mayar.io/api-keys)
 * - Produksi : https://api.mayar.id/hl/v2  (key dari web.mayar.id/api-keys)
 * - Batas    : 50 request/menit per API key.
 *
 * `fetchImpl` bisa diganti fungsi palsu saat testing, jadi tes tidak memanggil Mayar sungguhan.
 */
export function createMayarClient({ apiKey, baseUrl, timeoutMs = 15000, fetchImpl = globalThis.fetch } = {}) {
  const enabled = Boolean(apiKey);

  async function call(method, path, body) {
    if (!enabled) throw new HttpError(503, 'Pembayaran otomatis belum aktif (MAYAR_API_KEY belum diisi di server).');

    let res;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs), // jangan menunggu selamanya kalau Mayar lambat
      });
    } catch {
      throw new HttpError(502, 'Mayar tidak bisa dihubungi. Coba lagi sebentar ya.');
    }

    const json = await res.json().catch(() => ({}));
    // Menurut dokumentasi, "statusCode" di BODY yang menentukan (kadang HTTP 200 tapi body 400)
    const code = Number(json.statusCode ?? res.status);
    if (!res.ok || code >= 400) {
      console.error('[mayar]', method, path, res.status, code, json.messages);
      if (code === 429) throw new HttpError(429, 'Terlalu banyak permintaan ke Mayar. Tunggu 1 menit lalu coba lagi.');
      if (code === 401) throw new HttpError(502, 'API key Mayar ditolak. Cek MAYAR_API_KEY dan MAYAR_ENV (sandbox/production).');
      throw new HttpError(502, 'Gagal memproses pembayaran di Mayar. Coba lagi ya.');
    }
    return json.data;
  }

  return {
    enabled,
    /** POST /invoices/create → { id, transactionId, link, expiredAt (epoch ms) } */
    createInvoice: (payload) => call('POST', '/invoices/create', payload),
    /** GET /invoices/{id} → { id, amount, status: 'paid' | 'unpaid' | 'closed', ... } */
    getInvoice: (id) => call('GET', `/invoices/${encodeURIComponent(id)}`),
  };
}

/**
 * Ubah pesanan UrbanStore → body "Create Invoice" Mayar.
 * Setiap item jadi satu baris + ongkir sebagai baris terakhir, supaya customer melihat rincian
 * yang sama dengan invoice UrbanStore. Total dihitung Mayar dari items, jadi kita cek dulu harus sama.
 */
export function buildInvoicePayload(order) {
  const items = order.items.map((i) => ({
    quantity: i.qty,
    rate: i.price,
    description: `${i.product_name} · ${i.color} / ${i.size}`.slice(0, 120),
  }));
  if (order.shipping_cost > 0) {
    items.push({
      quantity: 1,
      rate: order.shipping_cost,
      description: order.shipping_method === 'express' ? 'Ongkir Express Next Day' : 'Ongkir Regular (2–4 hari kerja)',
    });
  }

  const sum = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  if (sum !== order.total) {
    // Seharusnya tidak pernah terjadi; lebih aman berhenti daripada menagih nominal yang salah
    throw new HttpError(500, 'Total pesanan tidak cocok dengan rincian item. Hubungi admin ya.');
  }

  return {
    name: order.customer_name,
    email: order.email,
    mobile: order.phone,
    description: `Pesanan ${order.code} · UrbanStore`,
    // Link bayar Mayar ikut kedaluwarsa bersamaan dengan batas bayar 1 jam pesanan
    expiredAt: new Date(order.payment_deadline).toISOString(),
    items,
    extraData: { orderCode: order.code },
  };
}
