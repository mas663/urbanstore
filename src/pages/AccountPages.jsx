import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatDate, rupiah } from '../lib/format.js';
import { useAuth } from '../context/AppContext.jsx';
import { EmptyState, ErrorState, Field, StatusBadge } from '../components/ui.jsx';

// Hanya izinkan redirect internal (mencegah open redirect)
const safeNext = (v, fallback = '/') => (v && v.startsWith('/') && !v.startsWith('//') ? v : fallback);

function AuthShell({ eyebrow, title, children, footer }) {
  return (
    <div className="container-x flex justify-center py-14 sm:py-20">
      <div className="w-full max-w-md">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{title}</h1>
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-mute">{footer}</div>}
      </div>
    </div>
  );
}

export function OrderLookup() {
  const [form, setForm] = useState({ code: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.code.trim() || !form.phone.trim()) return setError('Isi nomor order dan nomor WhatsApp dulu ya.');
    setBusy(true);
    try {
      const d = await api('/orders/lookup', { method: 'POST', body: form });
      navigate(`/pesanan/${d.code}?t=${d.token}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="Lacak pesanan" title="Cek Pesanan">
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Nomor order" htmlFor="code" hint="Contoh: URB-2026-001">
          <input id="code" className="input uppercase" value={form.code} placeholder="URB-2026-001"
            onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </Field>
        <Field label="Nomor WhatsApp" htmlFor="phone" hint="Yang dipakai saat checkout.">
          <input id="phone" className="input" inputMode="tel" value={form.phone} placeholder="0812xxxxxxxx"
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Mencari…' : 'Cek Status'}</button>
      </form>
    </AuthShell>
  );
}

export function Login({ admin = false }) {
  const { login, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'), admin ? '/admin' : '/');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && (!admin || user.role === 'admin')) return <Navigate to={next} replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password, admin ? 'admin' : undefined);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow={admin ? 'Store Admin' : 'Akun UrbanStore'}
      title={admin ? 'Login Admin' : 'Masuk'}
      footer={admin ? <Link to="/" className="underline">← Kembali ke toko</Link> : (
        <>Belum punya akun? <Link to={`/daftar?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline">Daftar gratis</Link></>
      )}
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Email" htmlFor="email">
          <input id="email" type="email" className="input" autoComplete="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" type="password" className="input" autoComplete="current-password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
        {!admin && params.get('next')?.includes('chat=1') && (
          <p className="bg-soft p-3 text-xs text-mute">Login dulu untuk pakai AI Shopping Assistant ya.</p>
        )}
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setErrors({});
    setBusy(true);
    try {
      await register(form);
      navigate(next, { replace: true });
    } catch (err) {
      setErrors(err.fields || {});
      if (!err.fields) setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell eyebrow="Akun UrbanStore" title="Daftar"
      footer={<>Udah punya akun? <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline">Masuk</Link></>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Nama" htmlFor="name" error={errors.name}>
          <input id="name" className={`input ${errors.name ? 'input-error' : ''}`} autoComplete="name" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`} autoComplete="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="Minimal 8 karakter.">
          <input id="password" type="password" className={`input ${errors.password ? 'input-error' : ''}`} autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Mendaftar…' : 'Buat Akun'}</button>
      </form>
    </AuthShell>
  );
}

export function MyOrders() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'customer') api('/me/orders').then((d) => setOrders(d.orders)).catch((e) => setError(e.message));
  }, [user]);

  if (!ready) return null;
  if (!user) return <Navigate to="/login?next=/akun/pesanan" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/pesanan" replace />;

  return (
    <div className="container-x max-w-3xl py-10 lg:py-14">
      <p className="eyebrow">Halo, {user.name.split(' ')[0]}</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Pesanan Saya</h1>
      <div className="mt-8">
        {error ? <ErrorState message={error} /> : !orders ? <div className="skeleton h-40" /> : orders.length === 0 ? (
          <EmptyState title="Belum ada pesanan" text="Pesanan yang kamu buat saat login akan muncul di sini."
            action={<Link to="/koleksi" className="btn-primary">Mulai Belanja</Link>} />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {orders.map((o) => (
              <li key={o.code}>
                <Link to={`/pesanan/${o.code}?t=${o.token}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-soft sm:px-3">
                  <div>
                    <p className="font-semibold">#{o.code}</p>
                    <p className="text-sm text-mute">{formatDate(o.createdAt)} · {o.itemCount} item</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={o.status} label={o.statusLabel} />
                    <span className="font-semibold tabular-nums">{rupiah(o.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="container-x py-24">
      <p className="text-8xl font-extrabold tracking-tighter">404</p>
      <p className="mt-4 text-lg">Halaman ini nggak ketemu. Mungkin link-nya salah ketik.</p>
      <Link to="/" className="btn-primary mt-8">Balik ke beranda</Link>
    </div>
  );
}
