import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { formatDate, rupiah } from '../../lib/format.js';
import { useToast } from '../../context/AppContext.jsx';
import { EmptyState, ErrorState, StatusBadge } from '../../components/ui.jsx';
import { PageHeader } from './AdminLayout.jsx';

const FILTERS = [
  ['', 'Semua'],
  ['menunggu_verifikasi', 'Menunggu Verifikasi'],
  ['menunggu_pembayaran', 'Belum Bayar'],
  ['lunas', 'Lunas'],
  ['dikirim', 'Dikirim'],
  ['selesai', 'Selesai'],
  ['dibatalkan', 'Dibatalkan'],
];

const ACTION = {
  lunas: { label: '✓ Konfirmasi Lunas', cls: 'btn-primary' },
  dikirim: { label: 'Tandai Dikirim', cls: 'btn-outline' },
  selesai: { label: 'Tandai Selesai', cls: 'btn-outline' },
  menunggu_pembayaran: { label: 'Tolak (transfer belum masuk)', cls: 'btn-ghost' },
  dibatalkan: { label: 'Batalkan', cls: 'btn-ghost text-danger', confirm: 'Batalkan pesanan ini? Stok produk akan dikembalikan.' },
};

function OrderDetail({ id }) {
  const [order, setOrder] = useState(null);
  useEffect(() => {
    api(`/admin/orders/${id}`).then((d) => setOrder(d.order)).catch(() => setOrder(false));
  }, [id]);
  if (order === null) return <div className="skeleton h-24" />;
  if (!order) return <p className="text-sm text-danger">Gagal memuat detail.</p>;
  return (
    <div className="grid gap-6 text-sm md:grid-cols-2">
      <div>
        <p className="eyebrow mb-2">Pengiriman</p>
        <p className="font-medium">{order.customer.name} · {order.customer.phone}</p>
        <p className="text-mute">{order.customer.email}</p>
        <p className="mt-1">{order.customer.address}, {order.customer.city} {order.customer.postalCode}</p>
        {order.customer.notes && <p className="mt-1 text-mute">Catatan: {order.customer.notes}</p>}
        <p className="mt-2">Kurir: {order.shipping.method === 'express' ? 'Express Next Day' : 'Regular'} ({rupiah(order.shipping.cost)})</p>
        {order.payment?.claimedAt && <p className="mt-2 text-mute">Customer klik "Sudah Transfer": {formatDate(order.payment.claimedAt)}</p>}
        {order.payment?.verifiedAt && <p className="text-mute">Diverifikasi: {formatDate(order.payment.verifiedAt)}</p>}
      </div>
      <div>
        <p className="eyebrow mb-2">Item</p>
        <ul className="space-y-1">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>{i.qty}× {i.name} ({i.size})</span><span className="tabular-nums">{rupiah(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span>{rupiah(order.total)}</span></p>
      </div>
    </div>
  );
}

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [q, setQ] = useState('');
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setError('');
    api(`/admin/orders?status=${status}&q=${encodeURIComponent(q)}`)
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function changeStatus(order, next) {
    const a = ACTION[next];
    if (a.confirm && !window.confirm(a.confirm)) return;
    setBusyId(order.id);
    try {
      await api(`/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status: next } });
      toast(`#${order.code} → ${FILTERS.find(([v]) => v === next)?.[1] || next}`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Admin Order Management" title="Daftar Transaksi" />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {FILTERS.map(([v, l]) => (
            <button key={v} className={`chip ${status === v ? 'chip-active' : 'bg-paper'}`}
              onClick={() => setParams(v ? { status: v } : {})}>{l}</button>
          ))}
        </div>
        <input type="search" className="input h-10 lg:max-w-xs" placeholder="Cari no. order / nama / HP" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : !orders ? <div className="skeleton h-64" /> : orders.length === 0 ? (
        <EmptyState title="Belum ada pesanan" text="Pesanan dari customer akan muncul di sini." />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className={`border bg-paper ${o.status === 'menunggu_verifikasi' ? 'border-ink' : 'border-line'}`}>
              <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                <button className="flex-1 text-left" onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-sm font-semibold">#{o.code}</span>
                    <StatusBadge status={o.status} label={o.statusLabel} />
                    <span className="text-xs text-mute">{formatDate(o.createdAt)}</span>
                  </div>
                  <p className="mt-2 font-medium">{o.customerName} <span className="font-normal text-mute">({o.phone}) · {o.city}</span></p>
                  <p className="mt-1 line-clamp-1 text-sm text-mute">{o.summary}</p>
                </button>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className="mr-2 text-lg font-semibold tabular-nums">{rupiah(o.total)}</span>
                  {o.nextStatuses.map((s) => (
                    <button key={s} className={`${ACTION[s].cls} btn-sm`} disabled={busyId === o.id} onClick={() => changeStatus(o, s)}>
                      {ACTION[s].label}
                    </button>
                  ))}
                </div>
              </div>
              {open === o.id && <div className="border-t border-line p-4"><OrderDetail id={o.id} /></div>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 bg-ink px-4 py-3 text-xs text-paper">Status yang diperbarui admin otomatis terlihat di halaman invoice customer.</p>
    </>
  );
}
