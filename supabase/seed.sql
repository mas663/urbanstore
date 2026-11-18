-- UrbanStore — data contoh. Jalankan SETELAH migrations/001_schema.sql.
-- Aman dijalankan ulang: size chart & kategori di-update, produk hanya diisi jika katalog masih kosong.
begin;

-- Size chart (cm) + estimasi tinggi & berat badan
insert into public.size_charts (size_type, size, data, sort) values
  ('top', 'S', '{"chest":100,"length":68,"sleeve":20,"tb":"155–165","bb":"45–55"}'::jsonb, 0),
  ('top', 'M', '{"chest":106,"length":71,"sleeve":21,"tb":"163–172","bb":"55–65"}'::jsonb, 1),
  ('top', 'L', '{"chest":112,"length":74,"sleeve":22,"tb":"170–178","bb":"65–75"}'::jsonb, 2),
  ('top', 'XL', '{"chest":118,"length":77,"sleeve":23,"tb":"176–185","bb":"75–88"}'::jsonb, 3),
  ('bottom', 'S', '{"waist":70,"hip":96,"length":98,"tb":"155–165","bb":"45–55"}'::jsonb, 0),
  ('bottom', 'M', '{"waist":76,"hip":102,"length":100,"tb":"163–172","bb":"55–65"}'::jsonb, 1),
  ('bottom', 'L', '{"waist":82,"hip":108,"length":102,"tb":"170–178","bb":"65–75"}'::jsonb, 2),
  ('bottom', 'XL', '{"waist":88,"hip":114,"length":104,"tb":"176–185","bb":"75–88"}'::jsonb, 3),
  ('onesize', 'All Size', '{"note":"Strap adjustable / ukuran universal"}'::jsonb, 0)
on conflict (size_type, size) do update set data = excluded.data, sort = excluded.sort;

-- Kategori
insert into public.categories (name, slug, size_type) values
  ('T-Shirt', 't-shirt', 'top'),
  ('Kemeja', 'kemeja', 'top'),
  ('Hoodie', 'hoodie', 'top'),
  ('Jacket', 'jacket', 'top'),
  ('Celana', 'celana', 'bottom'),
  ('Topi', 'topi', 'onesize'),
  ('Aksesoris', 'aksesoris', 'onesize')
on conflict (slug) do update set name = excluded.name, size_type = excluded.size_type;

-- Produk + varian (dilewati jika katalog sudah berisi)
create temp table _seed_flag on commit drop as select not exists (select 1 from public.products) as go;
with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Urban Oversized Heavy Tee', null, id, 'unisex', 189000, null, 'Cotton combed 24s heavyweight 220 gsm', 'Kaos oversized dengan bahan cotton combed heavyweight yang tebal tapi tetap adem. Potongan drop shoulder bikin siluet santai yang gampang dipadukan dengan celana apa pun, dari cargo sampai chino.

Cocok buat kuliah, nongkrong, atau sekadar keluar cari kopi.', '/products/oversized-tee-black.svg', true
  from public.categories where slug = 't-shirt' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Hitam', 'S', 3),
  ('Hitam', 'M', 4),
  ('Hitam', 'L', 3),
  ('Hitam', 'XL', 3),
  ('Off White', 'S', 3),
  ('Off White', 'M', 3),
  ('Off White', 'L', 3),
  ('Off White', 'XL', 3)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Essential Boxy Tee', null, id, 'unisex', 149000, 179000, 'Cotton combed 30s', 'Kaos boxy fit warna putih bersih yang jadi fondasi lemari kamu. Bahan cotton combed 30s ringan dan lembut, nyaman dipakai seharian.

Tinggal layer dengan kemeja atau jaket, outfit langsung jadi.', '/products/boxy-tee-white.svg', true
  from public.categories where slug = 't-shirt' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Putih', 'S', 5),
  ('Putih', 'M', 5),
  ('Putih', 'L', 5),
  ('Putih', 'XL', 5),
  ('Abu Muda', 'S', 5),
  ('Abu Muda', 'M', 5),
  ('Abu Muda', 'L', 5),
  ('Abu Muda', 'XL', 5)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Mono Graphic Tee', null, id, 'pria', 169000, null, 'Cotton combed 24s', 'Kaos dengan grafis tipografi minimalis di bagian dada. Warna abu tua yang kalem, gampang masuk ke outfit monokrom.', '/products/graphic-tee-grey.svg', false
  from public.categories where slug = 't-shirt' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Abu Tua', 'S', 0),
  ('Abu Tua', 'M', 0),
  ('Abu Tua', 'L', 0),
  ('Abu Tua', 'XL', 0)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Linen Relaxed Shirt', null, id, 'pria', 259000, null, 'Linen blend', 'Kemeja relaxed fit berbahan linen blend yang breathable. Teksturnya natural dan makin enak dipakai seiring waktu.

Bisa dipakai rapi dengan kancing tertutup atau santai sebagai outer di atas kaos.', '/products/linen-shirt-cream.svg', true
  from public.categories where slug = 'kemeja' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Krem', 'S', 4),
  ('Krem', 'M', 5),
  ('Krem', 'L', 5),
  ('Krem', 'XL', 4)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Cropped Poplin Shirt', null, id, 'wanita', 229000, null, 'Cotton poplin', 'Kemeja cropped berbahan cotton poplin yang crisp dan rapi. Panjangnya pas di pinggang, cocok dipadukan dengan celana high waist.', '/products/poplin-shirt-white.svg', false
  from public.categories where slug = 'kemeja' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Putih', 'S', 5),
  ('Putih', 'M', 5),
  ('Putih', 'L', 5)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Boxy Zip Hoodie', null, id, 'unisex', 329000, null, 'Cotton fleece 280 gsm', 'Hoodie zip dengan potongan boxy dan bahan cotton fleece 280 gsm yang hangat. Hoodnya double layer, jadi bentuknya tetap tegas.

Andalan buat ruangan ber-AC, perjalanan malam, atau layering santai.', '/products/zip-hoodie-black.svg', true
  from public.categories where slug = 'hoodie' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Hitam', 'S', 3),
  ('Hitam', 'M', 3),
  ('Hitam', 'L', 3),
  ('Hitam', 'XL', 3)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Soft Pullover Hoodie', null, id, 'wanita', 299000, 349000, 'Cotton fleece 260 gsm', 'Hoodie pullover dengan bahan fleece yang lembut di bagian dalam. Warna abu muda yang soft dan gampang dipadukan.', '/products/pullover-hoodie-grey.svg', false
  from public.categories where slug = 'hoodie' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Abu Muda', 'S', 1),
  ('Abu Muda', 'M', 2),
  ('Abu Muda', 'L', 1)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Minimalist Work Jacket', null, id, 'pria', 364000, null, 'Cotton canvas', 'Work jacket berbahan cotton canvas yang kokoh dengan detail kantong depan fungsional. Siluetnya clean, tanpa ornamen berlebihan.

Layer di atas kaos atau hoodie untuk tampilan yang effortless.', '/products/work-jacket-olive.svg', true
  from public.categories where slug = 'jacket' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Olive', 'S', 2),
  ('Olive', 'M', 3),
  ('Olive', 'L', 2),
  ('Olive', 'XL', 2)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Cropped Denim Jacket', null, id, 'wanita', 389000, null, 'Denim 12 oz', 'Jaket denim cropped dengan bahan 12 oz yang kokoh. Potongannya pendek sehingga proporsional dengan celana high waist atau rok.', '/products/denim-jacket-blue.svg', false
  from public.categories where slug = 'jacket' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Biru Denim', 'S', 2),
  ('Biru Denim', 'M', 3),
  ('Biru Denim', 'L', 2)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Cargo Pants Olive', null, id, 'unisex', 249000, null, 'Cotton twill', 'Celana cargo berbahan cotton twill dengan kantong samping yang fungsional. Potongan straight dan pinggang karet dengan tali, jadi nyaman dipakai seharian.', '/products/cargo-pants-olive.svg', true
  from public.categories where slug = 'celana' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Olive', 'S', 2),
  ('Olive', 'M', 3),
  ('Olive', 'L', 3),
  ('Olive', 'XL', 2),
  ('Hitam', 'S', 2),
  ('Hitam', 'M', 3),
  ('Hitam', 'L', 3),
  ('Hitam', 'XL', 2)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Urban Relaxed Chino', null, id, 'pria', 259000, null, 'Cotton stretch twill', 'Chino relaxed fit dengan sedikit stretch, jadi tetap leluasa saat bergerak. Warna krem netral yang cocok untuk tampilan kasual maupun semi formal.', '/products/chino-cream.svg', false
  from public.categories where slug = 'celana' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Krem', 'S', 3),
  ('Krem', 'M', 4),
  ('Krem', 'L', 4),
  ('Krem', 'XL', 3)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Wide Leg Trousers', null, id, 'wanita', 279000, null, 'Polyester rayon', 'Celana wide leg high waist dengan jatuh bahan yang flowy. Bikin kaki terlihat lebih jenjang dan tetap nyaman.', '/products/wide-trousers-black.svg', false
  from public.categories where slug = 'celana' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Hitam', 'S', 4),
  ('Hitam', 'M', 4),
  ('Hitam', 'L', 3)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Everyday Cap', null, id, 'unisex', 99000, null, 'Cotton twill', 'Topi baseball low profile dengan strap belakang yang bisa diatur. Finishing bordir kecil yang subtle.', '/products/cap-black.svg', false
  from public.categories where slug = 'topi' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Hitam', 'All Size', 15),
  ('Krem', 'All Size', 15)
) as v(color, size, stock);

with p as (
  insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description, image_url, is_featured)
  select 'Canvas Tote Bag', null, id, 'unisex', 119000, null, 'Canvas 16 oz', 'Tote bag kanvas tebal yang muat laptop 14 inci. Ada kantong dalam untuk barang kecil.', '/products/tote-natural.svg', false
  from public.categories where slug = 'aksesoris' and (select go from _seed_flag)
  on conflict do nothing
  returning id
)
insert into public.product_variants (product_id, color, size, stock)
select p.id, v.color, v.size, v.stock from p, (values
  ('Natural', 'All Size', 22)
) as v(color, size, stock);

commit;
