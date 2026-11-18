import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { rupiah } from '../../lib/format.js';
import { ErrorState } from '../../components/ui.jsx';
import { PageHeader } from './AdminLayout.jsx';

function Stat({ label, value, tone = 'bg-paper', to }) {
  const body = (
    <div className={`h-full border border-line p-5 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">{label}</p>
      <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-90">{body}</Link> : body;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin/stats').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}</div>;
  const t = data.totals;

  return (
    <>
      <PageHeader eyebrow="Store Admin" title="Dashboard"
        action={<Link to="/admin/produk/baru" className="btn-primary">+ Tambah Produk</Link>} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total pesanan masuk" value={`${t.totalOrders} Pesanan`} to="/admin/pesanan" />
        <Stat label="Menunggu konfirmasi admin" value={`${t.awaitingVerification} Pesanan`} tone="bg-lemon" to="/admin/pesanan?status=menunggu_verifikasi" />
        <Stat label="Omzet terkonfirmasi" value={rupiah(t.confirmedRevenue)} tone="bg-ink text-paper" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Belum bayar" value={t.awaitingPayment} to="/admin/pesanan?status=menunggu_pembayaran" />
        <Stat label="Produk aktif" value={t.activeProducts} to="/admin/produk" />
        <Stat label="Produk habis" value={t.outOfStock} to="/admin/produk" />
      </div>

      <section className="mt-10 border border-line bg-paper p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Stok menipis (≤ 5)</h2>
          <Link to="/admin/produk" className="text-sm underline underline-offset-4">Kelola produk</Link>
        </div>
        {data.lowStock.length === 0 ? (
          <p className="mt-4 text-sm text-mute">Aman, semua stok masih di atas 5.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <Link to={`/admin/produk/${p.id}`} className="hover:underline">{p.name}</Link>
                <span className={`px-2 py-0.5 text-xs font-semibold ${p.stock === 0 ? 'bg-ink text-paper' : 'bg-soft'}`}>
                  {p.stock === 0 ? 'Habis' : `${p.stock} pcs`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
