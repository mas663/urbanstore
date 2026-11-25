-- ═════════════════════════════════════════════════════════════
-- UrbanStore · Migrasi 003 — Payment Gateway Mayar.id (Sesi 6)
-- Alur: checkout → server membuat invoice Mayar → customer bayar (QRIS/VA/e-wallet)
--       → webhook Mayar → server MEMVERIFIKASI ULANG ke API Mayar → pesanan otomatis "lunas".
-- Cara pakai: Supabase Dashboard → SQL Editor → paste seluruh file → Run. Aman dijalankan ulang.
-- ═════════════════════════════════════════════════════════════

-- 1. Kolom data Mayar di tabel payments (satu pesanan = satu baris payments)
alter table public.payments add column if not exists mayar_invoice_id text;
alter table public.payments add column if not exists mayar_transaction_id text;
alter table public.payments add column if not exists mayar_link text;          -- URL halaman bayar Mayar
alter table public.payments add column if not exists mayar_expired_at timestamptz;
alter table public.payments add column if not exists paid_via text;            -- 'mayar' | 'manual'

-- Satu invoice Mayar hanya boleh terhubung ke satu pesanan
create unique index if not exists payments_mayar_invoice_idx on public.payments (mayar_invoice_id) where mayar_invoice_id is not null;
create index if not exists payments_mayar_trx_idx on public.payments (mayar_transaction_id) where mayar_transaction_id is not null;

-- ─────────────────────────────────────────────
-- 2. Simpan invoice Mayar yang baru dibuat server
-- ─────────────────────────────────────────────
create or replace function public.mayar_attach_invoice(
  p_order_id bigint, p_invoice_id text, p_transaction_id text, p_link text, p_expired_at timestamptz
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.payments
  set method = 'mayar', mayar_invoice_id = p_invoice_id, mayar_transaction_id = p_transaction_id,
      mayar_link = p_link, mayar_expired_at = p_expired_at
  where order_id = p_order_id;
  if not found then
    raise exception 'Data pembayaran pesanan tidak ditemukan.';
  end if;
end;
$$;

-- ─────────────────────────────────────────────
-- 3. Tandai lunas setelah server memverifikasi status "paid" langsung ke API Mayar
--    Hasil: 'paid' | 'paid_late' | 'already_paid' | 'needs_review' | 'amount_mismatch' | 'not_found'
-- ─────────────────────────────────────────────
create or replace function public.mayar_mark_paid(p_invoice_id text, p_amount integer)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders;
  v_short int;
begin
  select o.* into v_order
  from public.orders o join public.payments p on p.order_id = o.id
  where p.mayar_invoice_id = p_invoice_id
  for update of o;                       -- kunci baris: webhook ganda tidak diproses dua kali bersamaan
  if not found then
    return 'not_found';
  end if;

  -- Nominal yang dibayar wajib sama persis dengan total pesanan
  if p_amount is distinct from v_order.total then
    insert into public.order_status_history (order_id, status, note)
    values (v_order.id, v_order.status, format('Mayar melaporkan pembayaran Rp%s, tidak sama dengan total pesanan. Perlu dicek admin.', p_amount));
    return 'amount_mismatch';
  end if;

  if v_order.status in ('lunas', 'dikirim', 'selesai') then
    return 'already_paid';               -- idempotent: webhook yang dikirim ulang tidak mengubah apa-apa
  end if;

  if v_order.status in ('kedaluwarsa', 'dibatalkan') then
    -- Dibayar setelah pesanan kedaluwarsa (stok sudah dikembalikan) → coba pesan ulang stoknya
    select count(*) into v_short
    from public.order_items oi join public.product_variants v on v.id = oi.variant_id
    where oi.order_id = v_order.id and v.stock < oi.qty;
    if v_short > 0 or exists (select 1 from public.order_items where order_id = v_order.id and variant_id is null) then
      insert into public.order_status_history (order_id, status, note)
      values (v_order.id, v_order.status, 'Pembayaran Mayar diterima setelah pesanan ditutup, tapi stok sudah tidak cukup. Perlu refund manual oleh admin.');
      update public.payments set status = 'paid', paid_via = 'mayar', verified_at = now() where order_id = v_order.id;
      return 'needs_review';
    end if;
    update public.product_variants v set stock = v.stock - oi.qty
    from public.order_items oi
    where oi.order_id = v_order.id and oi.variant_id = v.id;
  end if;

  update public.payments set status = 'paid', paid_via = 'mayar', verified_at = now() where order_id = v_order.id;
  update public.orders set status = 'lunas', updated_at = now() where id = v_order.id;
  insert into public.order_status_history (order_id, status, note)
  values (v_order.id, 'lunas', case
    when v_order.status in ('kedaluwarsa', 'dibatalkan') then 'Pembayaran diterima otomatis via Mayar (setelah batas waktu, stok dipesan ulang)'
    else 'Pembayaran diterima otomatis via Mayar' end);
  return case when v_order.status in ('kedaluwarsa', 'dibatalkan') then 'paid_late' else 'paid' end;
end;
$$;

-- Hanya server (secret key / service_role) yang boleh memanggil kedua fungsi ini.
-- Browser (anon/authenticated) TIDAK bisa menandai pesanannya sendiri sebagai lunas.
revoke execute on function public.mayar_attach_invoice(bigint, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.mayar_mark_paid(text, integer) from public, anon, authenticated;
grant execute on function public.mayar_attach_invoice(bigint, text, text, text, timestamptz) to service_role;
grant execute on function public.mayar_mark_paid(text, integer) to service_role;
