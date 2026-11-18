import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/AppContext.jsx';
import { rupiah } from '../lib/format.js';
import { CloseIcon } from './icons.jsx';
import { QtyStepper } from './ui.jsx';

export default function CartDrawer() {
  const { cart, open, setOpen, update, remove, busy, refresh } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    refresh();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, setOpen, refresh]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Keranjang belanja">
      <button className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-label="Tutup keranjang" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-paper">
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <p className="font-semibold">Keranjang <span className="text-mute">({cart.count})</span></p>
          <button className="-mr-2 p-2" onClick={() => setOpen(false)} aria-label="Tutup"><CloseIcon /></button>
        </div>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-lg font-semibold">Keranjang kamu masih kosong</p>
            <p className="text-sm text-mute">Yuk cari outfit yang bikin kamu pede seharian.</p>
            <Link to="/koleksi" className="btn-primary mt-2" onClick={() => setOpen(false)}>Mulai Belanja</Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <Link to={`/produk/${item.slug}`} onClick={() => setOpen(false)} className="w-20 shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="aspect-[4/5] w-full bg-soft object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{item.name}</p>
                      <p className="text-sm font-semibold tabular-nums">{rupiah(item.lineTotal)}</p>
                    </div>
                    <p className="mt-1 text-xs text-mute">{item.color} · Size {item.size} · {rupiah(item.price)}</p>
                    {item.issue && <p className="mt-1 text-xs font-medium text-danger">{item.issue}</p>}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QtyStepper value={item.qty} max={Math.max(item.stock, 1)} disabled={busy}
                        onChange={(q) => update(item.id, q)} />
                      <button className="text-xs text-mute underline underline-offset-4 hover:text-ink"
                        onClick={() => remove(item.id)} disabled={busy}>
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-4 border-t border-line p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-mute">Subtotal</span>
                <span className="text-xl font-semibold tabular-nums">{rupiah(cart.subtotal)}</span>
              </div>
              <p className="text-xs text-mute">Ongkir dihitung di langkah checkout.</p>
              {cart.hasIssues && (
                <p className="bg-danger/5 p-3 text-xs text-danger">Ada item yang stoknya berubah. Sesuaikan jumlah atau hapus dulu ya.</p>
              )}
              <button className="btn-primary w-full" disabled={cart.hasIssues || busy}
                onClick={() => { setOpen(false); navigate('/checkout'); }}>
                Checkout Sekarang
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
