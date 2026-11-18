import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatDate, rupiah } from '../lib/format.js';
import { useToast } from '../context/AppContext.jsx';
import { CopyIcon, RefreshIcon } from '../components/icons.jsx';
import { ErrorState, StatusBadge } from '../components/ui.jsx';

const TIMELINE = [
  ['menunggu_pembayaran', 'Order dibuat'],
  ['menunggu_verifikasi', 'Transfer dikonfirmasi'],
  ['lunas', 'Lunas · diproses'],
  ['dikirim', 'Dikirim'],
  ['selesai', 'Selesai'],
];

const MESSAGE = {
  menunggu_pembayaran: 'Transfer sesuai total di bawah, lalu klik "Saya Sudah Transfer" biar admin bisa cek.',
  menunggu_verifikasi: 'Makasih! Admin lagi ngecek transfer kamu. Status akan berubah jadi Lunas setelah diverifikasi.',
  lunas: 'Pembayaran sudah diterima. Pesanan kamu lagi disiapkan.',
  dikirim: 'Pesanan kamu lagi dalam perjalanan.',
  selesai: 'Pesanan selesai. Semoga suka sama outfit barunya!',
  dibatalkan: 'Pesanan ini dibatalkan.',
};

export default function Invoice() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const isNew = params.get('baru') === '1';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(() => {
    setError(null);
    return api(`/orders/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [code, token]);

  useEffect(() => { load(); }, [load]);

  async function confirmTransfer() {
    setBusy(true);
    try {
      setData(await api(`/orders/${encodeURIComponent(code)}/confirm-transfer`, { method: 'POST', body: { t: token } }));
      toast('Siap! Admin akan segera memverifikasi pembayaran kamu.');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const copy = (text, label) =>
    navigator.clipboard?.writeText(text).then(() => toast(`${label} disalin`), () => toast('Gagal menyalin', 'error'));

  if (error) {
    return (
      <div className="container-x max-w-xl py-20">
        <ErrorState message={error} />
        <Link to="/cek-pesanan" className="btn-outline mt-6">Cek pesanan pakai nomor order</Link>
      </div>
    );
  }
  if (!data) return <div className="container-x py-20"><div className="skeleton h-96" /></div>;

  const { order, bank } = data;
  const stepIndex = TIMELINE.findIndex(([s]) => s === order.status);

  return (
    <div className="container-x max-w-4xl py-10 lg:py-14">
      {isNew && (
        <div className="mb-8 bg-lemon p-5">
          <p className="font-semibold">Order berhasil dibuat 🎉</p>
          <p className="mt-1 text-sm">Simpan halaman ini atau catat nomor order kamu untuk cek status nanti.</p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">Invoice pesanan</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Order #{order.code}</h1>
          <p className="mt-2 text-sm text-mute">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} label={order.statusLabel} />
          <button className="btn-ghost btn-sm" onClick={load} aria-label="Muat ulang status"><RefreshIcon size={16} /></button>
        </div>
      </div>

      <p className="mt-6 text-[15px]">{MESSAGE[order.status]}</p>

      {order.status !== 'dibatalkan' && (
        <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Status pesanan">
          {TIMELINE.map(([s, label], i) => (
            <li key={s} className="text-[11px] leading-tight sm:text-xs">
              <span className={`mb-2 block h-1 ${i <= stepIndex ? 'bg-ink' : 'bg-line'}`} />
              <span className={i <= stepIndex ? 'font-semibold' : 'text-mute'}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      {order.status === 'menunggu_pembayaran' && (
        <section className="mt-8 bg-ink p-6 text-paper">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lemon">Instruksi transfer bank manual</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-bold tracking-tight">{bank.name} · {bank.account}</p>
              <p className="mt-1 text-sm text-paper/70">a.n. {bank.holder}</p>
            </div>
            <button className="btn btn-sm border border-paper/40 hover:bg-paper hover:text-ink" onClick={() => copy(bank.account.replace(/\D/g, ''), 'Nomor rekening')}>
              <CopyIcon size={14} /> Salin rekening
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-paper/20 pt-4">
            <div>
              <p className="text-sm text-paper/70">Total yang harus ditransfer</p>
              <p className="text-3xl font-bold tabular-nums">{rupiah(order.total)}</p>
            </div>
            <button className="btn btn-sm border border-paper/40 hover:bg-paper hover:text-ink" onClick={() => copy(String(order.total), 'Nominal')}>
              <CopyIcon size={14} /> Salin nominal
            </button>
          </div>
          <button className="btn-lemon mt-6 w-full" onClick={confirmTransfer} disabled={busy}>
            {busy ? 'Mengirim…' : 'Saya Sudah Transfer → Beri Tahu Admin'}
          </button>
        </section>
      )}

      <div className="mt-10 grid gap-10 md:grid-cols-5">
        <section className="md:col-span-3">
          <p className="label">Item belanja</p>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <img src={i.imageUrl} alt="" className="h-20 w-16 bg-soft object-cover" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{i.name}</p>
                  <p className="text-mute">Size {i.size} · {i.qty} × {rupiah(i.price)}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{rupiah(i.lineTotal)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums">{rupiah(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Ongkir ({order.shipping.method === 'express' ? 'Express' : 'Regular'})</dt><dd className="tabular-nums">{rupiah(order.shipping.cost)}</dd></div>
            <div className="flex justify-between border-t border-ink pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{rupiah(order.total)}</dd></div>
          </dl>
        </section>
        <section className="md:col-span-2">
          <p className="label">Dikirim ke</p>
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{order.customer.name}</p>
            <p className="text-mute">{order.customer.phone}</p>
            <p>{order.customer.address}</p>
            <p>{order.customer.city} {order.customer.postalCode}</p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/koleksi" className="btn-outline">Lanjut belanja</Link>
        <button className="btn-ghost" onClick={() => window.print()}>Cetak invoice</button>
      </div>
    </div>
  );
}
