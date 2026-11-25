import { useEffect } from 'react';

/* Animasi muncul saat di-scroll untuk semua elemen .reveal / .reveal-clip di dalam root.
   MutationObserver ikut memantau konten yang dimuat belakangan (mis. produk dari Supabase). */
export function useRevealIn(rootRef, key) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const SELECTOR = '.reveal:not(.is-in), .reveal-clip:not(.is-in)';
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll(SELECTOR).forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = () => root.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [rootRef, key]);
}
