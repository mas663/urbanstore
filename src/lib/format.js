const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export const rupiah = (n) => idr.format(n || 0).replace(/\s/g, '');

// Tanggal dari Supabase berformat ISO (timestamptz), mis. 2026-11-18T13:00:00+00:00
export function formatDate(value, withTime = true) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export const GENDER_LABEL = { pria: 'Pria', wanita: 'Wanita', unisex: 'Unisex' };

export const discountPercent = (price, compareAt) =>
  compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

/** Bersihkan teks AI dari sisa Markdown/HTML supaya tampil rapi. */
export function cleanAiText(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|`+/g, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*[*•·][ \t]+/gm, '- ')
    .replace(/(^|\s)\*(\S[^*\n]*\S|\S)\*(?=\s|[.,!?]|$)/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n');
}

/** Format angka terjual yang ringkas: 7 → "7", 128 → "100+", 1450 → "1rb+". */
export function formatSold(n) {
  if (!n) return '';
  if (n >= 1000) return `${Math.floor(n / 1000)}rb+`;
  if (n >= 100) return `${Math.floor(n / 100) * 100}+`;
  return String(n);
}
