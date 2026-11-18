// Semua konfigurasi dibaca dari environment variables (.env). Tidak ada secret di kode.
const env = process.env;

const int = (v, d) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export const config = {
  port: int(env.PORT, 3001),
  isProd: env.NODE_ENV === 'production',
  databasePath: env.DATABASE_PATH || './data/urbanstore.db',
  admin: {
    email: (env.ADMIN_EMAIL || 'admin@urbanstore.id').toLowerCase(),
    password: env.ADMIN_PASSWORD || '',
  },
  bank: {
    name: env.STORE_BANK_NAME || 'BCA',
    account: env.STORE_BANK_ACCOUNT || '123-456-7890',
    holder: env.STORE_BANK_HOLDER || 'PT UrbanStore Fashion Indonesia',
  },
  shipping: {
    regular: { label: 'Regular Shipping', eta: '2–4 hari kerja', cost: 15000 },
    express: { label: 'Express Next Day', eta: 'Besok sampai', cost: 30000 },
  },
  ai: {
    provider: (env.AI_PROVIDER || 'gemini').toLowerCase(),
    geminiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || 'gemini-3.8-flash',
    baseUrl: (env.AI_BASE_URL || '').replace(/\/+$/, ''),
    apiKey: env.AI_API_KEY || '',
    model: env.AI_MODEL || '',
    timeoutMs: 15000,
  },
  chatQuota: {
    limit: int(env.CHAT_QUOTA_LIMIT, 5),
    windowMs: int(env.CHAT_QUOTA_WINDOW_HOURS, 12) * 60 * 60 * 1000,
  },
};
