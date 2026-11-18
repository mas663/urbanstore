-- ═══════════════════════════════════════════════════════════════════════════
-- UrbanStore — Skema Supabase (Postgres + Auth + Storage)
-- Jalankan sekali di: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Setelah itu jalankan supabase/seed.sql untuk data contoh.
--
-- Arsitektur: frontend memanggil Supabase langsung (publishable key).
-- Keamanan dijaga oleh Row Level Security (RLS) + fungsi SQL (RPC) untuk operasi
-- penting: checkout, upload bukti transfer, update status, simpan produk.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. PROFIL & ROLE (admin / customer)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Buat profil otomatis saat user mendaftar (role default: customer)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cegah customer menaikkan role-nya sendiri menjadi admin
create or replace function public.protect_profile()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin()
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Role tidak bisa diubah dari aplikasi.';
  end if;
  new.email := old.email; -- email dikelola oleh Supabase Auth
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- ─────────────────────────────────────────────
-- 2. KATALOG: kategori, size chart, produk, varian (warna × ukuran)
-- ─────────────────────────────────────────────
create table if not exists public.categories (
  id smallint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  size_type text not null default 'top' check (size_type in ('top', 'bottom', 'onesize'))
);

create table if not exists public.size_charts (
  size_type text not null,
  size text not null,
  data jsonb not null,      -- ukuran (cm) + estimasi tinggi/berat badan
  sort int not null,
  primary key (size_type, size)
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) >= 3),
  slug text not null unique,
  category_id smallint not null references public.categories (id),
  gender text not null check (gender in ('pria', 'wanita', 'unisex')),
  price integer not null check (price > 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price > price),
  material text not null default '',
  description text not null default '',
  image_url text not null default '',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_active_idx on public.products (is_active, gender, category_id);

-- Stok disimpan per varian (warna + ukuran)
create table if not exists public.product_variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  color text not null,
  size text not null,
  stock integer not null default 0 check (stock >= 0),
  unique (product_id, color, size)
);
create index if not exists variants_product_idx on public.product_variants (product_id);

create or replace function public.slugify(txt text)
returns text
language sql immutable
as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(lower(txt), '[^a-z0-9]+', '-', 'g')), ''), 'produk');
$$;

create or replace function public.products_before_write()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  n int := 1;
begin
  if tg_op = 'INSERT' and (new.slug is null or new.slug = '') then
    base := left(public.slugify(new.name), 80);
    candidate := base;
    while exists (select 1 from public.products where slug = candidate) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    new.slug := candidate;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists products_before_write on public.products;
create trigger products_before_write before insert or update on public.products
  for each row execute function public.products_before_write();

-- ─────────────────────────────────────────────
-- 3. KERANJANG (per customer login)
-- ─────────────────────────────────────────────
create table if not exists public.cart_items (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  variant_id bigint not null references public.product_variants (id) on delete cascade,
  qty int not null check (qty between 1 and 99),
  created_at timestamptz not null default now(),
  unique (user_id, variant_id)
);

-- Validasi stok setiap kali keranjang berubah
create or replace function public.check_cart_stock()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_stock int;
  v_active boolean;
begin
  select v.stock, p.is_active into v_stock, v_active
  from public.product_variants v join public.products p on p.id = v.product_id
  where v.id = new.variant_id;
  if not found or not v_active then
    raise exception 'Produk ini sudah tidak dijual.';
  end if;
  if v_stock = 0 then
    raise exception 'Yah, varian ini lagi habis.';
  end if;
  if new.qty > v_stock then
    raise exception 'Stok varian ini cuma tersisa % pcs.', v_stock;
  end if;
  return new;
end;
$$;

drop trigger if exists cart_stock_check on public.cart_items;
create trigger cart_stock_check before insert or update on public.cart_items
  for each row execute function public.check_cart_stock();

-- Tambah ke keranjang: kalau varian sudah ada, jumlahnya ditambahkan
create or replace function public.add_to_cart(p_variant_id bigint, p_qty int default 1)
returns void
language plpgsql security invoker set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Login dulu ya buat belanja.';
  end if;
  if p_qty is null or p_qty < 1 then
    raise exception 'Jumlah minimal 1 item.';
  end if;
  insert into public.cart_items (user_id, variant_id, qty)
  values (auth.uid(), p_variant_id, p_qty)
  on conflict (user_id, variant_id) do update set qty = public.cart_items.qty + excluded.qty;
end;
$$;

-- ─────────────────────────────────────────────
-- 4. PESANAN, ITEM, PEMBAYARAN, RIWAYAT STATUS
-- ─────────────────────────────────────────────
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  code text not null unique,                      -- URB-2026-001
  user_id uuid not null references auth.users (id),
  customer_name text not null,
  phone text not null,
  email text not null,
  province text not null,
  city text not null,
  district text not null,
  address text not null,
  postal_code text not null,
  notes text not null default '',
  shipping_method text not null check (shipping_method in ('regular', 'express')),
  shipping_cost integer not null,
  subtotal integer not null,
  total integer not null,
  status text not null default 'menunggu_pembayaran' check (status in (
    'menunggu_pembayaran', 'menunggu_verifikasi', 'lunas', 'dikirim', 'selesai', 'dibatalkan', 'kedaluwarsa'
  )),
  payment_deadline timestamptz not null,          -- batas bayar 1 jam setelah checkout
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  variant_id bigint references public.product_variants (id) on delete set null,
  product_name text not null,                     -- snapshot saat dibeli
  color text not null,
  size text not null,
  image_url text not null default '',
  price integer not null,                         -- snapshot harga
  qty integer not null check (qty >= 1)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.payments (
  order_id bigint primary key references public.orders (id) on delete cascade,
  method text not null default 'bank_transfer',
  status text not null default 'pending' check (status in ('pending', 'awaiting_verification', 'paid', 'cancelled')),
  amount integer not null,
  proof_path text,                                -- path file di Storage bucket payment-proofs
  proof_uploaded_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users (id)
);

create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  status text not null,
  note text not null default '',
  changed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists order_history_order_idx on public.order_status_history (order_id, created_at);

-- Kuota AI Shopping Assistant (hanya dikelola server dengan secret key)
create table if not exists public.chat_quota (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_start timestamptz not null,
  used int not null default 0
);

-- ─────────────────────────────────────────────
-- 5. FUNGSI BISNIS (RPC)
-- ─────────────────────────────────────────────

-- Pesanan yang lewat batas bayar 1 jam → kedaluwarsa & stok dikembalikan
create or replace function public.expire_overdue_orders()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from public.orders
    where status = 'menunggu_pembayaran' and payment_deadline < now()
    for update skip locked
  loop
    update public.product_variants v set stock = v.stock + oi.qty
    from public.order_items oi
    where oi.order_id = r.id and oi.variant_id = v.id;
    update public.orders set status = 'kedaluwarsa', updated_at = now() where id = r.id;
    update public.payments set status = 'cancelled' where order_id = r.id;
    insert into public.order_status_history (order_id, status, note)
    values (r.id, 'kedaluwarsa', 'Batas waktu pembayaran 1 jam habis');
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Checkout: validasi → cek & kunci stok → nomor order unik → snapshot item → kurangi stok → kosongkan keranjang
create or replace function public.place_order(
  p_name text, p_phone text, p_email text,
  p_province text, p_city text, p_district text,
  p_address text, p_postal_code text, p_notes text,
  p_shipping text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[\s\-().]', '', 'g');
  v_cost int;
  v_subtotal int := 0;
  v_year text := to_char(now() at time zone 'Asia/Jakarta', 'YYYY');
  v_seq int;
  v_code text;
  v_order bigint;
  r record;
begin
  if v_uid is null then
    raise exception 'Kamu perlu login dulu.';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and role = 'admin') then
    raise exception 'Akun admin tidak bisa checkout. Pakai akun customer ya.';
  end if;

  -- Validasi data pengiriman (pesan jelas & solutif)
  if v_phone like '+62%' then v_phone := '0' || substr(v_phone, 4);
  elsif v_phone like '62%' then v_phone := '0' || substr(v_phone, 3);
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Isi nama penerima minimal 2 huruf ya.';
  end if;
  if v_phone !~ '^08[0-9]{8,12}$' then
    raise exception 'Nomor WhatsApp belum valid. Contoh: 081234567890.';
  end if;
  if coalesce(p_email, '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then
    raise exception 'Format email belum bener. Contoh: kamu@email.com.';
  end if;
  if coalesce(trim(p_province), '') = '' or coalesce(trim(p_city), '') = '' or coalesce(trim(p_district), '') = '' then
    raise exception 'Pilih provinsi, kota/kabupaten, dan kecamatan dulu ya.';
  end if;
  if char_length(trim(coalesce(p_address, ''))) < 10 then
    raise exception 'Alamat terlalu singkat. Tulis jalan, nomor rumah, RT/RW, dan kelurahan.';
  end if;
  if coalesce(p_postal_code, '') !~ '^[0-9]{5}$' then
    raise exception 'Kode pos harus 5 digit angka.';
  end if;
  v_cost := case p_shipping when 'regular' then 15000 when 'express' then 30000 end;
  if v_cost is null then
    raise exception 'Pilih metode pengiriman dulu.';
  end if;

  perform public.expire_overdue_orders();

  if not exists (select 1 from public.cart_items where user_id = v_uid) then
    raise exception 'Keranjang kamu masih kosong.';
  end if;

  -- Kunci baris varian supaya tidak oversell saat checkout bersamaan
  for r in
    select ci.qty, v.stock, v.color, v.size, p.name, p.price, p.is_active
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    where ci.user_id = v_uid
    order by v.id
    for update of v
  loop
    if not r.is_active then
      raise exception '% sudah tidak dijual. Hapus dari keranjang dulu ya.', r.name;
    end if;
    if r.qty > r.stock then
      raise exception 'Stok % (% / %) tinggal % pcs. Sesuaikan keranjang dulu ya.', r.name, r.color, r.size, r.stock;
    end if;
    v_subtotal := v_subtotal + r.price * r.qty;   -- harga selalu dari database
  end loop;

  -- Nomor order unik per tahun: URB-2026-001
  perform pg_advisory_xact_lock(hashtext('urbanstore_order_code'));
  select coalesce(max(substring(code from 10)::int), 0) + 1 into v_seq
  from public.orders where code like 'URB-' || v_year || '-%';
  v_code := 'URB-' || v_year || '-' || lpad(v_seq::text, greatest(3, length(v_seq::text)), '0');

  insert into public.orders (
    code, user_id, customer_name, phone, email, province, city, district, address, postal_code, notes,
    shipping_method, shipping_cost, subtotal, total, payment_deadline
  ) values (
    v_code, v_uid, trim(p_name), v_phone, lower(trim(p_email)), trim(p_province), trim(p_city), trim(p_district),
    trim(p_address), p_postal_code, left(coalesce(trim(p_notes), ''), 300),
    p_shipping, v_cost, v_subtotal, v_subtotal + v_cost, now() + interval '1 hour'
  ) returning id into v_order;

  insert into public.order_items (order_id, product_id, variant_id, product_name, color, size, image_url, price, qty)
  select v_order, p.id, v.id, p.name, v.color, v.size, p.image_url, p.price, ci.qty
  from public.cart_items ci
  join public.product_variants v on v.id = ci.variant_id
  join public.products p on p.id = v.product_id
  where ci.user_id = v_uid;

  update public.product_variants v set stock = v.stock - ci.qty
  from public.cart_items ci
  where ci.variant_id = v.id and ci.user_id = v_uid;

  insert into public.payments (order_id, amount) values (v_order, v_subtotal + v_cost);
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order, 'menunggu_pembayaran', 'Order dibuat', v_uid);

  update public.profiles set phone = v_phone where id = v_uid and (phone is null or phone = '');
  delete from public.cart_items where user_id = v_uid;

  return jsonb_build_object('id', v_order, 'code', v_code);
end;
$$;

-- Customer upload bukti transfer → status menunggu verifikasi admin
create or replace function public.submit_payment_proof(p_code text, p_path text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders;
begin
  perform public.expire_overdue_orders();
  select * into v_order from public.orders where code = p_code and user_id = auth.uid() for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;
  if v_order.status = 'kedaluwarsa' then
    raise exception 'Batas waktu pembayaran sudah habis, pesanan dibatalkan otomatis.';
  end if;
  if v_order.status not in ('menunggu_pembayaran', 'menunggu_verifikasi') then
    raise exception 'Bukti transfer tidak bisa diunggah untuk status pesanan ini.';
  end if;
  if p_path is null or p_path not like auth.uid()::text || '/%' then
    raise exception 'File bukti transfer tidak valid.';
  end if;

  update public.payments
  set proof_path = p_path, proof_uploaded_at = now(), status = 'awaiting_verification'
  where order_id = v_order.id;
  update public.orders set status = 'menunggu_verifikasi', updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, 'menunggu_verifikasi', 'Customer mengunggah bukti transfer', auth.uid());
end;
$$;

-- Admin: konfirmasi lunas / tolak bukti / kirim / selesai / batalkan
create or replace function public.admin_update_order_status(p_order_id bigint, p_status text, p_note text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders;
  v_allowed text[];
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak.';
  end if;
  perform public.expire_overdue_orders();
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  v_allowed := case v_order.status
    when 'menunggu_pembayaran' then array['lunas', 'dibatalkan']
    when 'menunggu_verifikasi' then array['lunas', 'menunggu_pembayaran', 'dibatalkan']
    when 'lunas' then array['dikirim', 'dibatalkan']
    when 'dikirim' then array['selesai']
    else array[]::text[]
  end;
  if not (p_status = any (v_allowed)) then
    raise exception 'Status pesanan tidak bisa diubah dari "%" ke "%".', v_order.status, p_status;
  end if;

  if p_status = 'dibatalkan' then
    update public.product_variants v set stock = v.stock + oi.qty
    from public.order_items oi
    where oi.order_id = v_order.id and oi.variant_id = v.id;
    update public.payments set status = 'cancelled' where order_id = v_order.id;
  elsif p_status = 'lunas' then
    update public.payments set status = 'paid', verified_at = now(), verified_by = auth.uid() where order_id = v_order.id;
  elsif p_status = 'menunggu_pembayaran' then
    -- Bukti ditolak: customer diberi waktu 1 jam lagi untuk upload ulang
    update public.payments set status = 'pending' where order_id = v_order.id;
    update public.orders set payment_deadline = now() + interval '1 hour' where id = v_order.id;
  end if;

  update public.orders set status = p_status, updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (v_order.id, p_status, coalesce(nullif(trim(p_note), ''), case p_status
    when 'lunas' then 'Pembayaran dikonfirmasi admin'
    when 'menunggu_pembayaran' then 'Bukti transfer ditolak, silakan upload ulang'
    when 'dikirim' then 'Pesanan dikirim'
    when 'selesai' then 'Pesanan selesai'
    when 'dibatalkan' then 'Pesanan dibatalkan admin'
    else '' end), auth.uid());
end;
$$;

-- Admin: simpan produk + seluruh varian dalam satu transaksi
create or replace function public.admin_save_product(p_id bigint, p_product jsonb, p_variants jsonb)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_id bigint := p_id;
  v_name text := trim(coalesce(p_product ->> 'name', ''));
  v_price int := nullif(p_product ->> 'price', '')::int;
  v_compare int := nullif(p_product ->> 'compare_at_price', '')::int;
  v_category smallint := nullif(p_product ->> 'category_id', '')::smallint;
  v_gender text := p_product ->> 'gender';
  v_size_type text;
  v_item jsonb;
  v_keep bigint[] := array[]::bigint[];
  v_vid bigint;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak.';
  end if;
  if char_length(v_name) < 3 then raise exception 'Nama produk wajib diisi (min. 3 karakter).'; end if;
  select size_type into v_size_type from public.categories where id = v_category;
  if not found then raise exception 'Pilih kategori produk.'; end if;
  if v_gender not in ('pria', 'wanita', 'unisex') then raise exception 'Pilih gender: Pria, Wanita, atau Unisex.'; end if;
  if v_price is null or v_price <= 0 then raise exception 'Harga wajib diisi dan harus lebih dari 0.'; end if;
  if v_compare is not null and v_compare <= v_price then
    raise exception 'Harga coret harus lebih besar dari harga jual (kosongkan jika tidak diskon).';
  end if;
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) = 0 then
    raise exception 'Tambahkan minimal 1 varian (warna + ukuran).';
  end if;

  if v_id is null then
    insert into public.products (name, slug, category_id, gender, price, compare_at_price, material, description,
                                 image_url, is_featured, is_active)
    values (v_name, null, v_category, v_gender, v_price, v_compare,
            coalesce(p_product ->> 'material', ''), coalesce(p_product ->> 'description', ''),
            coalesce(nullif(p_product ->> 'image_url', ''), '/products/placeholder.svg'),
            coalesce((p_product ->> 'is_featured')::boolean, false), coalesce((p_product ->> 'is_active')::boolean, true))
    returning id into v_id;
  else
    update public.products set
      name = v_name, category_id = v_category, gender = v_gender, price = v_price, compare_at_price = v_compare,
      material = coalesce(p_product ->> 'material', ''), description = coalesce(p_product ->> 'description', ''),
      image_url = coalesce(nullif(p_product ->> 'image_url', ''), '/products/placeholder.svg'),
      is_featured = coalesce((p_product ->> 'is_featured')::boolean, false),
      is_active = coalesce((p_product ->> 'is_active')::boolean, true)
    where id = v_id;
    if not found then raise exception 'Produk tidak ditemukan.'; end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_variants) loop
    if coalesce(trim(v_item ->> 'color'), '') = '' then raise exception 'Setiap varian wajib punya warna.'; end if;
    if not exists (select 1 from public.size_charts where size_type = v_size_type and size = v_item ->> 'size') then
      raise exception 'Ukuran "%" tidak cocok dengan kategori ini.', v_item ->> 'size';
    end if;
    if (v_item ->> 'stock') is null or (v_item ->> 'stock')::int < 0 then
      raise exception 'Stok varian % / % harus angka 0 atau lebih.', v_item ->> 'color', v_item ->> 'size';
    end if;
    insert into public.product_variants (product_id, color, size, stock)
    values (v_id, trim(v_item ->> 'color'), v_item ->> 'size', (v_item ->> 'stock')::int)
    on conflict (product_id, color, size) do update set stock = excluded.stock
    returning id into v_vid;
    v_keep := v_keep || v_vid;
  end loop;

  delete from public.product_variants where product_id = v_id and not (id = any (v_keep));
  return v_id;
end;
$$;

-- Metrik penjualan teragregasi (dashboard admin & bahan AI Analisis Penjualan)
create or replace function public.get_sales_metrics()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  paid text[] := array['lunas', 'dikirim', 'selesai'];
  dead text[] := array['dibatalkan', 'kedaluwarsa'];
  res jsonb;
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak.';
  end if;

  select jsonb_build_object(
    'orders', (
      select jsonb_build_object(
        'total', count(*) filter (where not status = any (dead)),
        'confirmed', count(*) filter (where status = any (paid)),
        'cancelled', count(*) filter (where status = any (dead)),
        'awaitingPayment', count(*) filter (where status = 'menunggu_pembayaran'),
        'awaitingVerification', count(*) filter (where status = 'menunggu_verifikasi')
      ) from public.orders),
    'revenue', (
      select jsonb_build_object(
        'confirmed', coalesce(sum(total) filter (where status = any (paid)), 0),
        'pending', coalesce(sum(total) filter (where status in ('menunggu_pembayaran', 'menunggu_verifikasi')), 0),
        'avgOrderValue', coalesce(round(avg(total) filter (where status = any (paid))), 0)
      ) from public.orders),
    'last30Days', (
      select jsonb_build_object(
        'orders', count(*),
        'confirmedRevenue', coalesce(sum(total) filter (where status = any (paid)), 0)
      ) from public.orders where not status = any (dead) and created_at >= now() - interval '30 days'),
    'topProducts', coalesce((
      select jsonb_agg(t) from (
        select oi.product_name as name, sum(oi.qty)::int as qty, sum(oi.qty * oi.price)::int as revenue
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where not o.status = any (dead)
        group by oi.product_name order by qty desc, revenue desc limit 5) t), '[]'::jsonb),
    'byCategory', coalesce((
      select jsonb_agg(t) from (
        select coalesce(c.name, 'Lainnya') as category, sum(oi.qty)::int as qty, sum(oi.qty * oi.price)::int as revenue
        from public.order_items oi join public.orders o on o.id = oi.order_id
        left join public.products p on p.id = oi.product_id
        left join public.categories c on c.id = p.category_id
        where not o.status = any (dead)
        group by 1 order by revenue desc) t), '[]'::jsonb),
    'bySize', coalesce((
      select jsonb_agg(t) from (
        select oi.size, sum(oi.qty)::int as qty
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where not o.status = any (dead) group by oi.size order by qty desc) t), '[]'::jsonb),
    'byColor', coalesce((
      select jsonb_agg(t) from (
        select oi.color, sum(oi.qty)::int as qty
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where not o.status = any (dead) group by oi.color order by qty desc limit 8) t), '[]'::jsonb),
    'byShipping', coalesce((
      select jsonb_agg(t) from (
        select shipping_method as method, count(*)::int as orders
        from public.orders where not status = any (dead) group by 1) t), '[]'::jsonb),
    'lowStock', coalesce((
      select jsonb_agg(t) from (
        select p.name, v.color, v.size, v.stock
        from public.product_variants v join public.products p on p.id = v.product_id
        where p.is_active and v.stock <= 3 order by v.stock, p.name limit 10) t), '[]'::jsonb),
    'noSales', coalesce((
      select jsonb_agg(t) from (
        select p.name, (select coalesce(sum(stock), 0)::int from public.product_variants where product_id = p.id) as stock
        from public.products p
        where p.is_active and not exists (
          select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
          where oi.product_id = p.id and not o.status = any (dead))
        order by stock desc limit 8) t), '[]'::jsonb),
    'catalog', (
      select jsonb_build_object('activeProducts', count(*), 'avgPrice', coalesce(round(avg(price)), 0))
      from public.products where is_active)
  ) into res;
  return res;
end;
$$;

-- ─────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.size_charts enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.chat_quota enable row level security;   -- tanpa policy: hanya server (secret key)

drop policy if exists "profil sendiri atau admin" on public.profiles;
create policy "profil sendiri atau admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "ubah profil sendiri" on public.profiles;
create policy "ubah profil sendiri" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "kategori publik" on public.categories;
create policy "kategori publik" on public.categories for select to anon, authenticated using (true);
drop policy if exists "kategori dikelola admin" on public.categories;
create policy "kategori dikelola admin" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "size chart publik" on public.size_charts;
create policy "size chart publik" on public.size_charts for select to anon, authenticated using (true);

drop policy if exists "produk aktif publik" on public.products;
create policy "produk aktif publik" on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
drop policy if exists "produk dikelola admin" on public.products;
create policy "produk dikelola admin" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "varian publik" on public.product_variants;
create policy "varian publik" on public.product_variants for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.is_admin())));
drop policy if exists "varian dikelola admin" on public.product_variants;
create policy "varian dikelola admin" on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "keranjang milik sendiri" on public.cart_items;
create policy "keranjang milik sendiri" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pesanan hanya bisa DIBUAT/DIUBAH lewat fungsi place_order & admin_update_order_status
drop policy if exists "pesanan sendiri atau admin" on public.orders;
create policy "pesanan sendiri atau admin" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "item pesanan sendiri atau admin" on public.order_items;
create policy "item pesanan sendiri atau admin" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

drop policy if exists "pembayaran sendiri atau admin" on public.payments;
create policy "pembayaran sendiri atau admin" on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

drop policy if exists "riwayat sendiri atau admin" on public.order_status_history;
create policy "riwayat sendiri atau admin" on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- Hak akses tabel (RLS di atas tetap membatasi baris yang boleh diakses)
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.size_charts, public.products, public.product_variants to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant select on public.orders, public.order_items, public.payments, public.order_status_history to authenticated;
grant select, update on public.profiles to authenticated;
revoke all on public.chat_quota from anon, authenticated;

revoke execute on function public.place_order(text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.submit_payment_proof(text, text) from public, anon;
revoke execute on function public.admin_update_order_status(bigint, text, text) from public, anon;
revoke execute on function public.admin_save_product(bigint, jsonb, jsonb) from public, anon;
revoke execute on function public.get_sales_metrics() from public, anon;
revoke execute on function public.add_to_cart(bigint, int) from public, anon;
revoke execute on function public.expire_overdue_orders() from public, anon;
grant execute on function public.place_order(text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_payment_proof(text, text) to authenticated;
grant execute on function public.admin_update_order_status(bigint, text, text) to authenticated;
grant execute on function public.admin_save_product(bigint, jsonb, jsonb) to authenticated;
grant execute on function public.get_sales_metrics() to authenticated;
grant execute on function public.add_to_cart(bigint, int) to authenticated;
grant execute on function public.expire_overdue_orders() to authenticated;

-- ─────────────────────────────────────────────
-- 7. STORAGE: bukti transfer (privat) & foto produk (publik)
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Customer hanya bisa upload/lihat bukti di folder miliknya ({user_id}/...), admin bisa lihat semua
drop policy if exists "upload bukti sendiri" on storage.objects;
create policy "upload bukti sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "lihat bukti sendiri atau admin" on storage.objects;
create policy "lihat bukti sendiri atau admin" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "admin upload foto produk" on storage.objects;
create policy "admin upload foto produk" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin ubah foto produk" on storage.objects;
create policy "admin ubah foto produk" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin hapus foto produk" on storage.objects;
create policy "admin hapus foto produk" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ─────────────────────────────────────────────
-- 8. (Opsional) Jalankan kedaluwarsa otomatis tiap menit dengan pg_cron
--    Tanpa ini pun pesanan tetap kedaluwarsa saat ada aktivitas checkout/admin.
-- ─────────────────────────────────────────────
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('urbanstore-expire-orders')
  where exists (select 1 from cron.job where jobname = 'urbanstore-expire-orders');
  perform cron.schedule('urbanstore-expire-orders', '* * * * *', 'select public.expire_overdue_orders()');
exception when others then
  raise notice 'pg_cron tidak tersedia, lewati penjadwalan otomatis: %', sqlerrm;
end;
$$;

-- ─────────────────────────────────────────────
-- 9. KUOTA AI SHOPPING ASSISTANT (Sesi 5): maks N pesan per customer per jendela waktu.
--    Hanya bisa dipanggil server dengan SUPABASE_SECRET_KEY (role service_role),
--    sehingga kuota tidak bisa dimanipulasi dari browser.
-- ─────────────────────────────────────────────
create or replace function public.consume_chat_quota(p_user uuid, p_limit int, p_window_seconds int)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  q public.chat_quota;
  v_now timestamptz := now();
begin
  insert into public.chat_quota (user_id, window_start, used) values (p_user, v_now, 0)
  on conflict (user_id) do nothing;
  select * into q from public.chat_quota where user_id = p_user for update;
  if v_now - q.window_start >= make_interval(secs => p_window_seconds) then
    q.window_start := v_now;
    q.used := 0;
  end if;
  if q.used >= p_limit then
    return jsonb_build_object('ok', false, 'limit', p_limit, 'used', q.used, 'remaining', 0,
      'resetAt', q.window_start + make_interval(secs => p_window_seconds));
  end if;
  update public.chat_quota set window_start = q.window_start, used = q.used + 1 where user_id = p_user;
  return jsonb_build_object('ok', true, 'limit', p_limit, 'used', q.used + 1, 'remaining', p_limit - q.used - 1,
    'resetAt', q.window_start + make_interval(secs => p_window_seconds));
end;
$$;

create or replace function public.get_chat_quota(p_user uuid, p_limit int, p_window_seconds int)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select case
    when q.user_id is null or now() - q.window_start >= make_interval(secs => p_window_seconds)
      then jsonb_build_object('limit', p_limit, 'used', 0, 'remaining', p_limit, 'resetAt', null)
    else jsonb_build_object('limit', p_limit, 'used', q.used, 'remaining', greatest(p_limit - q.used, 0),
      'resetAt', q.window_start + make_interval(secs => p_window_seconds))
  end
  from (select 1) d left join public.chat_quota q on q.user_id = p_user;
$$;

-- Kembalikan 1 kuota jika AI gagal menjawab (tombol Retry tidak menghabiskan kuota)
create or replace function public.refund_chat_quota(p_user uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.chat_quota set used = greatest(used - 1, 0) where user_id = p_user;
$$;

revoke execute on function public.consume_chat_quota(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.get_chat_quota(uuid, int, int) from public, anon, authenticated;
revoke execute on function public.refund_chat_quota(uuid) from public, anon, authenticated;
grant execute on function public.consume_chat_quota(uuid, int, int) to service_role;
grant execute on function public.get_chat_quota(uuid, int, int) to service_role;
grant execute on function public.refund_chat_quota(uuid) to service_role;
