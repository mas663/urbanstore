import manifest from './photoManifest.json';

/* Foto produk lokal (hasil `npm run photos`).
   Data di database masih menunjuk ke ilustrasi SVG bawaan seed; kalau foto aslinya sudah ada,
   tampilkan fotonya. Foto yang diunggah admin (URL Supabase/https) selalu dipakai apa adanya. */

const PLACEHOLDER = '/products/placeholder.svg';

export function resolveImage(url) {
  if (!url) return PLACEHOLDER;
  return manifest.legacy[url] || url;
}

/** Foto "dipakai model" (opsional) untuk efek hover di kartu produk. */
export function modelImage(slug) {
  return manifest.products[slug]?.model || null;
}

/** Foto editorial (hero, lookbook, kategori…) atau null bila belum ada. */
export function editorialImage(name) {
  return manifest.editorial[name] || null;
}
