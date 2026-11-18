const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export const rupiah = (n) => idr.format(n || 0).replace(/\s/g, '');

// Tanggal dari SQLite disimpan dalam UTC ("YYYY-MM-DD HH:MM:SS")
export function formatDate(sqliteDate, withTime = true) {
  if (!sqliteDate) return '-';
  const d = new Date(sqliteDate.replace(' ', 'T') + 'Z');
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
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[*•·]\s+/gm, '- ')
    .replace(/(^|\s)\*(\S[^*\n]*\S|\S)\*(?=\s|[.,!?]|$)/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n');
}
