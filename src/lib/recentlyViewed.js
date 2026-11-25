/* "Terakhir kamu lihat" — disimpan di localStorage browser (bukan database).

   Kenapa localStorage?
   - Tidak perlu login: pengunjung baru pun langsung dapat manfaatnya.
   - Tidak membebani server dan tidak menyimpan data pribadi.
   Kekurangannya: hanya ada di browser itu saja (HP & laptop tidak tersinkron) — wajar untuk fitur ini.

   Semua akses dibungkus try/catch karena localStorage bisa diblokir (mode privat / pengaturan browser). */

const KEY = 'us_recently_viewed';
const MAX = 8;

/** Ambil daftar slug, yang terbaru di depan. */
export function getRecentlyViewed() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

/** Catat produk yang baru dibuka: pindahkan ke paling depan, buang duplikat, batasi MAX item. */
export function addRecentlyViewed(slug) {
  try {
    const next = [slug, ...getRecentlyViewed().filter((s) => s !== slug)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage diblokir → abaikan, fitur ini tidak wajib */
  }
}
