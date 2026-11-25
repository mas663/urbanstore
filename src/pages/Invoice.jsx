import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { run, supabase } from '../lib/supabase.js';
import { BANK, ORDER_STATUS } from '../lib/catalog.js';
import { formatDate, rupiah } from '../lib/format.js';
import { compressImage, formatBytes } from '../lib/image.js';
import { useAuth, useToast } from '../context/AppContext.jsx';
import { CopyIcon, RefreshIcon } from '../components/icons.jsx';
import { ErrorState, StatusBadge } from '../components/ui.jsx';
import { resolveImage } from '../lib/productImages.js';
import { startMayarPayment, syncMayarPayment, useMayarEnabled } from '../lib/payments.js';
import { ArrowIcon } from '../components/icons.jsx';

export const ORDER_SELECT =
  '*, items:order_items(*), payment:payments(*), history:order_status_history(status, note, created_at)';

const TIMELINE = [
  ['menunggu_pembayaran', 'Order dibuat'],
  ['menunggu_verifikasi', 'Bukti diupload'],
  ['lunas', 'Lunas · diproses'],
  ['dikirim', 'Dikirim'],
  ['selesai', 'Selesai'],
];

const MESSAGE = {
  menunggu_pembayaran: 'Selesaikan pembayaran sebelum waktu habis: bayar instan lewat QRIS / Virtual Account / e-wallet, atau transfer manual lalu upload bukti.',
  menunggu_verifikasi: 'Makasih! Bukti transfer kamu sudah masuk. Admin lagi ngecek, status akan berubah jadi Lunas setelah diverifikasi.',
  lunas: 'Pembayaran sudah dikonfirmasi. Pesanan kamu lagi disiapkan.',
  dikirim: 'Pesanan kamu lagi dalam perjalanan.',
  selesai: 'Pesanan selesai. Semoga suka sama outfit barunya!',
  dibatalkan: 'Pesanan ini dibatalkan. Stok sudah dikembalikan.',
  kedaluwarsa: 'Batas waktu pembayaran 1 jam sudah lewat, jadi pesanan dibatalkan otomatis. Kamu bisa checkout ulang kapan aja.',
};

/** Hitung mundur ke deadline; panggil onExpire sekali saat waktu habis. */
function useCountdown(deadline, active, onExpire) {
  const [left, setLeft] = useState(() => (deadline ? new Date(deadline) - Date.now() : 0));
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    if (!active || !deadline) return;
    const tick = () => {
      const ms = new Date(deadline) - Date.now();
      setLeft(ms);
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        onExpire();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [deadline, active, onExpire]);
  return Math.max(0, left);
}

const pad = (n) => String(n).padStart(2, '0');

/** Bungkus bagian transfer manual: dilipat (details) kalau ada opsi bayar instan, terbuka kalau tidak. */
function ManualWrap({ collapsed, children }) {
  if (!collapsed) return children;
  return (
    <details className="group mt-6 border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-semibold [&::-webkit-details-marker]:hidden">
        Atau transfer manual & upload bukti
        <span className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="px-5 pb-5 [&>section:first-child]:mt-0">{children}</div>
    </details>
  );
}

export default function Invoice() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const isNew = params.get('baru') === '1';
  const { user, ready } = useAuth();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [proofUrl, setProofUrl] = useState(null);
  const [file, setFile] = useState(null);           // { blob, previewUrl, size, originalSize }
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);
  const mayarEnabled = useMayarEnabled();
  const [payBusy, setPayBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const o = await run(supabase.from('orders').select(ORDER_SELECT).eq('code', code).maybeSingle());
      if (!o) throw new Error('Pesanan tidak ditemukan.');
      o.history?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setOrder(o);
      if (o.payment?.proof_path) {
        const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(o.payment.proof_path, 600);
        setProofUrl(data?.signedUrl || null);
      } else {
        setProofUrl(null);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [code]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const onExpire = useCallback(async () => {
    await supabase.rpc('expire_overdue_orders');
    await load();
  }, [load]);

  const waiting = order?.status === 'menunggu_pembayaran';
  const msLeft = useCountdown(order?.payment_deadline, waiting, onExpire);

  useEffect(() => () => file?.previewUrl && URL.revokeObjectURL(file.previewUrl), [file]);

  /* Cek status Mayar: saat halaman dibuka & setiap kali customer kembali ke tab ini dari halaman bayar.
     Webhook tetap jalur utama; ini cadangan kalau webhook terlambat (atau saat development di localhost). */
  const hasMayarInvoice = Boolean(order?.payment?.mayar_invoice_id);
  const checkMayar = useCallback(async ({ silent = true } = {}) => {
    setSyncing(true);
    try {
      const r = await syncMayarPayment(code);
      if (r.result === 'paid' || r.result === 'paid_late' || r.result === 'already_paid') {
        toast('Pembayaran diterima! Pesanan kamu sekarang Lunas.');
        await load();
      } else if (!silent) {
        toast(r.mayarStatus === 'paid' ? 'Pembayaran sedang diproses, cek lagi sebentar ya.' : 'Pembayaran belum terdeteksi. Selesaikan dulu di halaman Mayar ya.');
      }
    } catch (err) {
      if (!silent) toast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  }, [code, load, toast]);

  useEffect(() => {
    if (!waiting || !hasMayarInvoice) return;
    checkMayar();
    const onVisible = () => document.visibilityState === 'visible' && checkMayar();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [waiting, hasMayarInvoice, checkMayar]);

  if (!ready) return null;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(`/pesanan/${code}`)}`} replace />;

  async function pickFile(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploadError('');
    try {
      const result = await compressImage(f);
      setFile({ ...result, previewUrl: URL.createObjectURL(result.blob) });
    } catch (err) {
      setUploadError(err.message);
    }
  }

  async function uploadProof() {
    if (!file) return setUploadError('Pilih foto/screenshot bukti transfer dulu ya.');
    setUploading(true);
    setUploadError('');
    try {
      const path = `${user.id}/${order.code}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('payment-proofs')
        .upload(path, file.blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw new Error(upErr.message.includes('row-level') ? 'Upload ditolak. Coba login ulang.' : upErr.message);
      await run(supabase.rpc('submit_payment_proof', { p_code: order.code, p_path: path }));
      setFile(null);
      toast('Bukti transfer terkirim! Admin akan segera memverifikasi.');
      await load();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function payWithMayar() {
    setPayBusy(true);
    try {
      await startMayarPayment(order.code); // pindah ke halaman Mayar
    } catch (err) {
      toast(err.message, 'error');
      setPayBusy(false);
    }
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      const { downloadInvoicePdf } = await import('../lib/invoicePdf.js');
      await downloadInvoicePdf(order);
    } catch {
      toast('Gagal membuat PDF. Coba lagi ya.', 'error');
    } finally {
      setPdfBusy(false);
    }
  }

  const copy = (text, label) =>
    navigator.clipboard?.writeText(text).then(() => toast(`${label} disalin`), () => toast('Gagal menyalin', 'error'));

  if (error) {
    return (
      <div className="container-x max-w-xl py-20">
        <ErrorState message={error} onRetry={load} />
        <Link to="/akun/pesanan" className="btn-outline mt-6">Lihat Pesanan Saya</Link>
      </div>
    );
  }
  if (!order) return <div className="container-x py-20"><div className="skeleton h-96" /></div>;

  const stepIndex = TIMELINE.findIndex(([s]) => s === order.status);
  const paid = ['lunas', 'dikirim', 'selesai'].includes(order.status);
  const closed = ['dibatalkan', 'kedaluwarsa'].includes(order.status);
  const canUpload = ['menunggu_pembayaran', 'menunggu_verifikasi'].includes(order.status) && !(waiting && msLeft <= 0);
  const urgent = waiting && msLeft < 10 * 60 * 1000;

  return (
    <div className="container-x max-w-4xl py-10 lg:py-14">
      {isNew && (
        <div className="mb-8 bg-lemon p-5">
          <p className="font-semibold">Pesanan berhasil dibuat 🎉</p>
          <p className="mt-1 text-sm">Nomor order kamu <b>#{order.code}</b>. Selesaikan pembayaran dalam 1 jam ya.</p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow">Nomor order</p>
          <h1 className="display-tight mt-2 text-3xl sm:text-5xl">#{order.code}</h1>
          <p className="mt-2 text-sm text-mute">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} label={ORDER_STATUS[order.status]} />
          <button className="btn-ghost btn-sm" onClick={load} aria-label="Muat ulang status"><RefreshIcon size={16} /></button>
        </div>
      </div>

      <p className="mt-6 text-[15px]">{MESSAGE[order.status]}</p>

      {!closed && (
        <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Status pesanan">
          {TIMELINE.map(([s, label], i) => (
            <li key={s} className="text-[11px] leading-tight sm:text-xs">
              <span className={`mb-2 block h-1 ${i <= stepIndex ? 'bg-ink' : 'bg-line'}`} />
              <span className={i <= stepIndex ? 'font-semibold' : 'text-mute'}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Timer batas bayar 1 jam */}
      {waiting && (
        <section className={`mt-8 flex flex-wrap items-center justify-between gap-4 border-2 p-5 ${urgent ? 'border-danger bg-danger/5' : 'border-ink'}`}
          aria-live="polite">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mute">Sisa waktu pembayaran</p>
            <p className="mt-1 text-sm text-mute">Batas: {formatDate(order.payment_deadline)}</p>
          </div>
          <p className={`font-mono text-4xl font-bold tabular-nums sm:text-5xl ${urgent ? 'text-danger' : ''}`}>
            {pad(Math.floor(msLeft / 3600000))}:{pad(Math.floor((msLeft % 3600000) / 60000))}:{pad(Math.floor((msLeft % 60000) / 1000))}
          </p>
        </section>
      )}

      {/* Bayar instan via Mayar (Sesi 6) */}
      {waiting && msLeft > 0 && mayarEnabled && (
        <section className="mt-6 border-2 border-ink bg-lemon p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="tag">Rekomendasi · Otomatis</p>
              <p className="display-tight mt-2 text-2xl">Bayar instan {rupiah(order.total)}</p>
              <p className="mt-1 text-sm text-ink/70">QRIS · Virtual Account (BCA, BNI, BRI, Mandiri, dll.) · DANA · GoPay · ShopeePay. Status langsung Lunas tanpa upload bukti.</p>
            </div>
            <button className="btn-primary h-14 px-8" onClick={payWithMayar} disabled={payBusy}>
              {payBusy ? 'Membuka Mayar…' : <>{hasMayarInvoice ? 'Lanjutkan Pembayaran' : 'Bayar Sekarang'} <ArrowIcon size={18} /></>}
            </button>
          </div>
          {hasMayarInvoice && (
            <p className="mt-4 border-t border-ink/20 pt-3 text-sm">
              Sudah bayar?{' '}
              <button className="font-semibold underline underline-offset-4" onClick={() => checkMayar({ silent: false })} disabled={syncing}>
                {syncing ? 'Mengecek…' : 'Cek status pembayaran'}
              </button>
            </p>
          )}
          <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink/60">Diproses aman oleh Mayar.id</p>
        </section>
      )}

      {/* Transfer manual: dilipat jadi alternatif kalau Mayar tersedia */}
      {canUpload && (
      <ManualWrap collapsed={mayarEnabled && waiting}>
      {/* Info rekening & transfer */}
      {canUpload && (
        <section className="mt-6 bg-ink p-6 text-paper">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lemon">Transfer ke rekening</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-bold tracking-tight">{BANK.name} · {BANK.account}</p>
              <p className="mt-1 text-sm text-paper/70">a.n. {BANK.holder}</p>
            </div>
            <button className="btn btn-sm border border-paper/40 hover:bg-paper hover:text-ink" onClick={() => copy(BANK.account.replace(/\D/g, ''), 'Nomor rekening')}>
              <CopyIcon size={14} /> Salin rekening
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-paper/20 pt-4">
            <div>
              <p className="text-sm text-paper/70">Total transfer (sesuai sampai digit terakhir)</p>
              <p className="text-3xl font-bold tabular-nums">{rupiah(order.total)}</p>
            </div>
            <button className="btn btn-sm border border-paper/40 hover:bg-paper hover:text-ink" onClick={() => copy(String(order.total), 'Nominal')}>
              <CopyIcon size={14} /> Salin nominal
            </button>
          </div>
        </section>
      )}

      {/* Upload bukti transfer */}
      {canUpload && (
        <section className="mt-6 border border-line p-5 sm:p-6">
          <h2 className="font-semibold">{order.status === 'menunggu_verifikasi' ? 'Ganti bukti transfer' : 'Upload bukti transfer'}</h2>
          <p className="mt-1 text-sm text-mute">Foto atau screenshot bukti transfer. Gambar otomatis dikompres sebelum dikirim.</p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
            <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center border border-dashed border-ink/40 bg-soft text-center text-sm hover:border-ink sm:w-40">
              {file ? <img src={file.previewUrl} alt="Pratinjau bukti transfer" className="h-full w-full object-contain" />
                : <><span className="text-2xl">+</span><span className="mt-1 px-3">Pilih foto bukti</span></>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickFile} disabled={uploading} />
            </label>
            <div className="flex-1 space-y-3 text-sm">
              {file && (
                <p className="text-mute">
                  Dikompres: {formatBytes(file.originalSize)} → <b className="text-ink">{formatBytes(file.size)}</b> ({file.width}×{file.height}px)
                </p>
              )}
              {uploadError && <p className="text-danger" role="alert">{uploadError}</p>}
              <button className="btn-primary w-full sm:w-auto" onClick={uploadProof} disabled={!file || uploading}>
                {uploading ? 'Mengirim bukti…' : 'Kirim Bukti Transfer'}
              </button>
            </div>
          </div>
          {proofUrl && (
            <p className="mt-4 text-sm">
              Bukti terakhir diupload {formatDate(order.payment.proof_uploaded_at)} ·{' '}
              <a href={proofUrl} target="_blank" rel="noreferrer" className="underline">lihat gambar</a>
            </p>
          )}
        </section>
      )}
      </ManualWrap>
      )}

      {/* Invoice */}
      <section className="relative mt-10 border border-line p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Invoice</p>
            <p className="mt-1 font-semibold">#{order.code}</p>
          </div>
          <span className={`rotate-[-6deg] border-2 px-3 py-1 text-sm font-extrabold tracking-[0.2em] ${
            paid ? 'border-ok text-ok' : closed ? 'border-mute text-mute' : 'border-danger text-danger'}`}>
            {paid ? 'LUNAS' : closed ? ORDER_STATUS[order.status].toUpperCase() : 'BELUM LUNAS'}
          </span>
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3">
            <ul className="divide-y divide-line border-y border-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-4 py-4">
                  <img src={resolveImage(i.image_url)} alt="" className="h-20 w-16 bg-studio object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{i.product_name}</p>
                    <p className="text-mute">{i.color} · Size {i.size} · {i.qty} × {rupiah(i.price)}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{rupiah(i.price * i.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums">{rupiah(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Ongkir ({order.shipping_method === 'express' ? 'Express' : 'Regular'})</dt><dd className="tabular-nums">{rupiah(order.shipping_cost)}</dd></div>
              <div className="flex justify-between border-t border-ink pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{rupiah(order.total)}</dd></div>
            </dl>
          </div>
          <div className="space-y-6 text-sm md:col-span-2">
            <div>
              <p className="label">Dikirim ke</p>
              <p className="font-semibold">{order.customer_name}</p>
              <p className="text-mute">{order.phone}</p>
              <p className="mt-1">{order.address}</p>
              <p>Kec. {order.district}, {order.city}</p>
              <p>{order.province} {order.postal_code}</p>
              {order.notes && <p className="mt-1 text-mute">Catatan: {order.notes}</p>}
            </div>
            {order.history?.length > 0 && (
              <div>
                <p className="label">Riwayat</p>
                <ol className="space-y-2 border-l border-line pl-4">
                  {order.history.map((h, i) => (
                    <li key={i}>
                      <p className="font-medium">{ORDER_STATUS[h.status]}</p>
                      <p className="text-xs text-mute">{formatDate(h.created_at)}{h.note ? ` · ${h.note}` : ''}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="btn-primary" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? 'Membuat PDF…' : 'Download Invoice (PDF)'}</button>
        <Link to="/akun/pesanan" className="btn-outline">Pesanan Saya</Link>
        <Link to="/koleksi" className="btn-ghost">Lanjut belanja</Link>
      </div>
    </div>
  );
}
