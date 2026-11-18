import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, streamApi } from '../../lib/api.js';
import { run, supabase } from '../../lib/supabase.js';
import { cleanAiText, rupiah } from '../../lib/format.js';
import { RefreshIcon, SparkIcon } from '../../components/icons.jsx';
import { EmptyState, ErrorState } from '../../components/ui.jsx';
import { PageHeader } from './AdminLayout.jsx';

/* AI Analisis Penjualan & Strategi (Sesi 5)
   Metrik dihitung di backend (agregat) → dikirim ringkas ke AI → dokumen strategi ditampilkan streaming. */

const SECTION_TITLES = ['RINGKASAN PERFORMA', 'INSIGHT UTAMA', 'STRATEGI PROMO', 'REKOMENDASI BUNDLING', 'PRIORITAS RESTOCK', 'LANGKAH MINGGU INI'];

function Doc({ text }) {
  const blocks = cleanAiText(text).split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {blocks.map((line, i) => {
        const title = SECTION_TITLES.find((t) => line.toUpperCase().replace(/[:.]$/, '') === t);
        if (title) return <h3 key={i} className="!mt-8 border-t border-ink pt-3 text-xs font-bold uppercase tracking-[0.16em] first:!mt-0">{title}</h3>;
        const num = line.match(/^(\d+)[.)]\s+(.*)$/);
        if (num) return <p key={i} className="flex gap-3"><span className="w-5 shrink-0 font-semibold tabular-nums">{num[1]}.</span><span>{num[2]}</span></p>;
        return <p key={i}>{line.replace(/^-\s+/, '')}</p>;
      })}
    </div>
  );
}

function Bars({ rows, label, value, format = (v) => v }) {
  const max = Math.max(...rows.map((r) => r[value]), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r[label]} className="text-sm">
          <div className="flex justify-between gap-3"><span className="truncate">{r[label]}</span><span className="tabular-nums text-mute">{format(r[value])}</span></div>
          <div className="mt-1 h-1.5 bg-soft"><div className="h-full bg-ink" style={{ width: `${(r[value] / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function Analysis() {
  const [metrics, setMetrics] = useState(null);
  const [ai, setAi] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [doc, setDoc] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | streaming | done | error
  const [error, setError] = useState('');
  const ctrlRef = useRef(null);

  useEffect(() => {
    run(supabase.rpc('get_sales_metrics')).then(setMetrics).catch((e) => setLoadError(e.message));
    api('/ai/status?scope=admin').then(setAi).catch(() => setAi({ enabled: false }));
    return () => ctrlRef.current?.abort();
  }, []);

  async function generate() {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setDoc('');
    setError('');
    setState('loading');
    let text = '';
    try {
      await streamApi('/admin/analyze', {}, {
        signal: ctrl.signal,
        onDelta: (piece) => { text += piece; setDoc(text); setState('streaming'); },
      });
      setState('done');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      setState('error');
    }
  }

  if (loadError) return <ErrorState message={loadError} />;
  if (!metrics) return <div className="skeleton h-80" />;

  const m = metrics;
  const busy = state === 'loading' || state === 'streaming';

  return (
    <>
      <PageHeader eyebrow="AI Business Tools" title="Analisis Penjualan"
        action={m.orders.total + m.orders.cancelled > 0 && (
          <button className="btn-primary" onClick={generate} disabled={busy || !ai?.enabled}>
            {busy ? 'Menyusun dokumen…' : doc ? <><RefreshIcon size={16} /> Generate ulang</> : <><SparkIcon size={16} /> Generate Analisis AI</>}
          </button>
        )} />

      {m.orders.total + m.orders.cancelled === 0 ? (
        <EmptyState title="Belum ada data transaksi"
          text="Analisis penjualan AI bisa dibuat setelah ada pesanan masuk dari customer."
          action={<Link to="/admin/pesanan" className="btn-outline">Lihat pesanan</Link>} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Omzet terkonfirmasi', rupiah(m.revenue.confirmed)],
              ['Menunggu pembayaran', rupiah(m.revenue.pending)],
              ['Rata-rata order (AOV)', rupiah(m.revenue.avgOrderValue)],
              ['Pesanan aktif', `${m.orders.total} · ${m.orders.cancelled} batal/kedaluwarsa`],
            ].map(([l, v]) => (
              <div key={l} className="border border-line bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-mute">{l}</p>
                <p className="mt-3 text-xl font-bold tabular-nums">{v}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="border border-line bg-paper p-5">
              <p className="label">Produk terlaris (qty)</p>
              <Bars rows={m.topProducts} label="name" value="qty" format={(v) => `${v} pcs`} />
            </div>
            <div className="border border-line bg-paper p-5">
              <p className="label">Penjualan per kategori</p>
              <Bars rows={m.byCategory} label="category" value="revenue" format={rupiah} />
            </div>
            <div className="border border-line bg-paper p-5">
              <p className="label">Ukuran paling laku</p>
              <Bars rows={m.bySize} label="size" value="qty" format={(v) => `${v} pcs`} />
            </div>
          </div>

          <section className="mt-8 border border-ink bg-paper">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center bg-lemon"><SparkIcon size={16} /></span>
                <div>
                  <p className="font-semibold">Dokumen Analisis Penjualan & Strategi</p>
                  <p className="text-xs text-mute">Dibuat AI dari metrik di atas · {ai?.model || 'AI'}</p>
                </div>
              </div>
              {state === 'done' && <button className="btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(cleanAiText(doc))}>Salin</button>}
            </div>
            <div className="p-5 sm:p-8">
              {!ai?.enabled ? (
                <p className="text-sm text-mute">Fitur AI belum dikonfigurasi. Isi <code>GEMINI_API_KEY_ADMIN</code> (key urbanstore-admin) atau konfigurasi 9Router di file <code>.env</code> server, lalu restart.</p>
              ) : state === 'idle' ? (
                <p className="text-sm text-mute">Klik <b>Generate Analisis AI</b> untuk membuat ringkasan performa, insight, strategi promo, bundling, dan prioritas restock.</p>
              ) : state === 'loading' ? (
                <div className="space-y-3" aria-live="polite">
                  <p className="text-sm text-mute">Menyusun analisis penjualan & strategi…</p>
                  {[100, 92, 96, 70, 88].map((w, i) => <div key={i} className="skeleton h-3" style={{ width: `${w}%` }} />)}
                </div>
              ) : state === 'error' && !doc ? (
                <div>
                  <p className="text-sm text-danger" role="alert">{error}</p>
                  <button className="btn-outline btn-sm mt-4" onClick={generate}>Coba lagi</button>
                </div>
              ) : (
                <>
                  <Doc text={doc} />
                  {state === 'streaming' && <span className="mt-2 inline-block h-4 w-2 animate-pulse bg-ink align-middle" aria-hidden="true" />}
                  {state === 'error' && (
                    <p className="mt-6 text-sm text-danger">{error} <button className="underline" onClick={generate}>Coba lagi</button></p>
                  )}
                </>
              )}
            </div>
          </section>
          <p className="mt-3 text-xs text-mute">Yang dikirim ke AI hanya angka agregat & nama produk — data pribadi customer tidak ikut dikirim.</p>
        </>
      )}
    </>
  );
}
