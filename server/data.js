import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { HttpError } from './lib/http.js';

/**
 * Lapisan data server AI → Supabase.
 * - Data user (katalog, metrik) diambil dengan TOKEN USER → Row Level Security tetap berlaku.
 * - Kuota chat memakai SECRET KEY (service_role) → tidak bisa dimanipulasi dari browser.
 * Dipisah sebagai objek supaya bisa diganti versi palsu saat testing.
 */
export function createSupabaseData() {
  const { url, publishableKey, secretKey } = config.supabase;
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const anon = url && publishableKey ? createClient(url, publishableKey, opts) : null;
  const service = url && secretKey ? createClient(url, secretKey, opts) : null;

  const must = (res, msg = 'Gagal mengambil data dari database.') => {
    if (res.error) {
      console.error('[supabase]', res.error.message);
      throw new HttpError(502, msg);
    }
    return res.data;
  };

  return {
    /** Verifikasi token Supabase dari header Authorization → { id, email, name, role, client } */
    async authenticate(req) {
      if (!anon) throw new HttpError(503, 'Server belum dikonfigurasi: isi SUPABASE_URL & SUPABASE_PUBLISHABLE_KEY.');
      const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
      if (!token) throw new HttpError(401, 'Kamu perlu login dulu.');
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data?.user) throw new HttpError(401, 'Sesi login kamu habis. Login lagi ya.');
      const client = createClient(url, publishableKey, { ...opts, global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: profile } = await client.from('profiles').select('full_name, role').eq('id', data.user.id).maybeSingle();
      return {
        id: data.user.id,
        email: data.user.email,
        name: profile?.full_name || data.user.email.split('@')[0],
        role: profile?.role || 'customer',
        client,
      };
    },

    async getCatalog(user) {
      return must(await user.client.from('products')
        .select('id, name, gender, price, compare_at_price, material, category:categories(name, size_type), variants:product_variants(color, size, stock)')
        .eq('is_active', true).order('id'));
    },

    async getSizeCharts(user) {
      const rows = must(await user.client.from('size_charts').select('size_type, size, data, sort').order('sort'));
      const charts = {};
      for (const r of rows) (charts[r.size_type] ||= []).push({ size: r.size, ...r.data });
      return charts;
    },

    async getMetrics(user) {
      return must(await user.client.rpc('get_sales_metrics'), 'Gagal menghitung metrik penjualan.');
    },

    /* ── Pembayaran Mayar (Sesi 6) ──────────────────────────────── */
    payments: {
      ensure() {
        if (!service) throw new HttpError(503, 'Pembayaran otomatis butuh SUPABASE_SECRET_KEY di environment server.');
      },
      /** Pesanan milik user yang login. Pakai token user → RLS menjamin tidak bisa membuka pesanan orang lain. */
      async getOwnOrder(user, code) {
        const row = must(await user.client.from('orders')
          .select('id, code, status, customer_name, email, phone, shipping_method, shipping_cost, total, payment_deadline,' +
            ' items:order_items(product_name, color, size, price, qty),' +
            ' payment:payments(status, mayar_invoice_id, mayar_link, mayar_expired_at)')
          .eq('code', code).maybeSingle());
        if (!row) return null;
        // Relasi satu-ke-satu bisa dikembalikan sebagai objek atau array → seragamkan jadi objek
        return { ...row, payment: Array.isArray(row.payment) ? row.payment[0] || null : row.payment };
      },
      /** Tutup pesanan yang lewat batas 1 jam, supaya status yang dibaca selalu terbaru. */
      async expireOverdue(user) {
        await user.client.rpc('expire_overdue_orders');
      },
      async attach(orderId, { invoiceId, transactionId, link, expiredAt }) {
        this.ensure();
        must(await service.rpc('mayar_attach_invoice', {
          p_order_id: orderId, p_invoice_id: invoiceId, p_transaction_id: transactionId, p_link: link, p_expired_at: expiredAt,
        }), 'Gagal menyimpan data pembayaran.');
      },
      /** Dipanggil HANYA setelah status "paid" dicek langsung ke API Mayar. */
      async markPaid(invoiceId, amount) {
        this.ensure();
        return must(await service.rpc('mayar_mark_paid', { p_invoice_id: invoiceId, p_amount: amount }), 'Gagal memperbarui status pesanan.');
      },
      /** Cari invoice Mayar milik UrbanStore dari id-id yang disebut webhook (id invoice atau id transaksi). */
      async findInvoiceIds(ids) {
        this.ensure();
        const [byInvoice, byTrx] = await Promise.all([
          service.from('payments').select('mayar_invoice_id').in('mayar_invoice_id', ids),
          service.from('payments').select('mayar_invoice_id').in('mayar_transaction_id', ids),
        ]);
        const rows = [...must(byInvoice), ...must(byTrx)];
        return [...new Set(rows.map((r) => r.mayar_invoice_id).filter(Boolean))];
      },
    },

    quota: {
      ensure() {
        if (!service) throw new HttpError(503, 'Kuota chat belum bisa dihitung: isi SUPABASE_SECRET_KEY di environment server.');
      },
      async get(userId) {
        this.ensure();
        const { limit, windowSeconds } = config.chatQuota;
        return must(await service.rpc('get_chat_quota', { p_user: userId, p_limit: limit, p_window_seconds: windowSeconds }));
      },
      async consume(userId) {
        this.ensure();
        const { limit, windowSeconds } = config.chatQuota;
        return must(await service.rpc('consume_chat_quota', { p_user: userId, p_limit: limit, p_window_seconds: windowSeconds }));
      },
      async refund(userId) {
        this.ensure();
        must(await service.rpc('refund_chat_quota', { p_user: userId }));
      },
    },
  };
}
