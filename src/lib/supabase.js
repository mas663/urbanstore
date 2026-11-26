import { createClient } from '@supabase/supabase-js';

// Hanya URL & publishable key yang boleh ada di frontend. Keamanan data dijaga Row Level Security.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  // flowType 'pkce': login Google kembali membawa ?code= sekali pakai (bukan token di URL) → lebih aman
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

/** Ubah error Supabase/Postgres jadi pesan yang ramah. */
export function friendlyError(error) {
  if (!error) return 'Terjadi kesalahan. Coba lagi ya.';
  const msg = error.message || String(error);
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) return 'Koneksi terputus. Cek internet kamu lalu coba lagi.';
  if (/Invalid login credentials/i.test(msg)) return 'Email atau password salah.';
  if (/Email not confirmed/i.test(msg)) return 'Email kamu belum dikonfirmasi. Cek inbox (atau folder spam) ya.';
  if (/User already registered/i.test(msg)) return 'Email ini sudah terdaftar. Coba login aja.';
  if (/Password should be at least/i.test(msg)) return 'Password minimal 6 karakter.';
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return 'Login Google belum diaktifkan di Supabase (Authentication → Providers → Google).';
  if (/rate limit/i.test(msg)) return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  if (/JWT expired|invalid JWT/i.test(msg)) return 'Sesi login kamu habis. Login lagi ya.';
  if (/permission denied|row-level security/i.test(msg)) return 'Akses ditolak untuk akun ini.';
  return msg;
}

/** Jalankan query Supabase; lempar Error berisi pesan ramah jika gagal. */
export async function run(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(friendlyError(error));
  return data;
}
