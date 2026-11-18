import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { GENDER_LABEL, rupiah } from '../../lib/format.js';
import { useToast } from '../../context/AppContext.jsx';
import { EmptyState, ErrorState } from '../../components/ui.jsx';
import { PageHeader } from './AdminLayout.jsx';

export default function Products() {
  const [tab, setTab] = useState('active');
  const [q, setQ] = useState('');
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();

  const load = useCallback(() => {
    setError('');
    api(`/admin/products?status=${tab}&q=${encodeURIComponent(q)}`)
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message));
  }, [tab, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function archive(p) {
    if (!window.confirm(`Arsipkan "${p.name}"? Produk tidak akan tampil di katalog.`)) return;
    try {
      await api(`/admin/products/${p.id}`, { method: 'DELETE' });
      toast('Produk diarsipkan');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function restore(p) {
    try {
      await api(`/admin/products/${p.id}`, {
        method: 'PUT',
        body: { ...p, categoryId: p.category.id, isActive: true },
      });
      toast('Produk aktif lagi di katalog');
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
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mute">
                <th className="p-3">Produk</th><th className="p-3">Kategori</th><th className="p-3">Harga</th>
                <th className="p-3">Ukuran</th><th className="p-3">Stok</th><th className="p-3 text-right">Aksi</th>
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
                  <td className="p-3">{p.sizes.join(', ')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold ${p.stock === 0 ? 'bg-ink text-paper' : p.stock <= 5 ? 'bg-lemon' : 'bg-soft'}`}>
                      {p.stock === 0 ? 'Habis' : p.stock}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/admin/produk/${p.id}`} className="btn-ghost btn-sm">Edit</Link>
                      {tab === 'active'
                        ? <button className="btn-ghost btn-sm text-danger" onClick={() => archive(p)}>Arsipkan</button>
                        : <button className="btn-ghost btn-sm" onClick={() => restore(p)}>Aktifkan</button>}
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
