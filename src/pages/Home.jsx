import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchSizeCharts } from '../lib/catalog.js';
import { rupiah } from '../lib/format.js';
import { editorialImage, resolveImage } from '../lib/productImages.js';
import { ArrowIcon, PlusIcon, RulerIcon } from '../components/icons.jsx';
import { Marquee, ProductCard, ProductGridSkeleton } from '../components/ui.jsx';
import RecentlyViewed from '../components/RecentlyViewed.jsx';

/* Landing page UrbanStore v2 — editorial streetwear.
   01 Hero · 02 Marquee · 03 Kategori · 04 Featured · 05 Shop the Look · 06 Size Finder
   07 Value · 08 Brand Story · 09 FAQ · 10 Final CTA · Footer (di Layout) */

const CATEGORIES = [
  { to: '/koleksi?gender=pria', label: 'Pria', sub: 'Tee, kemeja, jaket & celana', editorial: 'cat-pria', fallback: '/products/oversized-tee-black.svg', big: true },
  { to: '/koleksi?gender=wanita', label: 'Wanita', sub: 'Cropped, wide leg & layering', editorial: 'cat-wanita', fallback: '/products/poplin-shirt-white.svg' },
  { to: '/koleksi?category=jacket', label: 'Outerwear', sub: 'Work jacket & denim', editorial: 'cat-outerwear', fallback: '/products/work-jacket-olive.svg' },
  { to: '/koleksi?category=celana', label: 'Bawahan', sub: 'Cargo, chino & trousers', editorial: 'cat-essentials', fallback: '/products/cargo-pants-olive.svg' },
];

// Titik produk di foto lookbook (persen dari lebar/tinggi foto 16:9)
const LOOK = [
  { slug: 'everyday-cap', x: 51, y: 12, label: 'Topi' },
  { slug: 'urban-oversized-heavy-tee', x: 55, y: 33, label: 'Kaos' },
  { slug: 'canvas-tote-bag', x: 45, y: 48, label: 'Tote' },
  { slug: 'cargo-pants-olive', x: 50, y: 72, label: 'Cargo' },
];

const VALUES = [
  { n: '01', title: 'Kurasi, bukan katalog raksasa', text: 'Cuma item yang beneran wearable buat harian. Nggak perlu scroll ribuan produk buat nemu satu yang cocok.' },
  { n: '02', title: 'Size jelas dari awal', text: 'Size chart dalam cm plus estimasi tinggi & berat badan di setiap produk. Bye, salah ukuran.' },
  { n: '03', title: 'Checkout 3 langkah', text: 'Isi alamat, pilih pengiriman, review. Bayar transfer, upload bukti, beres.' },
  { n: '04', title: 'Pesanan transparan', text: 'Status pembayaran, invoice PDF, dan riwayat pesanan ada di satu tempat.' },
];

const FAQ = [
  ['Gimana cara milih ukuran yang pas?', 'Pakai Size Finder di halaman ini atau buka Size Guide di halaman produk. Di sana ada ukuran lebar dada / pinggang dan panjang dalam cm, plus estimasi tinggi & berat badan untuk tiap size. Kalau sudah punya akun, kamu juga bisa tanya Urban Assistant.'],
  ['Harus bikin akun dulu buat belanja?', 'Iya, cukup daftar pakai email & password (gratis, 1 menit). Dengan akun, keranjang kamu tersimpan, pesanan & invoice bisa dipantau, dan kamu bisa pakai Urban Assistant.'],
  ['Metode pembayarannya apa aja?', 'Saat ini pembayaran via transfer bank manual. Setelah checkout kamu dapat nomor order, info rekening, dan waktu 1 jam untuk transfer lalu upload bukti transfer. Admin memverifikasi dan mengubah status jadi Lunas. Lewat 1 jam tanpa bukti, pesanan dibatalkan otomatis.'],
  ['Ongkirnya berapa?', 'Ada dua pilihan: Regular Shipping Rp15.000 (2–4 hari kerja) dan Express Next Day Rp30.000.'],
  ['Gimana cara cek status pesanan?', 'Login lalu buka menu Pesanan Saya. Di sana ada status terbaru, riwayat, dan tombol download invoice PDF untuk setiap pesanan.'],
];

// Cadangan bila tabel size_charts belum bisa dimuat (nilai sama dengan seed)
const FALLBACK_CHART = [
  { size: 'S', tb: '155–165', bb: '45–55' },
  { size: 'M', tb: '163–172', bb: '55–65' },
  { size: 'L', tb: '170–178', bb: '65–75' },
  { size: 'XL', tb: '176–185', bb: '75–88' },
];

const range = (s) => String(s || '').split(/[–-]/).map(Number);
const gap = (v, [lo, hi]) => (v < lo ? lo - v : v > hi ? v - hi : 0);

/** Estimasi size dari tinggi & berat: berat lebih menentukan, tinggi sebagai pembanding. */
export function estimateSize(chart, tb, bb) {
  if (!tb || !bb || !chart.length) return null;
  let best = null;
  for (const row of chart) {
    const score = gap(bb, range(row.bb)) * 1 + gap(tb, range(row.tb)) * 0.6;
    if (!best || score < best.score) best = { size: row.size, score, row };
  }
  return best;
}

function SectionHead({ eyebrow, title, action, light = false }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={`eyebrow reveal ${light ? '!text-paper/50' : ''}`}>{eyebrow}</p>
        <h2 className="display reveal mt-4 text-[clamp(2rem,5vw,4rem)]" style={{ '--d': '80ms' }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState(null);
  const [chart, setChart] = useState(FALLBACK_CHART);
  const [activeLook, setActiveLook] = useState(1);
  const [tb, setTb] = useState('');
  const [bb, setBb] = useState('');
  const railRef = useRef(null);
  const hero = editorialImage('hero-1');
  const lookbook = editorialImage('lookbook');

  useEffect(() => {
    fetchProducts({ limit: 60 }).then(setProducts).catch(() => setProducts([]));
    fetchSizeCharts().then((c) => c.top?.length && setChart(c.top)).catch(() => {});
  }, []);

  const featured = useMemo(() => {
    if (!products) return null;
    const list = products.filter((p) => p.isFeatured);
    return (list.length >= 4 ? list : products).slice(0, 8);
  }, [products]);
  const bySlug = useMemo(() => Object.fromEntries((products || []).map((p) => [p.slug, p])), [products]);
  const lookItems = LOOK.map((l) => ({ ...l, product: bySlug[l.slug] })).filter((l) => l.product);
  const lookTotal = lookItems.reduce((s, l) => s + l.product.price, 0);
  const heroLook = ['urban-oversized-heavy-tee', 'cargo-pants-olive'].map((s) => bySlug[s]).filter(Boolean);
  const result = estimateSize(chart, Number(tb), Number(bb));
  const scrollRail = (dir) => railRef.current?.scrollBy({ left: dir * railRef.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <>
      {/* 01 · HERO */}
      <section className="relative overflow-hidden">
        <div className="container-x grid gap-10 pb-14 pt-8 lg:grid-cols-12 lg:gap-8 lg:pb-20 lg:pt-12">
          <div className="flex flex-col lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="tag bg-lemon px-2 py-1">Drop 01</span>
              <p className="eyebrow">Everyday Uniform · Pria & Wanita</p>
            </div>
            <h1 className="display mt-8 text-[clamp(3rem,7.3vw,7.4rem)]">
              <span className="reveal block">Find your</span>
              <span className="reveal block" style={{ '--d': '90ms' }}>everyday</span>
              <span className="reveal block" style={{ '--d': '180ms' }}>
                <span className="relative inline-block">
                  <span className="absolute inset-x-[-0.06em] bottom-[0.06em] top-[0.12em] -z-10 bg-lemon" aria-hidden="true" />
                  style.
                </span>
              </span>
            </h1>
            <div className="reveal mt-10 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end" style={{ '--d': '260ms' }}>
              <p className="max-w-md text-lg leading-relaxed text-ink/70">
                Outfit harian yang kece, size-nya jelas, checkout-nya cuma 3 langkah. No drama, no ribet.
              </p>
            </div>
            <div className="reveal mt-8 flex flex-wrap gap-3" style={{ '--d': '320ms' }}>
              <Link to="/koleksi" className="btn-primary h-14 px-8">Explore Collection <ArrowIcon size={18} /></Link>
              <a href="#size-finder" className="btn-outline h-14 px-6"><RulerIcon size={18} /> Cari ukuranku</a>
            </div>
            <dl className="reveal mt-auto grid grid-cols-3 gap-4 border-t border-ink pt-5 lg:mt-14" style={{ '--d': '380ms' }}>
              {[['Ukuran', 'S — XL'], ['Checkout', '3 langkah'], ['Ongkir', 'mulai 15K']].map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow !text-[10px]">{k}</dt>
                  <dd className="display-tight mt-2 text-lg sm:text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative lg:col-span-5">
            {hero ? (
              <div className="reveal-clip relative aspect-[4/5] overflow-hidden bg-studio">
                <img src={hero} alt="Model memakai Urban Oversized Heavy Tee hitam dan Cargo Pants Olive" fetchpriority="high"
                  className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="grid aspect-[4/5] grid-cols-2 gap-2">
                {(featured || []).slice(0, 2).map((p) => (
                  <img key={p.id} src={p.imageUrl} alt={p.name} className="h-full w-full bg-studio object-cover" />
                ))}
              </div>
            )}
            <div className="absolute -top-3 right-4 flex h-24 w-24 rotate-12 items-center justify-center rounded-full bg-lemon text-center sm:h-28 sm:w-28" aria-hidden="true">
              <span className="font-mono text-[10px] font-semibold uppercase leading-tight tracking-[0.1em]">New<br />Drop<br />2026</span>
            </div>
            {heroLook.length > 0 && (
              <div className="reveal absolute bottom-4 left-4 right-4 border border-ink bg-paper p-4 shadow-[6px_6px_0_0_var(--color-ink)] sm:left-auto sm:right-[-0.5rem] sm:w-72 lg:-left-16 lg:right-auto"
                style={{ '--d': '500ms' }}>
                <p className="eyebrow !text-[10px]">Dipakai di foto</p>
                <ul className="mt-3 space-y-2.5">
                  {heroLook.map((p) => (
                    <li key={p.id}>
                      <Link to={`/produk/${p.slug}`} className="group flex items-center gap-3">
                        <img src={p.imageUrl} alt="" className="h-14 w-11 shrink-0 bg-studio object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium group-hover:underline">{p.name}</span>
                          <span className="font-mono text-xs text-mute">{rupiah(p.price)}</span>
                        </span>
                        <ArrowIcon size={16} className="shrink-0 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 02 · MARQUEE */}
      <section className="border-y border-ink bg-ink py-5 text-paper" aria-label="Keunggulan UrbanStore">
        <Marquee items={['Everyday uniform', 'Size jelas dalam cm', 'Checkout 3 langkah', 'Kurasi Gen Z']}
          className="display text-[clamp(2rem,5.5vw,4.5rem)]" />
      </section>

      {/* 03 · KATEGORI */}
      <section className="container-x py-20 lg:py-28">
        <SectionHead eyebrow="Belanja per kategori" title={<>Pilih gaya<br />kamu</>}
          action={<Link to="/koleksi" className="link-grow reveal self-start py-1 text-sm font-semibold sm:self-auto">Lihat semua koleksi →</Link>} />
        <div className="mt-10 grid grid-cols-2 gap-2 sm:gap-3 lg:h-[40rem] lg:grid-cols-4 lg:grid-rows-2">
          {CATEGORIES.map((c, i) => (
            <Link key={c.label} to={c.to}
              className={`reveal group relative overflow-hidden bg-studio ${c.big ? 'col-span-2 aspect-[4/5] sm:aspect-[16/11] lg:row-span-2 lg:aspect-auto' : i === 3 ? 'col-span-2 aspect-[16/9] lg:aspect-auto' : 'aspect-[4/5] lg:aspect-auto'}`}
              style={{ '--d': `${i * 80}ms` }}>
              <img src={editorialImage(c.editorial) || resolveImage(c.fallback)} alt="" loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/0 to-ink/0" />
              <div className="relative flex h-full min-h-[11rem] flex-col justify-between p-4 text-paper sm:p-6">
                <span className="tag self-start bg-paper/90 px-2 py-1 text-ink">0{i + 1}</span>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className={c.big ? 'display text-[clamp(2.5rem,6vw,5rem)]' : 'display-tight text-[clamp(1.3rem,2.2vw,2rem)]'}>{c.label}</p>
                    <p className="mt-1 text-sm text-paper/80">{c.sub}</p>
                  </div>
                  <span className={`${c.big || i === 3 ? 'flex' : 'hidden sm:flex'} h-11 w-11 shrink-0 items-center justify-center bg-paper text-ink transition-colors group-hover:bg-lemon`}>
                    <ArrowIcon size={18} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 04 · FEATURED */}
      <section className="border-t border-line bg-bone py-20 lg:py-28">
        <div className="container-x">
          <SectionHead eyebrow="Featured · Lagi banyak dicari" title={<>Best<br />sellers</>}
            action={
              <div className="reveal flex gap-2">
                <button className="flex h-12 w-12 items-center justify-center border border-ink transition-colors hover:bg-ink hover:text-paper" onClick={() => scrollRail(-1)} aria-label="Geser ke kiri">
                  <ArrowIcon size={18} className="rotate-180" />
                </button>
                <button className="flex h-12 w-12 items-center justify-center border border-ink bg-ink text-paper transition-colors hover:bg-lemon hover:text-ink" onClick={() => scrollRail(1)} aria-label="Geser ke kanan">
                  <ArrowIcon size={18} />
                </button>
              </div>
            } />
        </div>
        <div ref={railRef} className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 sm:gap-5 sm:px-6 scroll-px-4 sm:scroll-px-6 lg:px-[max(2.5rem,calc((100vw_-_88rem)/2_+_2.5rem))] lg:scroll-px-[max(2.5rem,calc((100vw_-_88rem)/2_+_2.5rem))]">
          {featured === null ? (
            <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4"><ProductGridSkeleton count={4} /></div>
          ) : (
            featured.map((p, i) => (
              <div key={p.id} className="w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-[calc((100%-3.75rem)/4)]">
                <ProductCard product={p} index={i + 1} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* 04b · TERAKHIR DILIHAT (hanya muncul kalau pengunjung pernah membuka produk) */}
      <RecentlyViewed className="container-x pt-20 lg:pt-28" />

      {/* 05 · SHOP THE LOOK */}
      <section className="container-x py-20 lg:py-28">
        <SectionHead eyebrow="Shop the look" title={<>Satu look,<br />empat item</>} />
        <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="reveal-clip relative aspect-[4/5] min-w-0 overflow-hidden bg-studio sm:aspect-[16/10] lg:col-span-8 lg:aspect-auto lg:min-h-[34rem]">
            {lookbook ? (
              <img src={lookbook} alt="Lookbook: oversized tee hitam, cargo olive, topi hitam, dan canvas tote" loading="lazy"
                className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2">
                {lookItems.map((l) => <img key={l.slug} src={l.product.imageUrl} alt="" className="h-full w-full object-cover" />)}
              </div>
            )}
            {lookbook && lookItems.map((l, i) => (
              <button key={l.slug} type="button" onClick={() => setActiveLook(i)} onMouseEnter={() => setActiveLook(i)}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 left-[var(--xm)] top-[var(--y)] sm:left-[var(--x)]"
                style={{ '--x': `${l.x}%`, '--xm': `${((l.x - 27.5) / 45) * 100}%`, '--y': `${l.y}%` }}
                aria-label={`Lihat ${l.product.name}`} aria-pressed={activeLook === i}>
                <span className={`absolute inset-0 rounded-full bg-lemon ${activeLook === i ? 'animate-ping-slow' : ''}`} aria-hidden="true" />
                <span className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink font-mono text-xs font-bold transition-colors ${activeLook === i ? 'bg-ink text-lemon' : 'bg-lemon text-ink'}`}>
                  {activeLook === i ? i + 1 : <PlusIcon size={16} />}
                </span>
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-col lg:col-span-4">
            <ol className="divide-y divide-line border-y border-ink">
              {lookItems.map((l, i) => (
                <li key={l.slug}>
                  <Link to={`/produk/${l.slug}`} onMouseEnter={() => setActiveLook(i)}
                    className={`group flex items-center gap-4 py-4 transition-colors ${activeLook === i ? 'bg-lemon/40' : ''}`}>
                    <span className="w-6 pl-2 font-mono text-xs text-mute">0{i + 1}</span>
                    <img src={l.product.imageUrl} alt="" loading="lazy" className="h-20 w-16 shrink-0 bg-studio object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="eyebrow !text-[10px]">{l.label}</span>
                      <span className="mt-1 block truncate font-medium group-hover:underline">{l.product.name}</span>
                      <span className="font-mono text-sm">{rupiah(l.product.price)}</span>
                    </span>
                    <ArrowIcon size={18} className="mr-2 shrink-0 transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ol>
            {lookItems.length > 0 && (
              <div className="mt-6 flex items-end justify-between gap-4 lg:mt-auto lg:pt-6">
                <div>
                  <p className="eyebrow !text-[10px]">Total satu look</p>
                  <p className="display-tight mt-2 text-3xl">{rupiah(lookTotal)}</p>
                </div>
                <Link to={`/produk/${lookItems[activeLook]?.slug || lookItems[0].slug}`} className="btn-primary">
                  Mulai dari sini <ArrowIcon size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 06 · SIZE FINDER */}
      <section id="size-finder" className="scroll-mt-20 bg-ink text-paper">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-12 lg:py-28">
          <div className="lg:col-span-6">
            <p className="eyebrow reveal !text-paper/50">Size Finder</p>
            <h2 className="display reveal mt-4 text-[clamp(2.2rem,5.4vw,4.5rem)]" style={{ '--d': '80ms' }}>
              Nggak yakin size?<br /><span className="text-lemon">5 detik beres.</span>
            </h2>
            <p className="reveal mt-6 max-w-md leading-relaxed text-paper/65" style={{ '--d': '140ms' }}>
              Masukkan tinggi & berat badan. Kami cocokkan dengan size chart atasan UrbanStore (tee, kemeja, hoodie, jaket).
            </p>
          </div>
          <div className="reveal lg:col-span-6" style={{ '--d': '160ms' }}>
            <div className="grid grid-cols-2 gap-3">
              {[['tb', 'Tinggi badan', 'cm', tb, setTb, 140, 200], ['bb', 'Berat badan', 'kg', bb, setBb, 35, 130]].map(([id, label, unit, val, set, min, max]) => (
                <label key={id} htmlFor={`sf-${id}`} className="block border border-paper/25 p-4 transition-colors focus-within:border-lemon">
                  <span className="eyebrow !text-paper/50">{label}</span>
                  <span className="mt-2 flex items-baseline gap-2">
                    <input id={`sf-${id}`} type="number" inputMode="numeric" min={min} max={max} value={val} placeholder="—"
                      onChange={(e) => set(e.target.value.slice(0, 3))}
                      className="display-tight w-full bg-transparent text-5xl text-paper placeholder:text-paper/25 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                    <span className="font-mono text-sm text-paper/50">{unit}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex min-h-40 items-center gap-6 bg-paper p-6 text-ink" aria-live="polite">
              {result ? (
                <>
                  <span className="display flex h-24 w-24 shrink-0 items-center justify-center bg-lemon text-5xl">{result.size}</span>
                  <div>
                    <p className="display-tight text-xl">Rekomendasi size {result.size}</p>
                    <p className="mt-2 text-sm leading-relaxed text-mute">
                      Size {result.size} cocok untuk TB {result.row.tb} cm & BB {result.row.bb} kg{result.row.chest ? `, lebar dada ${result.row.chest} cm` : ''}.
                      {result.score > 4 ? ' Ukuran kamu agak di luar rentang, cek Size Guide di halaman produk ya.' : ' Suka lebih longgar? Naik 1 size.'}
                    </p>
                    <Link to="/koleksi" className="link-grow mt-3 inline-block py-0.5 text-sm font-semibold">Belanja size {result.size} →</Link>
                  </div>
                </>
              ) : (
                <p className="text-sm text-mute">Isi tinggi & berat badan untuk melihat rekomendasi. Estimasi dari size chart, bukan jaminan pas.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 07 · VALUE */}
      <section className="container-x py-20 lg:py-28">
        <SectionHead eyebrow="Kenapa UrbanStore" title={<>Belanja yang<br />bikin tenang</>} />
        <div className="mt-12 grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <div key={v.n} className={`reveal flex min-h-64 flex-col p-6 ${i === 1 ? 'bg-lemon' : 'bg-paper'}`} style={{ '--d': `${i * 80}ms` }}>
              <p className="display text-6xl text-ink/15">{v.n}</p>
              <h3 className="display-tight mt-auto pt-10 text-xl">{v.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 08 · BRAND STORY */}
      <section className="border-y border-line bg-bone">
        <div className="container-x grid gap-10 py-20 lg:grid-cols-12 lg:py-28">
          <p className="eyebrow reveal lg:col-span-3">Brand story</p>
          <div className="lg:col-span-9">
            <p className="display-tight reveal text-[clamp(1.6rem,3.4vw,2.9rem)] leading-[1.12]">
              UrbanStore lahir dari satu keresahan: belanja baju online harusnya nggak bikin pusing.{' '}
              <span className="text-ink/40">Kebanyakan pilihan, info ukuran nggak jelas, checkout berbelit. Jadi kami pilih jalan yang lebih simpel: kurasi yang rapi, informasi yang jujur, dan pengalaman belanja secepat scroll.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 09 · FAQ */}
      <section id="faq" className="container-x scroll-mt-20 py-20 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow reveal">FAQ</p>
            <h2 className="display reveal mt-4 text-[clamp(2rem,4.4vw,3.5rem)]" style={{ '--d': '80ms' }}>Yang sering<br />ditanyain</h2>
          </div>
          <div className="border-t border-ink lg:col-span-8">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center gap-5 py-6 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-xs text-mute">0{i + 1}</span>
                  <span className="flex-1">{q}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-ink transition-[transform,background-color] duration-300 group-open:rotate-45 group-open:bg-lemon">
                    <PlusIcon size={16} />
                  </span>
                </summary>
                <p className="-mt-1 max-w-2xl pb-6 pl-9 text-[15px] leading-relaxed text-ink/65">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 10 · FINAL CTA */}
      <section className="container-x">
        <div className="relative overflow-hidden bg-lemon px-6 py-14 sm:px-12 sm:py-20">
          <p className="eyebrow reveal !text-ink/60">Siap upgrade?</p>
          <h2 className="display reveal mt-5 max-w-4xl text-[clamp(2.6rem,7.5vw,7rem)]" style={{ '--d': '80ms' }}>
            Lemari kamu<br />butuh upgrade.
          </h2>
          <div className="reveal mt-10 flex flex-wrap gap-3" style={{ '--d': '160ms' }}>
            <Link to="/koleksi" className="btn-primary h-14 px-8">Mulai belanja <ArrowIcon size={18} /></Link>
            <Link to="/koleksi?sort=newest" className="btn-outline h-14 px-6">Lihat yang terbaru</Link>
          </div>
          <span className="display pointer-events-none absolute -bottom-6 right-4 hidden text-[14rem] leading-none text-ink/[0.07] lg:block" aria-hidden="true">01</span>
        </div>
      </section>
    </>
  );
}
