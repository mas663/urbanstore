-- ═════════════════════════════════════════════════════════════
-- UrbanStore · Migrasi 002 — Fitur engagement
--   1. Wishlist (produk favorit per customer)
--   2. Jumlah terjual per produk (bukti sosial "Terjual 12")
-- Cara pakai: Supabase Dashboard → SQL Editor → paste seluruh file → Run.
-- Aman dijalankan ulang (idempotent): pakai "if not exists" / "or replace".
-- ═════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. WISHLIST
-- ─────────────────────────────────────────────
-- Satu baris = satu produk yang disukai satu user.
-- Primary key gabungan (user_id, product_id) → produk yang sama tidak bisa disukai dua kali.
create table if not exists public.wishlist_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- RLS (Row Level Security): tanpa policy, tidak ada yang bisa membaca tabel ini.
-- Policy di bawah: user login hanya bisa melihat/menambah/menghapus baris MILIKNYA SENDIRI.
alter table public.wishlist_items enable row level security;

drop policy if exists "wishlist milik sendiri" on public.wishlist_items;
create policy "wishlist milik sendiri" on public.wishlist_items for all to authenticated
  using (user_id = auth.uid())          -- baris mana yang boleh dibaca/dihapus
  with check (user_id = auth.uid());    -- baris baru wajib atas nama dirinya sendiri

-- Anon (belum login) sengaja tidak diberi akses sama sekali.
grant select, insert, delete on public.wishlist_items to authenticated;

-- ─────────────────────────────────────────────
-- 2. JUMLAH TERJUAL
-- ─────────────────────────────────────────────
-- Tabel orders & order_items dilindungi RLS (customer hanya melihat pesanannya sendiri),
-- jadi pengunjung tidak bisa menghitungnya langsung. Fungsi SECURITY DEFINER ini berjalan
-- dengan hak pemilik fungsi, tapi HANYA mengembalikan angka agregat per produk
-- (tanpa nama pembeli, alamat, atau nomor order) → aman untuk publik.
create or replace function public.get_product_sales()
returns table (product_id bigint, sold int)
language sql stable security definer set search_path = public
as $$
  select oi.product_id, sum(oi.qty)::int as sold
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.status in ('lunas', 'dikirim', 'selesai')   -- hanya pesanan yang sudah dibayar
    and oi.product_id is not null
  group by oi.product_id;
$$;

grant execute on function public.get_product_sales() to anon, authenticated;
