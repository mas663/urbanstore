import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCategories, fetchProducts } from '../lib/catalog.js';
import { SearchIcon } from '../components/icons.jsx';
import { EmptyState, ErrorState, ProductCard, ProductGridSkeleton } from '../components/ui.jsx';

const GENDERS = [
  { value: '', label: 'Semua' },
  { value: 'pria', label: 'Pria' },
  { value: 'wanita', label: 'Wanita' },
];
const SORTS = [
  { value: '', label: 'Rekomendasi' },
  { value: 'newest', label: 'Terbaru' },
  { value: 'price_asc', label: 'Harga termurah' },
  { value: 'price_desc', label: 'Harga termahal' },
];

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const gender = params.get('gender') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';
  const q = params.get('q') || '';

  const [search, setSearch] = useState(q);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setProducts(null);
    setError(null);
    fetchProducts({ gender, category, sort, q })
      .then((list) => active && setProducts(list))
      .catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, [gender, category, sort, q, reload]);

  // Debounce pencarian supaya tidak request di setiap ketikan
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => setParam('q', search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key === 'q' });
  }

  const title = gender === 'pria' ? 'Koleksi Pria' : gender === 'wanita' ? 'Koleksi Wanita' : 'Semua Koleksi';
  const activeCat = categories.find((c) => c.slug === category);

  return (
    <div>
      <section className="border-b border-ink">
        <div className="container-x pb-8 pt-10 lg:pb-12 lg:pt-16">
          <p className="eyebrow">Katalog kurasi{activeCat ? ` · ${activeCat.name}` : ''}</p>
          <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="display text-[clamp(2.6rem,8vw,7rem)]">
              {title}
              <sup className="ml-3 align-top font-mono text-sm font-medium tracking-normal text-mute sm:text-base">
                {products ? String(products.length).padStart(2, '0') : '··'}
              </sup>
            </h1>
            <label className="relative block w-full lg:w-96">
              <span className="sr-only">Cari produk</span>
              <SearchIcon className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-ink" size={20} />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari tee, hoodie, cargo…"
                className="h-14 w-full border-0 border-b-2 border-ink bg-transparent pl-9 text-lg placeholder:text-mute/60 focus:border-lemon focus:outline-none" />
            </label>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-line bg-paper/92 backdrop-blur-md">
        <div className="container-x flex items-center gap-3 py-3">
          <div className="flex shrink-0 border border-ink" role="group" aria-label="Filter gender">
            {GENDERS.map((g) => (
              <button key={g.value} aria-pressed={gender === g.value} onClick={() => setParam('gender', g.value)}
                className={`h-9 px-3.5 text-sm font-medium transition-colors sm:px-4 ${gender === g.value ? 'bg-ink text-paper' : 'hover:bg-lemon'}`}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto" role="group" aria-label="Filter kategori">
            <button className={`chip ${!category ? 'chip-active' : ''}`} onClick={() => setParam('category', '')}>Semua jenis</button>
            {categories.map((c) => (
              <button key={c.slug} className={`chip ${category === c.slug ? 'chip-active' : ''}`}
                aria-pressed={category === c.slug} onClick={() => setParam('category', c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
          <label className="hidden shrink-0 items-center gap-2 text-sm md:flex">
            <span className="eyebrow">Urutkan</span>
            <select value={sort} onChange={(e) => setParam('sort', e.target.value)}
              className="h-9 border border-line bg-paper px-3 text-sm focus:border-ink focus:outline-none">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="container-x">
        <div className="flex items-center justify-between gap-3 py-6">
          <p className="font-mono text-xs uppercase tracking-[0.1em] text-mute" aria-live="polite">
            {products ? `${products.length} produk${q ? ` untuk "${q}"` : ''}` : 'Memuat produk…'}
          </p>
          <select value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Urutkan"
            className="h-9 border border-line bg-paper px-3 text-sm focus:border-ink focus:outline-none md:hidden">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
        ) : products && products.length === 0 ? (
          <EmptyState title="Belum nemu yang cocok"
            text="Coba kata kunci lain atau hapus beberapa filter."
            action={<button className="btn-outline" onClick={() => setParams({})}>Reset filter</button>} />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
            {products ? products.map((p, i) => <ProductCard key={p.id} product={p} index={i + 1} priority={i < 4} />) : <ProductGridSkeleton />}
          </div>
        )}
      </div>
    </div>
  );
}
