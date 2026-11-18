import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useCart } from '../context/AppContext.jsx';
import { BagIcon, CloseIcon, MenuIcon, UserIcon } from './icons.jsx';
import CartDrawer from './CartDrawer.jsx';
import ChatWidget from './ChatWidget.jsx';

const NAV = [
  { to: '/koleksi', label: 'Semua Koleksi' },
  { to: '/koleksi?gender=pria', label: 'Pria' },
  { to: '/koleksi?gender=wanita', label: 'Wanita' },
  { to: '/cek-pesanan', label: 'Cek Pesanan' },
];

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[17px] font-extrabold tracking-[-0.02em] ${className}`}>
      URBANSTORE<span className="inline-block h-2 w-2 bg-lemon" aria-hidden="true" />
    </span>
  );
}

function Header() {
  const { cart, setOpen } = useCart();
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenu(false);
    setAccount(false);
  }, [location.pathname, location.search]);

  const isActive = (to) => location.pathname + location.search === to;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-10">
          <button className="-ml-2 p-2 lg:hidden" onClick={() => setMenu(true)} aria-label="Buka menu">
            <MenuIcon />
          </button>
          <Link to="/" aria-label="UrbanStore beranda"><Logo /></Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigasi utama">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to}
                className={`text-sm transition-colors hover:text-ink ${isActive(n.to) ? 'font-semibold text-ink' : 'text-mute'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            {user ? (
              <button className="btn-ghost" onClick={() => setAccount((v) => !v)} aria-expanded={account}>
                <UserIcon /><span className="hidden max-w-[110px] truncate sm:inline">{user.name.split(' ')[0]}</span>
              </button>
            ) : (
              <Link to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} className="btn-ghost">
                <UserIcon /><span className="hidden sm:inline">Masuk</span>
              </Link>
            )}
            {account && user && (
              <div className="absolute right-0 top-12 w-52 border border-line bg-paper py-2 text-sm">
                <p className="truncate px-4 pb-2 text-xs text-mute">{user.email}</p>
                {user.role === 'admin' ? (
                  <Link to="/admin" className="block px-4 py-2 hover:bg-soft">Dashboard Admin</Link>
                ) : (
                  <Link to="/akun/pesanan" className="block px-4 py-2 hover:bg-soft">Pesanan Saya</Link>
                )}
                <button className="block w-full px-4 py-2 text-left hover:bg-soft"
                  onClick={async () => { await logout(); navigate('/'); }}>
                  Keluar
                </button>
              </div>
            )}
          </div>
          <button className="btn-ghost relative" onClick={() => setOpen(true)} aria-label={`Keranjang, ${cart.count} item`}>
            <BagIcon />
            {cart.count > 0 && (
              <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center bg-lemon px-1 text-[10px] font-bold">
                {cart.count}
              </span>
            )}
          </button>
        </div>
      </div>

      {menu && (
        <div className="fixed inset-0 z-50 bg-paper lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="container-x flex h-16 items-center justify-between border-b border-line">
            <Logo />
            <button className="-mr-2 p-2" onClick={() => setMenu(false)} aria-label="Tutup menu"><CloseIcon /></button>
          </div>
          <nav className="container-x flex flex-col py-6">
            {NAV.map((n, i) => (
              <NavLink key={n.to} to={n.to} className="flex items-baseline gap-4 border-b border-line py-5 text-2xl font-semibold tracking-tight">
                <span className="text-xs font-normal text-mute">0{i + 1}</span>{n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-mute">Fashion pria & wanita yang dikurasi buat Gen Z. Size jelas, checkout cepat, no drama.</p>
        </div>
        <div>
          <p className="eyebrow mb-4">Belanja</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/koleksi" className="hover:underline">Semua Koleksi</Link></li>
            <li><Link to="/koleksi?gender=pria" className="hover:underline">Pria</Link></li>
            <li><Link to="/koleksi?gender=wanita" className="hover:underline">Wanita</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Bantuan</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/cek-pesanan" className="hover:underline">Cek Pesanan</Link></li>
            <li><Link to="/#faq" className="hover:underline">FAQ</Link></li>
            <li><Link to="/akun/pesanan" className="hover:underline">Pesanan Saya</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Untuk Toko</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/admin" className="hover:underline">Store Admin</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col justify-between gap-2 py-6 text-xs text-mute sm:flex-row">
          <p>© {new Date().getFullYear()} UrbanStore. Project Vibe Coding Bootcamp Batch 4.</p>
          <p>Swiss Style × Japanese Minimalism</p>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
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
