// Siapkan file .env.vercel berisi HANYA variabel yang dibutuhkan production dan sudah terisi.
// Isinya bisa di-copy lalu di-paste sekali ke Vercel → Settings → Environment Variables.
// Nilai rahasia tidak pernah dicetak ke terminal. Jalankan: npm run vercel:env
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEEDED = [
  'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY',
  'VITE_STORE_BANK_NAME', 'VITE_STORE_BANK_ACCOUNT', 'VITE_STORE_BANK_HOLDER',
  'AI_PROVIDER', 'GEMINI_API_KEY_CUSTOMER', 'GEMINI_API_KEY_ADMIN', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODEL',
  'CHAT_QUOTA_LIMIT', 'CHAT_QUOTA_WINDOW_HOURS',
  'MAYAR_API_KEY', 'MAYAR_ENV', 'MAYAR_WEBHOOK_SECRET',
];
const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'GEMINI_API_KEY_CUSTOMER', 'GEMINI_API_KEY_ADMIN'];

const envFile = path.join(root, '.env');
if (!fs.existsSync(envFile)) {
  console.error('! File .env tidak ditemukan. Salin dari .env.example dulu.');
  process.exit(1);
}

const values = {};
for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=(.*)$/);
  if (m) values[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}

const out = [];
const rows = [];
// Situs live (Vercel) tidak bisa menjangkau 9Router di localhost → selalu Gemini langsung, tanpa provider cadangan.
values.AI_PROVIDER = 'gemini';

for (const name of NEEDED) {
  const v = values[name];
  const ok = Boolean(v) && !/^<.*>$|\.\.\.$|<project-id>/.test(v);
  rows.push({ name, ok });
  if (ok) out.push(`${name}=${v}`);
}

fs.writeFileSync(path.join(root, '.env.vercel'), out.join('\n') + '\n', { mode: 0o600 });

console.log('Variabel untuk Vercel (nilai tidak ditampilkan):');
for (const r of rows) console.log(`  ${r.ok ? '✓' : REQUIRED.includes(r.name) ? '✗ KOSONG (wajib)' : '- kosong (opsional)'}  ${r.name}`);
const missing = rows.filter((r) => !r.ok && REQUIRED.includes(r.name));
console.log(`\n→ ${out.length} variabel ditulis ke .env.vercel (file ini di-ignore git).`);
console.log('  Salin dengan:  pbcopy < .env.vercel   lalu paste di Vercel → Settings → Environment Variables.');
console.log('  Hapus setelah dipakai:  rm .env.vercel');
if (missing.length) {
  console.log(`\n! Lengkapi dulu di .env: ${missing.map((r) => r.name).join(', ')}`);
  process.exit(1);
}
