// Validasi input dengan pesan error yang jelas & solutif (NFR: Clear Validation).

export const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const toInt = (v) => {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
  return NaN;
};

/** Normalisasi nomor HP Indonesia ke format 08xxxxxxxxxx. */
export function normalizePhone(v) {
  let p = String(v ?? '').replace(/[\s\-().]/g, '');
  if (p.startsWith('+62')) p = '0' + p.slice(3);
  else if (p.startsWith('62')) p = '0' + p.slice(2);
  return p;
}

export const isValidPhone = (p) => /^08\d{8,12}$/.test(p);
export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export function validateCheckout(body) {
  const data = {
    name: str(body.name, 100),
    phone: normalizePhone(body.phone),
    email: str(body.email, 150).toLowerCase(),
    address: str(body.address, 500),
    city: str(body.city, 100),
    postalCode: str(body.postalCode, 10),
    notes: str(body.notes, 300),
    shippingMethod: str(body.shippingMethod, 20),
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Isi nama penerima minimal 2 huruf ya.';
  if (!isValidPhone(data.phone)) errors.phone = 'Nomor WhatsApp belum valid. Contoh: 081234567890.';
  if (!isValidEmail(data.email)) errors.email = 'Format email belum bener. Contoh: kamu@email.com.';
  if (data.address.length < 10) errors.address = 'Alamat terlalu singkat. Tulis jalan, nomor rumah, RT/RW, dan kecamatan.';
  if (data.city.length < 2) errors.city = 'Isi kota / kabupaten tujuan.';
  if (!/^\d{5}$/.test(data.postalCode)) errors.postalCode = 'Kode pos harus 5 digit angka.';
  if (!['regular', 'express'].includes(data.shippingMethod)) errors.shippingMethod = 'Pilih metode pengiriman dulu.';
  return { data, errors };
}

const GENDERS = ['pria', 'wanita', 'unisex'];

/**
 * Aturan input produk (Sesi 4):
 * 1. Nama, kategori, dan harga wajib diisi.
 * 2. Harga dan jumlah stok harus lebih besar dari 0 (stok boleh 0 saat edit = "Habis").
 * 3. Minimal memilih 1 varian ukuran.
 */
export function validateProduct(body, { allowedSizes, isCreate }) {
  const list = (v, max) =>
    (Array.isArray(v) ? v : String(v ?? '').split(','))
      .map((s) => String(s).trim())
      .filter(Boolean)
      .slice(0, max);

  const data = {
    name: str(body.name, 120),
    categoryId: toInt(body.categoryId),
    gender: str(body.gender, 10),
    price: toInt(body.price),
    compareAtPrice: body.compareAtPrice === '' || body.compareAtPrice == null ? null : toInt(body.compareAtPrice),
    stock: toInt(body.stock),
    sizes: [...new Set(list(body.sizes, 10))],
    colors: list(body.colors, 8).map((c) => c.slice(0, 30)),
    material: str(body.material, 150),
    description: str(body.description, 3000),
    imageUrl: str(body.imageUrl, 500),
    isFeatured: Boolean(body.isFeatured),
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  };

  const errors = {};
  if (data.name.length < 3) errors.name = 'Nama produk wajib diisi (min. 3 karakter).';
  if (!Number.isInteger(data.categoryId)) errors.categoryId = 'Pilih kategori produk.';
  if (!GENDERS.includes(data.gender)) errors.gender = 'Pilih gender: Pria, Wanita, atau Unisex.';
  if (!Number.isInteger(data.price) || data.price <= 0) errors.price = 'Harga wajib diisi dan harus lebih dari 0.';
  else if (data.price > 100_000_000) errors.price = 'Harga terlalu besar.';
  if (data.compareAtPrice !== null && (!Number.isInteger(data.compareAtPrice) || data.compareAtPrice <= data.price)) {
    errors.compareAtPrice = 'Harga coret harus lebih besar dari harga jual (kosongkan jika tidak diskon).';
  }
  if (!Number.isInteger(data.stock) || data.stock < 0) errors.stock = 'Stok harus berupa angka.';
  else if (isCreate && data.stock <= 0) errors.stock = 'Stok awal harus lebih dari 0.';
  else if (data.stock > 100000) errors.stock = 'Stok terlalu besar.';
  if (data.sizes.length === 0) errors.sizes = 'Pilih minimal 1 varian ukuran.';
  else if (data.sizes.some((s) => !allowedSizes.includes(s))) errors.sizes = 'Ukuran tidak dikenali.';
  if (data.imageUrl && !/^(https?:\/\/|\/)[^\s"'<>]+$/i.test(data.imageUrl)) {
    errors.imageUrl = 'URL foto harus diawali https:// (atau path /products/... untuk gambar lokal).';
  }
  return { data, errors };
}
