import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
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
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setProducts(null);
    setError(null);
    const qs = new URLSearchParams(Object.entries({ gender, category, sort, q }).filter(([, v]) => v));
    api(`/products?${qs}`, { signal: ctrl.signal })
      .then((d) => setProducts(d.products))
      .catch((e) => e.name !== 'AbortError' && setError(e.message));
    return () => ctrl.abort();
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
    <div className="container-x py-10 lg:py-14">
      <div className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Katalog Kurasi</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {title}{activeCat && <span className="text-mute"> / {activeCat.name}</span>}
          </h1>
        </div>
        <label className="relative block w-full lg:w-80">
          <span className="sr-only">Cari produk</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute" size={18} />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tee, hoodie, cargo…" className="input pl-11" />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2" role="group" aria-label="Filter gender">
            {GENDERS.map((g) => (
              <button key={g.value} className={`chip ${gender === g.value ? 'chip-active' : ''}`}
                aria-pressed={gender === g.value} onClick={() => setParam('gender', g.value)}>
                {g.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-mute">Urutkan</span>
            <select value={sort} onChange={(e) => setParam('sort', e.target.value)}
              className="h-9 border border-line bg-paper px-3 text-sm focus:border-ink focus:outline-none">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter kategori">
          <button className={`chip ${!category ? 'chip-active' : ''}`} onClick={() => setParam('category', '')}>Semua jenis</button>
          {categories.map((c) => (
            <button key={c.slug} className={`chip ${category === c.slug ? 'chip-active' : ''}`}
              aria-pressed={category === c.slug} onClick={() => setParam('category', c.slug)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-8 text-sm text-mute" aria-live="polite">
        {products ? `${products.length} produk${q ? ` untuk "${q}"` : ''}` : 'Memuat produk…'}
      </p>

      <div className="mt-4">
        {error ? (
          <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
        ) : products && products.length === 0 ? (
          <EmptyState title="Belum nemu yang cocok"
            text="Coba kata kunci lain atau hapus beberapa filter."
            action={<button className="btn-outline" onClick={() => setParams({})}>Reset filter</button>} />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
            {products ? products.map((p) => <ProductCard key={p.id} product={p} />) : <ProductGridSkeleton />}
          </div>
        )}
      </div>
    </div>
  );
}
