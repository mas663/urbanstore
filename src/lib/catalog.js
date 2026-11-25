import { run, supabase } from './supabase.js';
import { resolveImage } from './productImages.js';

export const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'All Size'];
const bySize = (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b);

export const PRODUCT_SELECT =
  'id, name, slug, gender, price, compare_at_price, material, description, image_url, is_featured, is_active, created_at,' +
  ' category:categories!inner(id, name, slug, size_type), variants:product_variants(id, color, size, stock)';

/** Bentuk data produk yang dipakai komponen UI. */
export function normalizeProduct(row) {
  const variants = [...(row.variants || [])].sort((a, b) => a.color.localeCompare(b.color) || bySize(a.size, b.size));
  const stock = variants.reduce((s, v) => s + v.stock, 0);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: { id: row.category.id, name: row.category.name, slug: row.category.slug, sizeType: row.category.size_type },
    gender: row.gender,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    material: row.material,
    description: row.description,
    imageUrl: resolveImage(row.image_url),
    isFeatured: row.is_featured,
    isActive: row.is_active,
    createdAt: row.created_at,
    variants,
    colors: [...new Set(variants.map((v) => v.color))],
    sizes: [...new Set(variants.map((v) => v.size))].sort(bySize),
    stock,
    inStock: stock > 0,
  };
}

const cleanSearch = (q) => String(q || '').replace(/[%_,()*\\]/g, ' ').trim().slice(0, 60);

export async function fetchProducts({ q, gender, category, sort, featured, limit = 60, includeInactive = false } = {}) {
  let query = supabase.from('products').select(PRODUCT_SELECT);
  if (!includeInactive) query = query.eq('is_active', true);
  if (gender === 'pria' || gender === 'wanita') query = query.in('gender', [gender, 'unisex']);
  if (category) query = query.eq('category.slug', category);
  if (featured) query = query.eq('is_featured', true);
  const term = cleanSearch(q);
  if (term) query = query.ilike('name', `%${term}%`);
  if (sort === 'price_asc') query = query.order('price', { ascending: true });
  else if (sort === 'price_desc') query = query.order('price', { ascending: false });
  else if (sort === 'newest') query = query.order('created_at', { ascending: false });
  else query = query.order('is_featured', { ascending: false }).order('id', { ascending: true });
  const rows = await run(query.limit(limit));
  const products = rows.map(normalizeProduct);
  // Rekomendasi: produk yang masih ada stok tampil lebih dulu
  if (!sort) products.sort((a, b) => Number(b.inStock) - Number(a.inStock));
  return products;
}

export async function fetchProductBySlug(slug) {
  const row = await run(supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('is_active', true).maybeSingle());
  return row ? normalizeProduct(row) : null;
}

export async function fetchCategories() {
  return run(supabase.from('categories').select('id, name, slug, size_type').order('id'));
}

export async function fetchSizeCharts() {
  const rows = await run(supabase.from('size_charts').select('size_type, size, data, sort').order('sort'));
  const charts = {};
  for (const r of rows) (charts[r.size_type] ||= []).push({ size: r.size, ...r.data });
  return charts;
}

export async function fetchRelated(product) {
  const rows = await run(
    supabase.from('products').select(PRODUCT_SELECT).eq('is_active', true).neq('id', product.id)
      .eq('category_id', product.category.id).limit(4),
  );
  let list = rows.map(normalizeProduct);
  if (list.length < 4) {
    const more = await run(
      supabase.from('products').select(PRODUCT_SELECT).eq('is_active', true).neq('id', product.id)
        .in('gender', [product.gender, 'unisex']).limit(8),
    );
    for (const p of more.map(normalizeProduct)) if (list.length < 4 && !list.some((x) => x.id === p.id)) list.push(p);
  }
  return list.sort((a, b) => Number(b.inStock) - Number(a.inStock));
}

export const SHIPPING = [
  { id: 'regular', label: 'Regular Shipping', eta: '2–4 hari kerja', cost: 15000 },
  { id: 'express', label: 'Express Next Day', eta: 'Besok sampai', cost: 30000 },
];

export const BANK = {
  name: import.meta.env.VITE_STORE_BANK_NAME || 'BCA',
  account: import.meta.env.VITE_STORE_BANK_ACCOUNT || '123-456-7890',
  holder: import.meta.env.VITE_STORE_BANK_HOLDER || 'PT UrbanStore Fashion Indonesia',
};

export const ORDER_STATUS = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  menunggu_verifikasi: 'Menunggu Verifikasi',
  lunas: 'Lunas · Diproses',
  dikirim: 'Dikirim',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
  kedaluwarsa: 'Kedaluwarsa',
};
