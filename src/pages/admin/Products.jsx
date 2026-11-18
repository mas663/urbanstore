import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../../lib/catalog.js';
import { run, supabase } from '../../lib/supabase.js';
import { GENDER_LABEL, rupiah } from '../../lib/format.js';
import { useToast } from '../../context/AppContext.jsx';
import { EmptyState, ErrorState } from '../../components/ui.jsx';
import { PageHeader } from './AdminLayout.jsx';

export default function Products() {
  const [tab, setTab] = useState('active');
  const [q, setQ] = useState('');
  const [all, setAll] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  const load = useCallback(() => {
    setError('');
    fetchProducts({ includeInactive: true, sort: 'newest', limit: 500 }).then(setAll).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  const products = useMemo(() => {
    if (!all) return null;
    const term = q.trim().toLowerCase();
    return all.filter((p) => (tab === 'active' ? p.isActive : !p.isActive) && (!term || p.name.toLowerCase().includes(term)));
  }, [all, tab, q]);

  async function setActive(p, isActive) {
    if (!isActive && !window.confirm(`Arsipkan "${p.name}"? Produk tidak akan tampil di katalog.`)) return;
    try {
      await run(supabase.from('products').update({ is_active: isActive }).eq('id', p.id));
      toast(isActive ? 'Produk aktif lagi di katalog' : 'Produk diarsipkan');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <>
      <PageHeader eyebrow="Katalog" title="Produk" action={<Link to="/admin/produk/baru" className="btn-primary">+ Tambah Produk</Link>} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[['active', 'Aktif'], ['archived', 'Arsip']].map(([v, l]) => (
            <button key={v} className={`chip ${tab === v ? 'chip-active' : 'bg-paper'}`} onClick={() => setTab(v)}>{l}</button>
          ))}
        </div>
        <input type="search" className="input h-10 max-w-xs" placeholder="Cari nama produk…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : !products ? <div className="skeleton h-64" /> : products.length === 0 ? (
        <EmptyState title={tab === 'active' ? 'Belum ada produk' : 'Arsip kosong'}
          action={tab === 'active' && <Link to="/admin/produk/baru" className="btn-primary">Tambah produk pertama</Link>} />
      ) : (
        <div className="overflow-x-auto border border-line bg-paper">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mute">
                <th className="p-3">Produk</th><th className="p-3">Kategori</th><th className="p-3">Harga</th>
                <th className="p-3">Varian</th><th className="p-3">Stok</th><th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-soft/60">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.imageUrl} alt="" className="h-14 w-11 bg-soft object-cover" />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        {p.isFeatured && <span className="text-[10px] font-semibold uppercase tracking-wider text-mute">Featured</span>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.category.name}<span className="block text-xs text-mute">{GENDER_LABEL[p.gender]}</span></td>
                  <td className="p-3 tabular-nums">{rupiah(p.price)}</td>
                  <td className="p-3">
                    <span>{p.colors.join(', ')}</span>
                    <span className="block text-xs text-mute">{p.sizes.join(' · ')} · {p.variants.length} varian</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold ${p.stock === 0 ? 'bg-ink text-paper' : p.variants.some((v) => v.stock === 0) ? 'bg-lemon' : 'bg-soft'}`}>
                      {p.stock === 0 ? 'Habis' : p.stock}
                    </span>
                    {p.stock > 0 && p.variants.some((v) => v.stock === 0) && (
                      <span className="mt-1 block text-[11px] text-mute">{p.variants.filter((v) => v.stock === 0).length} varian habis</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/admin/produk/${p.id}`} className="btn-ghost btn-sm">Edit</Link>
                      {p.isActive
                        ? <button className="btn-ghost btn-sm text-danger" onClick={() => setActive(p, false)}>Arsipkan</button>
                        : <button className="btn-ghost btn-sm" onClick={() => setActive(p, true)}>Aktifkan</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
