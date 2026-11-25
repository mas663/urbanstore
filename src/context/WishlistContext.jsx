import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { run, supabase } from '../lib/supabase.js';
import { useAuth, useToast } from './AppContext.jsx';

/* Wishlist (produk favorit) — disimpan di tabel Supabase `wishlist_items` (migrasi 002).

   Kenapa pakai Context?
   Ikon hati muncul di banyak tempat (kartu produk di beranda, katalog, detail, header).
   Context menyimpan daftar favorit SEKALI di atas, lalu komponen mana pun bisa membacanya
   lewat hook useWishlist() tanpa harus mengoper props dari atas ke bawah. */

const WishlistCtx = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  // Set = kumpulan id unik; cek "sudah disukai?" cukup ids.has(id) (cepat)
  const [ids, setIds] = useState(() => new Set());

  const isCustomer = user?.role === 'customer';

  // Muat ulang setiap kali user berganti (login / logout)
  useEffect(() => {
    if (!isCustomer) return setIds(new Set());
    run(supabase.from('wishlist_items').select('product_id').order('created_at', { ascending: false }))
      .then((rows) => setIds(new Set(rows.map((r) => Number(r.product_id)))))
      .catch(() => setIds(new Set())); // tabel belum ada (migrasi 002 belum dijalankan) → kosong saja
  }, [isCustomer, user?.id]);

  const toggle = useCallback(async (product) => {
    // Belum login → arahkan ke login, lalu kembali ke halaman ini
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (!isCustomer) {
      toast('Wishlist khusus untuk akun customer.', 'error');
      return;
    }

    const id = product.id;
    const wasLiked = ids.has(id);

    // Optimistic update: ubah tampilan DULU supaya terasa instan,
    // kalau server gagal → kembalikan seperti semula.
    const flip = (like) => setIds((prev) => {
      const next = new Set(prev);
      like ? next.add(id) : next.delete(id);
      return next;
    });
    flip(!wasLiked);

    try {
      if (wasLiked) {
        await run(supabase.from('wishlist_items').delete().eq('product_id', id));
      } else {
        // user_id otomatis diisi auth.uid() oleh database (lihat default kolom di migrasi 002)
        await run(supabase.from('wishlist_items').insert({ product_id: id }));
        toast(`${product.name} disimpan ke Favorit`);
      }
    } catch (err) {
      flip(wasLiked); // batalkan perubahan tampilan
      // Tabel belum dibuat di Supabase → beri petunjuk yang jelas, bukan pesan teknis
      const missing = /wishlist_items|schema cache|does not exist/i.test(err.message || '');
      toast(missing ? 'Fitur favorit belum aktif: jalankan supabase/migrations/002_engagement.sql di Supabase.' : err.message || 'Gagal menyimpan favorit.', 'error');
    }
  }, [user, isCustomer, ids, navigate, location, toast]);

  // useMemo: objek value hanya dibuat ulang kalau isinya berubah → komponen tidak re-render sia-sia
  const value = useMemo(() => ({
    ids,
    count: ids.size,
    has: (id) => ids.has(id),
    toggle,
  }), [ids, toggle]);

  return <WishlistCtx.Provider value={value}>{children}</WishlistCtx.Provider>;
}

export const useWishlist = () => useContext(WishlistCtx);
