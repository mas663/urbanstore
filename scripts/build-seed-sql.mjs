// Generate supabase/seed.sql dari scripts/seed-data.js. Jalankan: npm run seed:sql
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, products, sizeCharts } from './seed-data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);

/** Bagi total stok ke semua varian; sisa pembagian diberikan ke ukuran tengah (paling laku). */
export function splitStock(total, colors, sizes) {
  const variants = colors.flatMap((color) => sizes.map((size) => ({ color, size, stock: 0 })));
  const base = Math.floor(total / variants.length);
  let rest = total - base * variants.length;
  const middleFirst = [...variants.keys()].sort((a, b) => {
    const sa = Math.abs(sizes.indexOf(variants[a].size) - (sizes.length - 1) / 2);
    const sb = Math.abs(sizes.indexOf(variants[b].size) - (sizes.length - 1) / 2);
    return sa - sb || a - b;
  });
  for (const v of variants) v.stock = base;
  for (const i of middleFirst) {
    if (rest-- <= 0) break;
    variants[i].stock += 1;
  }
  return variants;
}

const lines = [
  '-- UrbanStore — data contoh. Jalankan SETELAH migrations/001_schema.sql.',
  '-- Aman dijalankan ulang: size chart & kategori di-update, produk hanya diisi jika katalog masih kosong.',
  'begin;',
  '',
  '-- Size chart (cm) + estimasi tinggi & berat badan',
  'insert into public.size_charts (size_type, size, data, sort) values',
];
const chartRows = [];
for (const [type, rows] of Object.entries(sizeCharts)) {
  rows.forEach((row, i) => {
    const { size, ...data } = row;
    chartRows.push(`  (${q(type)}, ${q(size)}, ${q(JSON.stringify(data))}::jsonb, ${i})`);
  });
}
lines.push(chartRows.join(',\n') + '\non conflict (size_type, size) do update set data = excluded.data, sort = excluded.sort;', '');

lines.push('-- Kategori', 'insert into public.categories (name, slug, size_type) values');
lines.push(categories.map((c) => `  (${q(c.name)}, ${q(c.slug)}, ${q(c.sizeType)})`).join(',\n') +
  '\non conflict (slug) do update set name = excluded.name, size_type = excluded.size_type;', '');

lines.push('-- Produk + varian');
for (const p of products) {
  const variants = splitStock(p.stock, p.colors, p.sizes);
  lines.push(`with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select ${q(p.name)}, null, id, ${q(p.gender)}, ${p.price}, ${p.compareAt ?? 'null'}, ${q(p.material)}, ${q(p.description)}, ${q(p.image)}, ${p.featured ? 'true' : 'false'}
  from public.categories where slug = ${q(p.category)}
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
${variants.map((v) => `  (${q(v.color)}, ${q(v.size)}, ${v.stock})`).join(',\n')}
) as v(color, size, stock);
`);
}
lines.push('commit;', '');

// Setiap produk hanya di-insert jika produk dengan nama yang sama belum ada → aman dijalankan ulang.
// (Sengaja tanpa temp table: SQL Editor Supabase memperingatkan setiap CREATE TABLE tanpa RLS.)
const sql = lines.join('\n').replace('-- Produk + varian', '-- Produk + varian (produk yang sudah ada dilewati)');
const guarded = sql.replace(
  /select ('(?:[^']|'')+'), null, id,([\s\S]*?)from public\.categories where slug = ('[^']+')\n  on conflict/g,
  (_, name, mid, slug) =>
    `select ${name}, null, id,${mid}from public.categories where slug = ${slug}\n` +
    `    and not exists (select 1 from public.products where name = ${name})\n  on conflict`,
);

fs.mkdirSync(path.join(root, 'supabase'), { recursive: true });
fs.writeFileSync(path.join(root, 'supabase/seed.sql'), guarded);
console.log(`✓ supabase/seed.sql dibuat (${products.length} produk)`);
