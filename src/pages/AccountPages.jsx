import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { run, supabase } from '../lib/supabase.js';
import { ORDER_STATUS } from '../lib/catalog.js';
import { formatDate, rupiah } from '../lib/format.js';
import { useAuth } from '../context/AppContext.jsx';
import { EmptyState, ErrorState, Field, StatusBadge } from '../components/ui.jsx';
import { editorialImage } from '../lib/productImages.js';

// Hanya izinkan redirect internal (mencegah open redirect)
const safeNext = (v, fallback = '/') => (v && v.startsWith('/') && !v.startsWith('//') ? v : fallback);

function AuthShell({ eyebrow, title, children, footer }) {
  const photo = editorialImage('lookbook') || editorialImage('hero-1');
  return (
    <div className="grid min-h-[calc(100vh-6rem)] lg:grid-cols-2">
      {/* Panel visual (desktop) */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-paper">
          <p className="eyebrow !text-paper/60">UrbanStore · Drop 01</p>
          <p className="display mt-4 text-[clamp(2.4rem,4vw,4rem)]">Find your<br />everyday <span className="text-lemon">style.</span></p>
          <ul className="mt-8 grid grid-cols-3 gap-4 border-t border-paper/25 pt-5 font-mono text-[11px] uppercase tracking-[0.08em] text-paper/70">
            <li>Keranjang tersimpan</li><li>Invoice PDF</li><li>Urban Assistant</li>
          </ul>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-14 sm:px-8 sm:py-20">
        <div className="w-full max-w-md">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display mt-4 text-[clamp(2.6rem,6vw,4rem)]">{title}</h1>
          <div className="mt-10">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-mute">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* Logo "G" resmi Google (warna asli — sesuai pedoman tombol Sign in with Google) */
const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/** Tombol "Lanjutkan dengan Google" + garis pemisah "atau". */
function GoogleSignIn({ next, admin = false, label = 'Lanjutkan dengan Google' }) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go() {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle({ next, admin }); // berhasil → browser pindah ke Google
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <div>
      <button type="button" onClick={go} disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-3 border border-ink bg-paper text-sm font-semibold transition-colors hover:bg-soft disabled:opacity-60">
        <GoogleLogo />{busy ? 'Menghubungkan ke Google…' : label}
      </button>
      {error && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
      <div className="my-6 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
        <span className="h-px flex-1 bg-line" />atau pakai email<span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

/**
 * /auth/callback — tempat Google "mengembalikan" user setelah memilih akun.
 * supabase-js otomatis menukar ?code= menjadi sesi login; di sini kita tinggal
 * menunggu sesi siap, memeriksa role (untuk login admin), lalu meneruskan ke tujuan.
 */
export function AuthCallback() {
  const { user, ready, logout } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const admin = params.get('admin') === '1';
  const next = safeNext(params.get('next'), admin ? '/admin' : '/');
  // Google/Supabase mengirim ?error_description= kalau user menekan "Batal" atau ada salah konfigurasi
  const oauthError = params.get('error_description') || params.get('error');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || oauthError || error) return;
    if (!user) {
      // Sesi kadang baru masuk sesaat setelah halaman siap → beri jeda sebelum menyatakan gagal
      const t = setTimeout(() => setError('Login Google tidak berhasil. Coba lagi ya.'), 4000);
      return () => clearTimeout(t);
    }
    if (admin && user.role !== 'admin') {
      // Proteksi /admin: akun Google biasa tidak boleh masuk panel admin
      logout().then(() => setError(`Akun ${user.email} bukan akun Store Admin.`));
      return;
    }
    navigate(user.role === 'admin' && !admin && next === '/' ? '/admin' : next, { replace: true });
  }, [ready, user, admin, next, oauthError, error, logout, navigate]);

  const message = error || (oauthError && (/denied|cancel/i.test(oauthError) ? 'Login Google dibatalkan.' : oauthError));
  return (
    <AuthShell eyebrow={admin ? 'Store Admin' : 'Akun UrbanStore'} title={message ? 'Gagal masuk' : 'Sebentar…'}>
      {message ? (
        <>
          <p className="text-[15px] leading-relaxed text-danger" role="alert">{message}</p>
          <Link to={`${admin ? '/admin/login' : '/login'}?next=${encodeURIComponent(next)}`} className="btn-primary mt-8 w-full">Kembali ke halaman login</Link>
        </>
      ) : (
        <p className="text-[15px] text-mute" aria-live="polite">Menyelesaikan login dengan Google…</p>
      )}
    </AuthShell>
  );
}

export function Login({ admin = false }) {
  const { login, user, ready } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'), admin ? '/admin' : '/');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (ready && user && (!admin || user.role === 'admin')) {
    return <Navigate to={user.role === 'admin' && !admin && next === '/' ? '/admin' : next} replace />;
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.email.trim() || !form.password) return setError('Isi email dan password dulu ya.');
    setBusy(true);
    try {
      const u = await login(form.email, form.password, admin ? 'admin' : undefined);
      navigate(u.role === 'admin' && !admin && next === '/' ? '/admin' : next, { replace: true });
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
      <GoogleSignIn next={next} admin={admin} label={admin ? 'Masuk Admin dengan Google' : 'Lanjutkan dengan Google'} />
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
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
        {!admin && params.get('next')?.includes('chat=1') && (
          <p className="bg-soft p-3 text-xs text-mute">Login dulu untuk pakai AI Shopping Assistant ya.</p>
        )}
        {!admin && params.get('next')?.startsWith('/produk') && (
          <p className="bg-soft p-3 text-xs text-mute">Login dulu supaya bisa menambahkan produk ke keranjang.</p>
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
  const [sentTo, setSentTo] = useState('');

  if (user) return <Navigate to={next} replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    const fe = {};
    if (form.name.trim().length < 2) fe.name = 'Isi nama kamu (min. 2 huruf).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) fe.email = 'Format email belum bener.';
    if (form.password.length < 8) fe.password = 'Password minimal 8 karakter.';
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      const res = await register(form);
      if (res.needsConfirmation) setSentTo(form.email.trim());
      else navigate(next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthShell eyebrow="Akun UrbanStore" title="Cek email kamu">
        <p className="text-[15px] leading-relaxed">
          Kami sudah kirim link konfirmasi ke <b>{sentTo}</b>. Klik link itu untuk mengaktifkan akun, lalu login.
        </p>
        <p className="mt-3 text-sm text-mute">Nggak ada di inbox? Cek folder spam/promosi.</p>
        <Link to={`/login?next=${encodeURIComponent(next)}`} className="btn-primary mt-8 w-full">Ke halaman login</Link>
      </AuthShell>
    );
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell eyebrow="Akun UrbanStore" title="Daftar"
      footer={<>Udah punya akun? <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline">Masuk</Link></>}>
      <GoogleSignIn next={next} label="Daftar dengan Google" />
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
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Mendaftar…' : 'Buat Akun'}</button>
      </form>
    </AuthShell>
  );
}

export function MyOrders() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'customer') return;
    (async () => {
      try {
        await supabase.rpc('expire_overdue_orders');
        setOrders(await run(supabase.from('orders')
          .select('code, status, total, created_at, payment_deadline, items:order_items(qty)')
          .order('created_at', { ascending: false })));
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [user]);

  if (!ready) return null;
  if (!user) return <Navigate to="/login?next=/akun/pesanan" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/pesanan" replace />;

  return (
    <div className="container-x max-w-3xl py-10 lg:py-14">
      <p className="eyebrow">Halo, {user.name.split(' ')[0]}</p>
      <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4.5rem)]">Pesanan Saya</h1>
      <div className="mt-8">
        {error ? <ErrorState message={error} /> : !orders ? <div className="skeleton h-40" /> : orders.length === 0 ? (
          <EmptyState title="Belum ada pesanan" text="Pesanan yang kamu buat akan muncul di sini."
            action={<Link to="/koleksi" className="btn-primary">Mulai Belanja</Link>} />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {orders.map((o) => (
              <li key={o.code}>
                <Link to={`/pesanan/${o.code}`} className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-soft sm:px-3">
                  <div>
                    <p className="font-semibold">#{o.code}</p>
                    <p className="text-sm text-mute">
                      {formatDate(o.created_at)} · {o.items.reduce((s, i) => s + i.qty, 0)} item
                      {o.status === 'menunggu_pembayaran' && <> · <span className="text-danger">bayar sebelum {formatDate(o.payment_deadline)}</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={o.status} label={ORDER_STATUS[o.status]} />
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
