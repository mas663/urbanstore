import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { run, supabase } from '../lib/supabase.js';
import { BANK, SHIPPING } from '../lib/catalog.js';
import { rupiah } from '../lib/format.js';
import { useAuth, useCart, useToast } from '../context/AppContext.jsx';
import RegionSelect from '../components/RegionSelect.jsx';
import { startMayarPayment, useMayarEnabled } from '../lib/payments.js';
import { EmptyState, Field } from '../components/ui.jsx';

const STEPS = ['Data Pengiriman', 'Pengiriman & Bayar', 'Review'];

// Validasi di browser = feedback cepat. Fungsi place_order di database tetap memvalidasi ulang.
function validateStep1(f) {
  const e = {};
  const phone = f.phone.replace(/[\s\-().]/g, '').replace(/^\+?62/, '0');
  if (f.name.trim().length < 2) e.name = 'Isi nama penerima minimal 2 huruf ya.';
  if (!/^08\d{8,12}$/.test(phone)) e.phone = 'Nomor WhatsApp belum valid. Contoh: 081234567890.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Format email belum bener. Contoh: kamu@email.com.';
  if (!f.region.province) e.province = 'Pilih provinsi.';
  if (!f.region.city) e.city = 'Pilih kota/kabupaten.';
  if (!f.region.district) e.district = 'Pilih kecamatan.';
  if (f.address.trim().length < 10) e.address = 'Alamat terlalu singkat. Tulis jalan, nomor rumah, RT/RW, dan kelurahan.';
  if (!/^\d{5}$/.test(f.postalCode.trim())) e.postalCode = 'Kode pos harus 5 digit angka.';
  return e;
}

export default function Checkout() {
  const { user, ready } = useAuth();
  const { cart, refresh, reset, setOpen } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const mayarEnabled = useMayarEnabled();
  // Pilihan metode bayar: 'mayar' (otomatis) atau 'manual' (transfer + upload bukti)
  const [payMethod, setPayMethod] = useState('mayar');
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', postalCode: '', notes: '', shippingMethod: 'regular',
    region: { provinceId: '', province: '', cityId: '', city: '', districtId: '', district: '' },
  });

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone }));
  }, [user]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  if (!ready) return null;
  if (!user) return <Navigate to="/login?next=/checkout" replace />;
  if (user.role !== 'customer') {
    return (
      <div className="container-x py-20">
        <EmptyState title="Akun admin tidak bisa checkout" text="Login dengan akun customer untuk belanja."
          action={<Link to="/admin" className="btn-primary">Ke Dashboard Admin</Link>} />
      </div>
    );
  }
  if (cart.items.length === 0 && !submitting) {
    return (
      <div className="container-x py-20">
        <EmptyState title="Keranjang masih kosong" text="Tambahin produk dulu sebelum checkout ya."
          action={<Link to="/koleksi" className="btn-primary">Lihat Koleksi</Link>} />
      </div>
    );
  }

  const shipping = SHIPPING.find((s) => s.id === form.shippingMethod);
  const total = cart.subtotal + shipping.cost;
  const r = form.region;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  function next() {
    if (step === 0) {
      const e = validateStep1(form);
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    setStep((s) => s + 1);
  }

  async function placeOrder() {
    setSubmitting(true);
    try {
      const result = await run(supabase.rpc('place_order', {
        p_name: form.name, p_phone: form.phone, p_email: form.email,
        p_province: r.province, p_city: r.city, p_district: r.district,
        p_address: form.address, p_postal_code: form.postalCode.trim(), p_notes: form.notes,
        p_shipping: form.shippingMethod,
      }));
      reset();
      if (mayarEnabled && payMethod === 'mayar') {
        try {
          await startMayarPayment(result.code); // pindah ke halaman bayar Mayar
          return;
        } catch (err) {
          // Pesanan sudah tersimpan; customer tetap bisa bayar dari halaman pesanan
          toast(`${err.message} Kamu bisa coba bayar lagi dari halaman pesanan.`, 'error');
        }
      }
      navigate(`/pesanan/${result.code}?baru=1`, { replace: true });
    } catch (err) {
      setSubmitting(false);
      toast(err.message, 'error');
      if (/stok|keranjang|tidak dijual/i.test(err.message)) {
        await refresh();
        setOpen(true);
      } else if (/nama|whatsapp|email|provinsi|alamat|kode pos/i.test(err.message)) {
        setStep(0);
      }
    }
  }

  const input = (k, props = {}) => (
    <input id={k} value={form[k]} onChange={set(k)} className={`input ${errors[k] ? 'input-error' : ''}`}
      aria-invalid={Boolean(errors[k])} {...props} />
  );

  return (
    <div className="container-x py-10 lg:py-14">
      <h1 className="display text-[clamp(2.4rem,6vw,4.5rem)]">Checkout</h1>

      <ol className="mt-8 grid grid-cols-3 border-t border-line" aria-label="Langkah checkout">
        {STEPS.map((label, i) => (
          <li key={label} className={`-mt-px border-t-2 pt-3 text-xs sm:text-sm ${i <= step ? 'border-ink' : 'border-transparent text-mute'}`}
            aria-current={i === step ? 'step' : undefined}>
            <span className="font-semibold tabular-nums">0{i + 1}</span> <span className="hidden sm:inline">{label}</span>
          </li>
        ))}
      </ol>

      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {step === 0 && (
            <section className="space-y-5">
              <h2 className="display-tight text-2xl">Kirim ke mana?</h2>
              <Field label="Nama penerima" htmlFor="name" error={errors.name}>{input('name', { autoComplete: 'name' })}</Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nomor WhatsApp" htmlFor="phone" error={errors.phone} hint="Untuk info pengiriman.">
                  {input('phone', { inputMode: 'tel', autoComplete: 'tel', placeholder: '0812xxxxxxxx' })}
                </Field>
                <Field label="Email" htmlFor="email" error={errors.email}>{input('email', { type: 'email', autoComplete: 'email' })}</Field>
              </div>
              <RegionSelect value={form.region} errors={errors}
                onChange={(region) => {
                  setForm((f) => ({ ...f, region }));
                  setErrors((x) => ({ ...x, province: undefined, city: undefined, district: undefined }));
                }} />
              <Field label="Alamat lengkap" htmlFor="address" error={errors.address}>
                <textarea id="address" rows={3} value={form.address} onChange={set('address')}
                  className={`input h-auto py-3 ${errors.address ? 'input-error' : ''}`} autoComplete="street-address"
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Kode pos" htmlFor="postalCode" error={errors.postalCode}>
                  {input('postalCode', { inputMode: 'numeric', maxLength: 5, autoComplete: 'postal-code' })}
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Catatan pengiriman (opsional)" htmlFor="notes">
                    {input('notes', { placeholder: 'Mis. pagar hitam, titip satpam', maxLength: 300 })}
                  </Field>
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-8">
              <div>
                <h2 className="display-tight text-2xl">Metode pengiriman</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup">
                  {SHIPPING.map((s) => (
                    <label key={s.id} className={`cursor-pointer border p-4 transition-colors ${form.shippingMethod === s.id ? 'border-ink bg-soft' : 'border-line hover:border-ink'}`}>
                      <input type="radio" name="shipping" value={s.id} checked={form.shippingMethod === s.id}
                        onChange={set('shippingMethod')} className="sr-only" />
                      <span className="flex items-start justify-between gap-2">
                        <span>
                          <span className="block font-semibold">{s.label}</span>
                          <span className="mt-1 block text-xs text-mute">{s.eta}</span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{rupiah(s.cost)}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="display-tight text-2xl">Metode pembayaran</h2>
                <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Metode pembayaran">
                  {[
                    mayarEnabled && { id: 'mayar', title: 'Bayar instan · QRIS, Virtual Account, E-Wallet', tag: 'Otomatis',
                      text: 'Diproses Mayar.id. Status pesanan langsung jadi Lunas begitu pembayaran berhasil — tanpa upload bukti.' },
                    { id: 'manual', title: `Transfer Bank ${BANK.name} (Manual)`, tag: 'Manual',
                      text: 'Transfer lalu upload bukti transfer. Admin memverifikasi secara manual.' },
                  ].filter(Boolean).map((m) => {
                    const active = (mayarEnabled ? payMethod : 'manual') === m.id;
                    return (
                      <button key={m.id} type="button" role="radio" aria-checked={active} onClick={() => setPayMethod(m.id)}
                        className={`flex items-start gap-3 border p-4 text-left transition-colors ${active ? 'border-ink bg-lemon/30' : 'border-line hover:border-ink'}`}>
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink`} aria-hidden="true">
                          {active && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}
                        </span>
                        <span className="flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-semibold">{m.title}<span className="tag bg-ink px-1.5 py-0.5 text-paper">{m.tag}</span></span>
                          <span className="mt-1 block text-sm text-mute">{m.text}</span>
                        </span>
                      </button>
                    );
                  })}
                  <p className="text-xs text-mute">Batas bayar <b className="text-ink">1 jam</b> setelah order dibuat. Lewat dari itu, pesanan dibatalkan otomatis.</p>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <h2 className="display-tight text-2xl">Cek lagi sebelum order</h2>
              <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
                <div className="bg-paper p-4 text-sm">
                  <div className="flex justify-between"><p className="eyebrow">Penerima</p>
                    <button className="text-xs underline" onClick={() => setStep(0)}>Ubah</button></div>
                  <p className="mt-2 font-semibold">{form.name}</p>
                  <p className="text-mute">{form.phone} · {form.email}</p>
                  <p className="mt-2">{form.address}</p>
                  <p>{r.district}, {r.city}, {r.province} {form.postalCode}</p>
                  {form.notes && <p className="mt-1 text-mute">Catatan: {form.notes}</p>}
                </div>
                <div className="bg-paper p-4 text-sm">
                  <div className="flex justify-between"><p className="eyebrow">Pengiriman & bayar</p>
                    <button className="text-xs underline" onClick={() => setStep(1)}>Ubah</button></div>
                  <p className="mt-2 font-semibold">{shipping.label}</p>
                  <p className="text-mute">{shipping.eta}</p>
                  <p className="mt-2">Transfer Bank {BANK.name} · batas bayar 1 jam</p>
                </div>
              </div>
            </section>
          )}

          <div className="mt-10 flex gap-3">
            {step > 0 && <button className="btn-outline" onClick={() => setStep((s) => s - 1)} disabled={submitting}>Kembali</button>}
            {step < 2 ? (
              <button className="btn-primary flex-1 sm:flex-none sm:px-10" onClick={next}>Lanjut</button>
            ) : (
              <button className="btn-primary flex-1 sm:flex-none sm:px-10" onClick={placeOrder} disabled={submitting || cart.hasIssues}>
                {submitting ? (mayarEnabled && payMethod === 'mayar' ? 'Membuka halaman pembayaran…' : 'Memproses pesanan…') : `${mayarEnabled && payMethod === 'mayar' ? 'Bayar Sekarang' : 'Checkout'} · ${rupiah(total)}`}
              </button>
            )}
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div className="border border-line p-5 lg:sticky lg:top-24">
            <p className="font-semibold">Ringkasan pesanan</p>
            <ul className="mt-4 divide-y divide-line">
              {cart.items.map((i) => (
                <li key={i.id} className="flex gap-3 py-3">
                  <img src={i.imageUrl} alt="" className="h-16 w-13 bg-studio object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium leading-snug">{i.name}</p>
                    <p className="text-xs text-mute">{i.color} · Size {i.size} · {i.qty} × {rupiah(i.price)}</p>
                    {i.issue && <p className="text-xs text-danger">{i.issue}</p>}
                  </div>
                  <p className="text-sm font-medium tabular-nums">{rupiah(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums">{rupiah(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Ongkir ({shipping.label})</dt><dd className="tabular-nums">{rupiah(shipping.cost)}</dd></div>
              <div className="flex justify-between border-t border-ink pt-3 text-base font-semibold">
                <dt>Total</dt><dd className="tabular-nums">{rupiah(total)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
