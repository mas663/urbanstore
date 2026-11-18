import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { run, supabase } from '../../lib/supabase.js';
import { ORDER_STATUS } from '../../lib/catalog.js';
import { formatDate, rupiah } from '../../lib/format.js';
import { useToast } from '../../context/AppContext.jsx';
import { EmptyState, ErrorState, StatusBadge } from '../../components/ui.jsx';
import { PageHeader } from './AdminLayout.jsx';

const FILTERS = [
  ['', 'Semua'],
  ['menunggu_verifikasi', 'Perlu Verifikasi'],
  ['menunggu_pembayaran', 'Belum Bayar'],
  ['lunas', 'Lunas'],
  ['dikirim', 'Dikirim'],
  ['selesai', 'Selesai'],
  ['dibatalkan', 'Dibatalkan'],
  ['kedaluwarsa', 'Kedaluwarsa'],
];

// Sama dengan aturan transisi di fungsi admin_update_order_status (database)
const NEXT = {
  menunggu_pembayaran: ['lunas', 'dibatalkan'],
  menunggu_verifikasi: ['lunas', 'menunggu_pembayaran', 'dibatalkan'],
  lunas: ['dikirim', 'dibatalkan'],
  dikirim: ['selesai'],
};

const ACTION = {
  lunas: { label: '✓ Konfirmasi Lunas', cls: 'btn-primary' },
  dikirim: { label: 'Tandai Dikirim', cls: 'btn-outline' },
  selesai: { label: 'Tandai Selesai', cls: 'btn-outline' },
  menunggu_pembayaran: { label: 'Tolak Bukti', cls: 'btn-ghost', confirm: 'Tolak bukti transfer ini? Customer diberi waktu 1 jam lagi untuk upload ulang.' },
  dibatalkan: { label: 'Batalkan', cls: 'btn-ghost text-danger', confirm: 'Batalkan pesanan ini? Stok produk akan dikembalikan.' },
};

const SELECT = 'id, code, customer_name, phone, email, province, city, district, address, postal_code, notes, shipping_method,' +
  ' shipping_cost, subtotal, total, status, payment_deadline, created_at,' +
  ' items:order_items(id, product_name, color, size, qty, price), payment:payments(status, proof_path, proof_uploaded_at, verified_at),' +
  ' history:order_status_history(status, note, created_at)';

async function openProof(path, toast) {
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return toast('Gagal membuka bukti transfer.', 'error');
  window.open(data.signedUrl, '_blank', 'noopener');
}

function OrderDetail({ o, toast }) {
  const history = [...(o.history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return (
    <div className="grid gap-6 text-sm md:grid-cols-3">
      <div>
        <p className="eyebrow mb-2">Pengiriman</p>
        <p className="font-medium">{o.customer_name} · {o.phone}</p>
        <p className="text-mute">{o.email}</p>
        <p className="mt-1">{o.address}</p>
        <p>Kec. {o.district}, {o.city}, {o.province} {o.postal_code}</p>
        {o.notes && <p className="mt-1 text-mute">Catatan: {o.notes}</p>}
        <p className="mt-2">Kurir: {o.shipping_method === 'express' ? 'Express Next Day' : 'Regular'} ({rupiah(o.shipping_cost)})</p>
      </div>
      <div>
        <p className="eyebrow mb-2">Item</p>
        <ul className="space-y-1">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>{i.qty}× {i.product_name} <span className="text-mute">({i.color}/{i.size})</span></span>
              <span className="tabular-nums">{rupiah(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-line pt-2 font-semibold"><span>Total</span><span>{rupiah(o.total)}</span></p>
      </div>
      <div>
        <p className="eyebrow mb-2">Pembayaran</p>
        {o.payment?.proof_path ? (
          <>
            <p>Bukti diupload {formatDate(o.payment.proof_uploaded_at)}</p>
            <button className="btn-outline btn-sm mt-2" onClick={() => openProof(o.payment.proof_path, toast)}>Lihat bukti transfer ↗</button>
          </>
        ) : <p className="text-mute">Belum ada bukti transfer.</p>}
        {o.status === 'menunggu_pembayaran' && <p className="mt-2 text-mute">Batas bayar: {formatDate(o.payment_deadline)}</p>}
        {o.payment?.verified_at && <p className="mt-2 text-mute">Diverifikasi {formatDate(o.payment.verified_at)}</p>}
        <p className="eyebrow mb-2 mt-4">Riwayat</p>
        <ol className="space-y-1 border-l border-line pl-3">
          {history.map((h, i) => (
            <li key={i}><span className="font-medium">{ORDER_STATUS[h.status]}</span> <span className="text-xs text-mute">· {formatDate(h.created_at)}</span></li>
          ))}
        </ol>
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

  const load = useCallback(async () => {
    setError('');
    try {
      await supabase.rpc('expire_overdue_orders');
      let query = supabase.from('orders').select(SELECT).order('created_at', { ascending: false }).limit(200);
      if (status) query = query.eq('status', status);
      const term = q.trim().replace(/[%_,()*\\]/g, '');
      if (term) query = query.or(`code.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%`);
      const rows = await run(query);
      // Yang perlu tindakan admin tampil paling atas
      const rank = { menunggu_verifikasi: 0, menunggu_pembayaran: 1, lunas: 2 };
      rows.sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3));
      setOrders(rows);
    } catch (e) {
      setError(e.message);
    }
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
      await run(supabase.rpc('admin_update_order_status', { p_order_id: order.id, p_status: next, p_note: '' }));
      toast(`#${order.code} → ${ORDER_STATUS[next]}`);
      await load();
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
                    <StatusBadge status={o.status} label={ORDER_STATUS[o.status]} />
                    {o.payment?.proof_path && o.status === 'menunggu_verifikasi' && <span className="text-xs font-semibold">· bukti terlampir</span>}
                    <span className="text-xs text-mute">{formatDate(o.created_at)}</span>
                  </div>
                  <p className="mt-2 font-medium">{o.customer_name} <span className="font-normal text-mute">({o.phone}) · {o.city}</span></p>
                  <p className="mt-1 line-clamp-1 text-sm text-mute">
                    {o.items.map((i) => `${i.qty}× ${i.product_name} (${i.color}/${i.size})`).join(', ')}
                  </p>
                </button>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className="mr-2 text-lg font-semibold tabular-nums">{rupiah(o.total)}</span>
                  {o.payment?.proof_path && ['menunggu_verifikasi', 'lunas'].includes(o.status) && (
                    <button className="btn-ghost btn-sm" onClick={() => openProof(o.payment.proof_path, toast)}>Bukti ↗</button>
                  )}
                  {(NEXT[o.status] || []).map((s) => (
                    <button key={s} className={`${ACTION[s].cls} btn-sm`} disabled={busyId === o.id} onClick={() => changeStatus(o, s)}>
                      {ACTION[s].label}
                    </button>
                  ))}
                </div>
              </div>
              {open === o.id && <div className="border-t border-line p-4"><OrderDetail o={o} toast={toast} /></div>}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 bg-ink px-4 py-3 text-xs text-paper">Status yang diperbarui admin langsung terlihat di halaman pesanan customer.</p>
    </>
  );
}
