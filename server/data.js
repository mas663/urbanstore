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
