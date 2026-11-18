import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/* ── Toast ─────────────────────────────────────────────── */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((message, tone = 'default') => {
    clearTimeout(timer.current);
    setToast({ message, tone, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            className={`pointer-events-auto max-w-md px-5 py-3 text-sm font-medium ${
              toast.tone === 'error' ? 'bg-danger text-paper' : 'bg-ink text-paper'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ── Auth ──────────────────────────────────────────────── */
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(email, password, expectRole) {
        const d = await api('/auth/login', { method: 'POST', body: { email, password, expectRole } });
        setUser(d.user);
        return d.user;
      },
      async register(form) {
        const d = await api('/auth/register', { method: 'POST', body: form });
        setUser(d.user);
        return d.user;
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        setUser(null);
      },
    }),
    [user, ready],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

/* ── Cart (tersimpan di server, tanpa wajib login) ─────── */
const CartCtx = createContext(null);
const EMPTY = { items: [], count: 0, subtotal: 0, hasIssues: false };

export function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const refresh = useCallback(async () => {
    try {
      setCart(await api('/cart'));
    } catch {
      /* biarkan state lama */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(
    async (fn) => {
      setBusy(true);
      try {
        setCart(await fn());
        return true;
      } catch (err) {
        toast(err.message, 'error');
        refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast, refresh],
  );

  const value = useMemo(
    () => ({
      cart,
      busy,
      open,
      setOpen,
      refresh,
      add: (productId, size, qty = 1) =>
        run(() => api('/cart/items', { method: 'POST', body: { productId, size, qty } })),
      update: (id, qty) => run(() => api(`/cart/items/${id}`, { method: 'PATCH', body: { qty } })),
      remove: (id) => run(() => api(`/cart/items/${id}`, { method: 'DELETE' })),
      reset: () => setCart(EMPTY),
    }),
    [cart, busy, open, refresh, run],
  );
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export const useCart = () => useContext(CartCtx);
