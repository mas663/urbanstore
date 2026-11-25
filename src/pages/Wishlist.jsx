import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AppContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { fetchProductsIn } from '../lib/catalog.js';
import { EmptyState, ErrorState, ProductCard, ProductGridSkeleton } from '../components/ui.jsx';
import RecentlyViewed from '../components/RecentlyViewed.jsx';

/* Halaman /favorit — daftar produk yang disukai customer. */
export default function Wishlist() {
  const { user, ready } = useAuth();
  const { ids } = useWishlist();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);

  // Kunci string dari isi Set → efek hanya jalan ulang kalau daftar id benar-benar berubah
  const idsKey = [...ids].sort().join(',');

  useEffect(() => {
    if (!user) return;
    let active = true;
    setError(null);
    fetchProductsIn('id', idsKey ? idsKey.split(',').map(Number) : [])
      .then((list) => active && setProducts(list))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, [user, idsKey]);

  // Saat hati dilepas, produk langsung hilang dari daftar tanpa menunggu server
  const visible = useMemo(() => (products || []).filter((p) => ids.has(p.id)), [products, ids]);

  return (
    <div className="container-x pt-10 lg:pt-16">
      <p className="eyebrow">Akun · Favorit</p>
      <h1 className="display mt-4 text-[clamp(2.6rem,8vw,6rem)]">
        Favorit
        {user && products && (
          <sup className="ml-3 align-top font-mono text-sm font-medium tracking-normal text-mute sm:text-base">
            {String(visible.length).padStart(2, '0')}
          </sup>
        )}
      </h1>

      <div className="mt-10 border-t border-ink pt-8">
        {!ready ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><ProductGridSkeleton count={4} /></div>
        ) : !user ? (
          <EmptyState title="Login untuk lihat favoritmu"
            text="Simpan produk yang kamu incar dengan ikon hati, lalu buka lagi kapan saja dari perangkat mana pun."
            action={<Link to="/login?next=%2Ffavorit" className="btn-primary">Masuk</Link>} />
        ) : error ? (
          <ErrorState message={error} />
        ) : products === null ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><ProductGridSkeleton count={4} /></div>
        ) : visible.length === 0 ? (
          <EmptyState title="Belum ada favorit"
            text="Tekan ikon hati di produk yang kamu suka, nanti semuanya terkumpul di sini."
            action={<Link to="/koleksi" className="btn-primary">Jelajahi koleksi</Link>} />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      <RecentlyViewed className="mt-24 border-t border-ink pt-10" />
    </div>
  );
}
