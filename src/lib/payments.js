import { useEffect, useState } from 'react';
import { api } from './api.js';

/* Helper pembayaran Mayar untuk frontend (dipakai Checkout & Invoice).
   Browser TIDAK pernah memegang API key Mayar — semua lewat server kita di /api/payments/*. */

// Cek sekali per kunjungan apakah Mayar aktif di server (MAYAR_API_KEY terisi)
let configPromise = null;
function fetchPaymentConfig() {
  configPromise ||= api('/payments/config').catch(() => ({ mayar: false }));
  return configPromise;
}

/** Hook: true kalau pembayaran otomatis Mayar tersedia, false kalau tidak, null saat masih mengecek. */
export function useMayarEnabled() {
  const [enabled, setEnabled] = useState(null);
  useEffect(() => {
    let active = true;
    fetchPaymentConfig().then((c) => active && setEnabled(Boolean(c.mayar)));
    return () => { active = false; };
  }, []);
  return enabled;
}

/** Minta link bayar ke server lalu pindah ke halaman pembayaran Mayar. */
export async function startMayarPayment(code) {
  const { link } = await api('/payments/mayar/create', { method: 'POST', body: { code } });
  // Hanya izinkan link https (jaga-jaga respons aneh), lalu buka di tab yang sama
  if (!/^https:\/\//.test(link)) throw new Error('Link pembayaran tidak valid.');
  window.location.assign(link);
}

/** Tanya server: sudah dibayar belum? (server yang mengecek ke API Mayar) */
export function syncMayarPayment(code) {
  return api('/payments/mayar/sync', { method: 'POST', body: { code } });
}
