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
    // Provider cadangan (opsional) saat provider utama gagal/limit, mis. AI_PROVIDER=gemini + AI_FALLBACK_PROVIDER=openai_compatible (9Router)
    fallbackProvider: (env.AI_FALLBACK_PROVIDER || '').toLowerCase(),
    // Dua API key terpisah: customer (AI Shopping Assistant) & admin (deskripsi + analisis).
    // GEMINI_API_KEY lama tetap dipakai sebagai cadangan jika key per-scope belum diisi.
    geminiKeys: {
      customer: env.GEMINI_API_KEY_CUSTOMER || env.GEMINI_API_KEY || '',
      admin: env.GEMINI_API_KEY_ADMIN || env.GEMINI_API_KEY || '',
    },
    geminiModel: env.GEMINI_MODEL || 'gemini-3-flash-preview',
    geminiBaseUrl: (env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, ''),
    // Model cadangan saat model utama overload / rate limit (429/503)
    // Model cadangan PER provider (nama model Gemini ≠ nama model/combo di 9Router)
    fallbackModel: env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.5-flash-lite', // model cadangan di provider Gemini
    routerFallbackModel: env.AI_FALLBACK_MODEL ?? '',                    // model/combo cadangan di 9Router
    baseUrl: (env.AI_BASE_URL || '').replace(/\/+$/, ''),
    apiKeys: {
      customer: env.AI_API_KEY_CUSTOMER || env.AI_API_KEY || '',
      admin: env.AI_API_KEY_ADMIN || env.AI_API_KEY || '',
    },
    model: env.AI_MODEL || '',
    timeoutMs: 15000,
  },
  // Payment gateway Mayar.id (Sesi 6). Key HANYA di server — jangan pernah diberi prefix VITE_.
  mayar: {
    apiKey: env.MAYAR_API_KEY || '',
    // sandbox = uji coba (web.mayar.io, tanpa uang sungguhan) · production = transaksi nyata (web.mayar.id)
    env: (env.MAYAR_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox',
    get baseUrl() {
      return (env.MAYAR_BASE_URL || (this.env === 'production' ? 'https://api.mayar.id/hl/v2' : 'https://api.mayar.io/hl/v2')).replace(/\/+$/, '');
    },
    // Rahasia di URL webhook (?token=...). Mayar belum menyediakan signature, jadi ini lapisan pertama
    // penyaring; lapisan utamanya: server selalu cek ulang status ke API Mayar sebelum menandai lunas.
    webhookSecret: env.MAYAR_WEBHOOK_SECRET || '',
    timeoutMs: 15000,
  },
  chatQuota: {
    limit: int(env.CHAT_QUOTA_LIMIT, 5),
    windowSeconds: int(env.CHAT_QUOTA_WINDOW_HOURS, 12) * 60 * 60,
  },
};
