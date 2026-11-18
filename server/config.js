// Konfigurasi server AI (dibaca dari environment variables / .env). Tidak ada secret di kode.
const env = process.env;

const int = (v, d) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export const config = {
  port: int(env.PORT, 3001),
  supabase: {
    url: (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    // Hanya di server: untuk fungsi kuota chat (role service_role). JANGAN beri prefix VITE_.
    secretKey: env.SUPABASE_SECRET_KEY || '',
  },
  ai: {
    provider: (env.AI_PROVIDER || 'gemini').toLowerCase(),
    // Dua API key terpisah: customer (AI Shopping Assistant) & admin (deskripsi + analisis).
    // GEMINI_API_KEY lama tetap dipakai sebagai cadangan jika key per-scope belum diisi.
    geminiKeys: {
      customer: env.GEMINI_API_KEY_CUSTOMER || env.GEMINI_API_KEY || '',
      admin: env.GEMINI_API_KEY_ADMIN || env.GEMINI_API_KEY || '',
    },
    geminiModel: env.GEMINI_MODEL || 'gemini-3.8-flash',
    geminiBaseUrl: (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, ''),
    // Model cadangan saat model utama overload / rate limit (429/503)
    fallbackModel: env.GEMINI_FALLBACK_MODEL ?? env.AI_FALLBACK_MODEL ?? '',
    baseUrl: (env.AI_BASE_URL || '').replace(/\/+$/, ''),
    apiKeys: {
      customer: env.AI_API_KEY_CUSTOMER || env.AI_API_KEY || '',
      admin: env.AI_API_KEY_ADMIN || env.AI_API_KEY || '',
    },
    model: env.AI_MODEL || '',
    timeoutMs: 15000,
  },
  chatQuota: {
    limit: int(env.CHAT_QUOTA_LIMIT, 5),
    windowSeconds: int(env.CHAT_QUOTA_WINDOW_HOURS, 12) * 60 * 60,
  },
};
