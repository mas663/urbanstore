import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { friendlyError, run, supabase } from '../lib/supabase.js';
import { resolveImage } from '../lib/productImages.js';

/* ── Toast ─────────────────────────────────────────────── */
const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((message, tone = 'default') => {
    clearTimeout(timer.current);
    setToast({ message, tone, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
        {toast && (
          <div key={toast.id}
            className={`pointer-events-auto max-w-md px-5 py-3 text-sm font-medium ${toast.tone === 'error' ? 'bg-danger text-paper' : 'bg-ink text-paper'}`}>
            {toast.message}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ── Auth (Supabase Auth: email + password, role dari tabel profiles) ── */
const AuthCtx = createContext(null);

async function loadProfile(authUser) {
  if (!authUser) return null;
  const { data } = await supabase.from('profiles').select('full_name, role, phone').eq('id', authUser.id).maybeSingle();
  return {
    id: authUser.id,
    email: authUser.email,
    name: data?.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
    role: data?.role || 'customer',
    phone: data?.phone || '',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const profile = await loadProfile(data.session?.user);
      if (active) {
        setUser(profile);
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Jangan await query Supabase langsung di callback ini (rekomendasi supabase-js) → tunda
      setTimeout(async () => {
        if (!active) return;
        if (event === 'SIGNED_OUT' || !session) setUser(null);
        else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') setUser(await loadProfile(session.user));
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    async login(email, password, expectRole) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(friendlyError(error));
      const profile = await loadProfile(data.user);
      if (expectRole === 'admin' && profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Akun ini bukan akun Store Admin.');
      }
      setUser(profile);
      return profile;
    },
    async register({ name, email, password }) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
      });
      if (error) throw new Error(friendlyError(error));
      // Jika konfirmasi email aktif di Supabase, session belum ada sampai user klik link email
      if (!data.session) return { needsConfirmation: true };
      const profile = await loadProfile(data.user);
      setUser(profile);
      return { user: profile };
    },
    async logout() {
      await supabase.auth.signOut();
      setUser(null);
    },
  }), [user, ready]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

/* ── Cart (tabel cart_items per customer, validasi stok di database) ── */
const CartCtx = createContext(null);
const EMPTY = { items: [], count: 0, subtotal: 0, hasIssues: false };

const CART_SELECT =
  'id, qty, variant:product_variants(id, color, size, stock, product:products(id, name, slug, price, image_url, is_active))';

function shapeCart(rows) {
  const items = rows.filter((r) => r.variant?.product).map((r) => {
    const v = r.variant;
    const p = v.product;
    let issue = null;
    if (!p.is_active) issue = 'Produk ini sudah tidak dijual.';
    else if (v.stock === 0) issue = 'Yah, varian ini habis.';
    else if (r.qty > v.stock) issue = `Stok cuma tersisa ${v.stock} pcs.`;
    return {
      id: r.id, variantId: v.id, productId: p.id, slug: p.slug, name: p.name, imageUrl: resolveImage(p.image_url),
      color: v.color, size: v.size, price: p.price, qty: r.qty, stock: v.stock, lineTotal: p.price * r.qty, issue,
    };
  });
  return {
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
    hasIssues: items.some((i) => i.issue),
  };
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const refresh = useCallback(async () => {
    if (!user || user.role !== 'customer') return setCart(EMPTY);
    try {
      setCart(shapeCart(await run(supabase.from('cart_items').select(CART_SELECT).order('id'))));
    } catch { /* biarkan state lama */ }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const mutate = useCallback(async (fn) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      return true;
    } catch (err) {
      toast(err.message, 'error');
      await refresh();
      return false;
    } finally {
      setBusy(false);
    }
  }, [refresh, toast]);

  const value = useMemo(() => ({
    cart, busy, open, setOpen, refresh,
    add: (variantId, qty = 1) => mutate(() => run(supabase.rpc('add_to_cart', { p_variant_id: variantId, p_qty: qty }))),
    update: (id, qty) => mutate(() => run(supabase.from('cart_items').update({ qty }).eq('id', id))),
    remove: (id) => mutate(() => run(supabase.from('cart_items').delete().eq('id', id))),
    reset: () => setCart(EMPTY),
  }), [cart, busy, open, refresh, mutate]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export const useCart = () => useContext(CartCtx);
