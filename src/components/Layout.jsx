import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../context/AppContext.jsx';
import { useRevealIn } from '../lib/useReveal.js';
import { ArrowIcon, BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from './icons.jsx';
import { Marquee } from './ui.jsx';
import CartDrawer from './CartDrawer.jsx';
import ChatWidget from './ChatWidget.jsx';

const NAV = [
  { to: '/koleksi', label: 'Semua Koleksi' },
  { to: '/koleksi?gender=pria', label: 'Pria' },
  { to: '/koleksi?gender=wanita', label: 'Wanita' },
  { to: '/akun/pesanan', label: 'Pesanan Saya' },
];

const ANNOUNCEMENTS = [
  'Size chart dalam cm di setiap produk',
  'Checkout cuma 3 langkah',
  'Regular Rp15.000 · Express next day Rp30.000',
  'Urban Assistant siap bantu pilih size',
  'Invoice PDF otomatis setiap pesanan',
];

export function Logo({ className = '', invert = false }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`flex h-5 w-5 items-center justify-center ${invert ? 'bg-lemon text-ink' : 'bg-ink text-lemon'}`} aria-hidden="true">
        <span className="h-2 w-2 bg-current" />
      </span>
      <span className="display text-[17px] leading-none tracking-[-0.02em]">Urbanstore</span>
    </span>
  );
}

function Header() {
  const { cart, setOpen } = useCart();
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenu(false);
    setAccount(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menu]);

  const isActive = (to) => location.pathname + location.search === to;
  // Di halaman login/daftar, pertahankan tujuan redirect yang sudah ada (hindari next bersarang)
  const onAuthPage = ['/login', '/daftar'].includes(location.pathname);
  const loginHref = onAuthPage
    ? `/login${location.search}`
    : `/login?next=${encodeURIComponent(location.pathname + location.search)}`;

  return (
    <>
      <div className="bg-ink py-2 text-paper">
        <Marquee items={ANNOUNCEMENTS} className="font-mono text-[11px] uppercase tracking-[0.12em]" />
      </div>
      <header className={`sticky top-0 z-40 border-b bg-paper/90 backdrop-blur-md transition-colors ${scrolled ? 'border-line' : 'border-transparent'}`}>
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="-ml-2 p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Buka menu">
              <MenuIcon />
            </button>
            <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigasi utama">
              {NAV.slice(0, 3).map((n) => (
                <Link key={n.to} to={n.to}
                  className={`link-grow py-1 text-sm ${isActive(n.to) ? 'font-semibold text-ink [background-size:100%_1px]' : 'text-ink/70 hover:text-ink'}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link to="/" aria-label="UrbanStore beranda"><Logo /></Link>

          <div className="flex items-center justify-end gap-0.5">
            <Link to="/koleksi" className="btn-ghost hidden !px-2.5 sm:inline-flex" aria-label="Cari produk"><SearchIcon /></Link>
            {user?.role !== 'admin' && (
              <Link to="/akun/pesanan" className="link-grow mr-3 hidden py-1 text-sm text-ink/70 hover:text-ink lg:inline">Pesanan Saya</Link>
            )}
            <div className="relative">
              {user ? (
                <button className="btn-ghost !px-2.5" onClick={() => setAccount((v) => !v)} aria-expanded={account} aria-haspopup="menu">
                  <UserIcon /><span className="hidden max-w-[110px] truncate sm:inline">{user.name.split(' ')[0]}</span>
                </button>
              ) : (
                <Link to={loginHref} className="btn-ghost !px-2.5">
                  <UserIcon /><span className="hidden sm:inline">Masuk</span>
                </Link>
              )}
              {account && user && (
                <div className="absolute right-0 top-12 w-56 border border-ink bg-paper py-2 text-sm shadow-[6px_6px_0_0_var(--color-ink)]" role="menu">
                  <p className="truncate px-4 pb-2 font-mono text-[11px] text-mute">{user.email}</p>
                  {user.role === 'admin' ? (
                    <Link to="/admin" className="block px-4 py-2.5 hover:bg-lemon" role="menuitem">Dashboard Admin</Link>
                  ) : (
                    <Link to="/akun/pesanan" className="block px-4 py-2.5 hover:bg-lemon" role="menuitem">Pesanan Saya</Link>
                  )}
                  <button className="block w-full px-4 py-2.5 text-left hover:bg-lemon" role="menuitem"
                    onClick={async () => { await logout(); navigate('/'); }}>
                    Keluar
                  </button>
                </div>
              )}
            </div>
            <button className="btn-ghost relative !px-2.5" onClick={() => setOpen(true)} aria-label={`Keranjang, ${cart.count} item`}>
              <BagIcon />
              {cart.count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center bg-lemon px-1 font-mono text-[10px] font-bold">
                  {cart.count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {menu && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink text-paper lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="container-x flex h-16 items-center justify-between border-b border-paper/15">
            <Logo invert />
            <button className="-mr-2 p-2" onClick={() => setMenu(false)} aria-label="Tutup menu"><CloseIcon /></button>
          </div>
          <nav className="container-x flex flex-1 flex-col justify-center gap-1 py-8">
            {NAV.map((n, i) => (
              <Link key={n.to} to={n.to}
                className="reveal is-in group flex items-baseline justify-between border-b border-paper/15 py-5"
                style={{ '--d': `${i * 60}ms` }}>
                <span className="display text-[clamp(2rem,9vw,3.25rem)] transition-colors group-hover:text-lemon">{n.label}</span>
                <span className="font-mono text-xs text-paper/50">0{i + 1}</span>
              </Link>
            ))}
          </nav>
          <div className="container-x pb-8 font-mono text-[11px] uppercase tracking-[0.12em] text-paper/50">
            Fashion harian Gen Z · Pria & Wanita
          </div>
        </div>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer className="mt-28 bg-ink text-paper">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="display text-[clamp(2.2rem,4.6vw,3.75rem)]">Dress for<br />the <span className="text-lemon">everyday.</span></p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-paper/60">
            Fashion pria & wanita yang dikurasi buat Gen Z. Size jelas, checkout cepat, no drama.
          </p>
          <Link to="/koleksi" className="btn-lemon mt-8">Belanja sekarang <ArrowIcon size={18} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
          {[
            ['Belanja', [['/koleksi', 'Semua Koleksi'], ['/koleksi?gender=pria', 'Pria'], ['/koleksi?gender=wanita', 'Wanita'], ['/koleksi?sort=newest', 'Terbaru']]],
            ['Bantuan', [['/#faq', 'FAQ'], ['/akun/pesanan', 'Pesanan Saya'], ['/#size-finder', 'Cari Ukuran']]],
            ['Untuk Toko', [['/admin', 'Store Admin']]],
          ].map(([title, links]) => (
            <div key={title}>
              <p className="eyebrow !text-paper/45">{title}</p>
              <ul className="mt-5 space-y-3 text-sm">
                {links.map(([to, label]) => (
                  <li key={to}><Link to={to} className="link-grow text-paper/85 hover:text-paper">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="container-x overflow-hidden" aria-hidden="true">
        <p className="display select-none whitespace-nowrap text-center text-[12.4vw] leading-[0.8] text-paper/[0.07] xl:text-[9.6rem]">
          Urbanstore
        </p>
      </div>
      <div className="border-t border-paper/15">
        <div className="container-x flex flex-col justify-between gap-2 py-6 font-mono text-[11px] uppercase tracking-[0.1em] text-paper/45 sm:flex-row">
          <p>© {new Date().getFullYear()} UrbanStore · Project Vibe Coding Bootcamp Batch 4</p>
          <p>Jakarta · Editorial streetwear</p>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const rootRef = useRef(null);
  useRevealIn(rootRef, pathname);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div ref={rootRef} className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-lemon focus:px-4 focus:py-2">
        Langsung ke konten
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
    </div>
  );
}
