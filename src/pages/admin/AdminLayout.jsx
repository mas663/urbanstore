import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AppContext.jsx';
import { Logo } from '../../components/Layout.jsx';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/produk', label: 'Produk' },
  { to: '/admin/pesanan', label: 'Pesanan' },
  { to: '/admin/analisis', label: 'Analisis AI' },
];

export default function AdminLayout() {
  const { user, ready, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!ready) return null;
  if (!user || user.role !== 'admin') {
    return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const linkCls = ({ isActive }) =>
    `whitespace-nowrap px-3 py-2 text-sm transition-colors ${isActive ? 'bg-ink text-paper' : 'text-mute hover:text-ink hover:bg-soft'}`;

  return (
    <div className="min-h-screen bg-soft/60">
      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin"><Logo /></Link>
            <span className="bg-lemon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Admin</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="btn-ghost btn-sm">Lihat Toko ↗</Link>
            <button className="btn-ghost btn-sm" onClick={async () => { await logout(); navigate('/admin/login'); }}>Keluar</button>
          </div>
        </div>
        <nav className="container-x -mb-px flex gap-1 overflow-x-auto pb-2" aria-label="Navigasi admin">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>{n.label}</NavLink>)}
        </nav>
      </header>
      <main className="container-x py-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{title}</h1>
      </div>
      {action}
    </div>
  );
}
