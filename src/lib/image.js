/**
 * Kompres gambar di browser sebelum upload (bukti transfer / foto produk).
 * Resize sisi terpanjang ke maxSize px lalu encode JPEG. Hasil biasanya 100–400 KB.
 */
export async function compressImage(file, { maxSize = 1280, quality = 0.75, maxInputMB = 10 } = {}) {
  if (!file || !/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) {
    throw new Error('File harus berupa gambar (JPG, PNG, atau WEBP).');
  }
  if (file.size > maxInputMB * 1024 * 1024) {
    throw new Error(`Ukuran gambar maksimal ${maxInputMB} MB.`);
  }

  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // PNG transparan → latar putih
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let q = quality;
  let blob = await toBlob(canvas, q);
  // Turunkan kualitas bertahap sampai < 500 KB (batas bucket 2 MB)
  while (blob.size > 500 * 1024 && q > 0.45) {
    q -= 0.1;
    blob = await toBlob(canvas, q);
  }
  return { blob, width, height, originalSize: file.size, size: blob.size };
}

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* fallback ke <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error('Gambar tidak bisa dibaca. Coba foto/screenshot lain ya.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas, quality) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memproses gambar.'))), 'image/jpeg', quality));

export const formatBytes = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
