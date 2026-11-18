// Jalankan server AI secara lokal (npm run dev / npm start). Di Vercel dipakai api/index.js.
import { config } from './config.js';
import { createApp } from './app.js';
import { createSupabaseData } from './data.js';

const missing = [];
if (!config.supabase.url) missing.push('VITE_SUPABASE_URL');
if (!config.supabase.publishableKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
if (!config.supabase.secretKey) missing.push('SUPABASE_SECRET_KEY (untuk kuota chat AI)');
if (missing.length) console.warn(`! Env belum diisi: ${missing.join(', ')}`);

createApp(createSupabaseData(), { serveStatic: process.argv.includes('--static') }).listen(config.port, () => {
  console.log(`✓ UrbanStore AI API jalan di http://localhost:${config.port}`);
});
