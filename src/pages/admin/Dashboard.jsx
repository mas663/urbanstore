import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { run, supabase } from '../../lib/supabase.js';
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
  const [m, setM] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await supabase.rpc('expire_overdue_orders');
        setM(await run(supabase.rpc('get_sales_metrics')));
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!m) return <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}</div>;

  return (
    <>
      <PageHeader eyebrow="Store Admin" title="Dashboard"
        action={<Link to="/admin/produk/baru" className="btn-primary">+ Tambah Produk</Link>} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total pesanan aktif" value={`${m.orders.total} Pesanan`} to="/admin/pesanan" />
        <Stat label="Menunggu konfirmasi admin" value={`${m.orders.awaitingVerification} Pesanan`} tone="bg-lemon" to="/admin/pesanan?status=menunggu_verifikasi" />
        <Stat label="Omzet terkonfirmasi" value={rupiah(m.revenue.confirmed)} tone="bg-ink text-paper" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Stat label="Belum bayar (timer jalan)" value={m.orders.awaitingPayment} to="/admin/pesanan?status=menunggu_pembayaran" />
        <Stat label="Produk aktif" value={m.catalog.activeProducts} to="/admin/produk" />
        <Stat label="Batal / kedaluwarsa" value={m.orders.cancelled} to="/admin/pesanan?status=kedaluwarsa" />
      </div>

      <section className="mt-10 border border-line bg-paper p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Stok varian menipis (≤ 3)</h2>
          <Link to="/admin/produk" className="text-sm underline underline-offset-4">Kelola produk</Link>
        </div>
        {m.lowStock.length === 0 ? (
          <p className="mt-4 text-sm text-mute">Aman, semua varian masih di atas 3 pcs.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {m.lowStock.map((v) => (
              <li key={`${v.name}-${v.color}-${v.size}`} className="flex items-center justify-between py-3 text-sm">
                <span>{v.name} <span className="text-mute">· {v.color} / {v.size}</span></span>
                <span className={`px-2 py-0.5 text-xs font-semibold ${v.stock === 0 ? 'bg-ink text-paper' : 'bg-soft'}`}>
                  {v.stock === 0 ? 'Habis' : `${v.stock} pcs`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
