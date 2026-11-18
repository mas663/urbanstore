import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { rupiah } from '../lib/format.js';
import { useAuth, useCart, useToast } from '../context/AppContext.jsx';
import { EmptyState, Field } from '../components/ui.jsx';

const STEPS = ['Data Pengiriman', 'Pengiriman & Bayar', 'Review'];
const STEP1_FIELDS = ['name', 'phone', 'email', 'address', 'city', 'postalCode'];

// Validasi di browser = feedback cepat. Server tetap memvalidasi ulang.
function validateStep1(f) {
  const e = {};
  const phone = f.phone.replace(/[\s\-().]/g, '').replace(/^\+?62/, '0');
  if (f.name.trim().length < 2) e.name = 'Isi nama penerima minimal 2 huruf ya.';
  if (!/^08\d{8,12}$/.test(phone)) e.phone = 'Nomor WhatsApp belum valid. Contoh: 081234567890.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Format email belum bener. Contoh: kamu@email.com.';
  if (f.address.trim().length < 10) e.address = 'Alamat terlalu singkat. Tulis jalan, nomor rumah, RT/RW, dan kecamatan.';
  if (f.city.trim().length < 2) e.city = 'Isi kota / kabupaten tujuan.';
  if (!/^\d{5}$/.test(f.postalCode.trim())) e.postalCode = 'Kode pos harus 5 digit angka.';
  return e;
}

export default function Checkout() {
  const { cart, refresh, reset, setOpen } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '', postalCode: '', notes: '', shippingMethod: 'regular',
  });

  useEffect(() => {
    refresh();
    api('/shipping-options').then(setOptions).catch(() => {});
  }, [refresh]);

  useEffect(() => {
    if (user?.role === 'customer') {
      setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email }));
    }
  }, [user]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  if (cart.items.length === 0 && !submitting) {
    return (
      <div className="container-x py-20">
        <EmptyState title="Keranjang masih kosong" text="Tambahin produk dulu sebelum checkout ya."
          action={<Link to="/koleksi" className="btn-primary">Lihat Koleksi</Link>} />
      </div>
    );
  }

  const shipping = options?.shipping.find((s) => s.id === form.shippingMethod);
  const total = cart.subtotal + (shipping?.cost || 0);

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
      const { code, token } = await api('/orders', { method: 'POST', body: form });
      reset();
      navigate(`/pesanan/${code}?t=${token}&baru=1`, { replace: true });
    } catch (err) {
      setSubmitting(false);
      if (err.fields && Object.keys(err.fields).length) {
        setErrors(err.fields);
        setStep(Object.keys(err.fields).some((k) => STEP1_FIELDS.includes(k)) ? 0 : 1);
      }
      if (err.status === 409) {
        await refresh();
        setOpen(true);
      }
      toast(err.message, 'error');
    }
  }

  const input = (k, props = {}) => (
    <input id={k} value={form[k]} onChange={set(k)} className={`input ${errors[k] ? 'input-error' : ''}`}
      aria-invalid={Boolean(errors[k])} {...props} />
  );

  return (
    <div className="container-x py-10 lg:py-14">
      <h1 className="text-4xl font-extrabold tracking-tight">Checkout</h1>

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
              <h2 className="text-xl font-semibold">Kirim ke mana?</h2>
              <Field label="Nama penerima" htmlFor="name" error={errors.name}>{input('name', { autoComplete: 'name' })}</Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nomor WhatsApp" htmlFor="phone" error={errors.phone} hint="Untuk info pesanan & cek status.">
                  {input('phone', { inputMode: 'tel', autoComplete: 'tel', placeholder: '0812xxxxxxxx' })}
                </Field>
                <Field label="Email" htmlFor="email" error={errors.email}>{input('email', { type: 'email', autoComplete: 'email' })}</Field>
              </div>
              <Field label="Alamat lengkap" htmlFor="address" error={errors.address}>
                <textarea id="address" rows={3} value={form.address} onChange={set('address')}
                  className={`input h-auto py-3 ${errors.address ? 'input-error' : ''}`} autoComplete="street-address"
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Kota / Kabupaten" htmlFor="city" error={errors.city}>{input('city', { autoComplete: 'address-level2' })}</Field>
                <Field label="Kode pos" htmlFor="postalCode" error={errors.postalCode}>
                  {input('postalCode', { inputMode: 'numeric', maxLength: 5, autoComplete: 'postal-code' })}
                </Field>
              </div>
              <Field label="Catatan (opsional)" htmlFor="notes">{input('notes', { placeholder: 'Mis. patokan rumah' })}</Field>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold">Metode pengiriman</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup">
                  {(options?.shipping || []).map((s) => (
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
                {errors.shippingMethod && <p className="mt-2 text-sm text-danger">{errors.shippingMethod}</p>}
              </div>
              <div>
                <h2 className="text-xl font-semibold">Metode pembayaran</h2>
                <div className="mt-4 border border-ink bg-soft p-4">
                  <p className="font-semibold">Transfer Bank (Manual)</p>
                  <p className="mt-1 text-sm text-mute">
                    Nomor rekening {options?.bank.name} muncul di invoice setelah order dibuat. Admin memverifikasi pembayaran kamu secara manual.
                  </p>
                </div>
                <p className="mt-3 text-xs text-mute">QRIS & payment gateway otomatis menyusul di versi berikutnya.</p>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <h2 className="text-xl font-semibold">Cek lagi sebelum order</h2>
              <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
                <div className="bg-paper p-4 text-sm">
                  <div className="flex justify-between"><p className="eyebrow">Penerima</p>
                    <button className="text-xs underline" onClick={() => setStep(0)}>Ubah</button></div>
                  <p className="mt-2 font-semibold">{form.name}</p>
                  <p className="text-mute">{form.phone} · {form.email}</p>
                  <p className="mt-2">{form.address}, {form.city} {form.postalCode}</p>
                  {form.notes && <p className="mt-1 text-mute">Catatan: {form.notes}</p>}
                </div>
                <div className="bg-paper p-4 text-sm">
                  <div className="flex justify-between"><p className="eyebrow">Pengiriman & bayar</p>
                    <button className="text-xs underline" onClick={() => setStep(1)}>Ubah</button></div>
                  <p className="mt-2 font-semibold">{shipping?.label}</p>
                  <p className="text-mute">{shipping?.eta}</p>
                  <p className="mt-2">Transfer Bank {options?.bank.name}</p>
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
                {submitting ? 'Memproses pesanan…' : `Place Order · ${rupiah(total)}`}
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
                  <img src={i.imageUrl} alt="" className="h-16 w-13 bg-soft object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="font-medium leading-snug">{i.name}</p>
                    <p className="text-xs text-mute">Size {i.size} · {i.qty} × {rupiah(i.price)}</p>
                    {i.issue && <p className="text-xs text-danger">{i.issue}</p>}
                  </div>
                  <p className="text-sm font-medium tabular-nums">{rupiah(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd className="tabular-nums">{rupiah(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-mute">Ongkir ({shipping?.label || '-'})</dt><dd className="tabular-nums">{rupiah(shipping?.cost)}</dd></div>
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
