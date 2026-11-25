import { useEffect, useState } from 'react';
import { fetchProductsIn } from '../lib/catalog.js';
import { getRecentlyViewed } from '../lib/recentlyViewed.js';
import { ProductCard } from './ui.jsx';

/* Deretan "Terakhir kamu lihat". Tidak menampilkan apa-apa kalau riwayatnya kosong,
   jadi aman dipasang di halaman mana pun. `exclude` = slug produk yang sedang dibuka. */
export default function RecentlyViewed({ exclude, title = 'Terakhir kamu lihat', className = '' }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true; // cegah setState setelah komponen ditutup (mis. user pindah halaman cepat)
    const slugs = getRecentlyViewed().filter((s) => s !== exclude).slice(0, 4);
    fetchProductsIn('slug', slugs)
      .then((list) => active && setItems(list))
      .catch(() => active && setItems([]));
    return () => { active = false; };
  }, [exclude]);

  if (items.length === 0) return null;

  return (
    <section className={className} aria-labelledby="recently-viewed-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Riwayat</p>
          <h2 id="recently-viewed-title" className="display mt-3 text-[clamp(1.8rem,4vw,3rem)]">{title}</h2>
        </div>
        <p className="hidden font-mono text-[11px] uppercase tracking-[0.1em] text-mute sm:block">Tersimpan di browser ini</p>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}
