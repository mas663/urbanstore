import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchProductBySlug, fetchRelated, fetchSizeCharts } from '../lib/catalog.js';
import { discountPercent, GENDER_LABEL } from '../lib/format.js';
import { useAuth, useCart, useToast } from '../context/AppContext.jsx';
import SizeGuide from '../components/SizeGuide.jsx';
import { ArrowIcon, RulerIcon } from '../components/icons.jsx';
import { modelImage } from '../lib/productImages.js';
import { ErrorState, Price, ProductCard, QtyStepper } from '../components/ui.jsx';

const SWATCH = {
  Hitam: '#141414', Putih: '#fbfbf9', 'Off White': '#f1ede3', Krem: '#e4d9c3', Natural: '#e8e0cb',
  Olive: '#5f6640', 'Abu Tua': '#4b4b4b', 'Abu Muda': '#c9c9c6', 'Biru Denim': '#4d6c96',
};

const PERKS = [
  ['01', 'Size chart dalam cm + estimasi TB/BB'],
  ['02', 'Regular Rp15.000 · Express next day Rp30.000'],
  ['03', 'Bayar transfer, upload bukti, admin verifikasi'],
];

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [sizeChart, setSizeChart] = useState([]);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState(null);
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [pickError, setPickError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const { add, busy, setOpen } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    setProduct(null);
    setError(null);
    setSize('');
    setQty(1);
    setPickError('');
    (async () => {
      try {
        const p = await fetchProductBySlug(slug);
        if (!active) return;
        if (!p) throw new Error('Produk tidak ditemukan atau sudah tidak dijual.');
        setProduct(p);
        // Pilih otomatis warna pertama yang masih ada stok
        setColor(p.colors.find((c) => p.variants.some((v) => v.color === c && v.stock > 0)) || p.colors[0] || '');
        if (p.sizes.length === 1) setSize(p.sizes[0]);
        document.title = `${p.name} — UrbanStore`;
        const [charts, rel] = await Promise.all([fetchSizeCharts(), fetchRelated(p)]);
        if (!active) return;
        setSizeChart(charts[p.category.sizeType] || []);
        setRelated(rel);
      } catch (e) {
        if (active) setError(e);
      }
    })();
    return () => {
      active = false;
      document.title = 'UrbanStore — Find Your Everyday Style';
    };
  }, [slug]);

  const variant = useMemo(
    () => product?.variants.find((v) => v.color === color && v.size === size) || null,
    [product, color, size],
  );
  const stockFor = (c, s) => product?.variants.find((v) => v.color === c && v.size === s)?.stock ?? 0;
  const colorHasStock = (c) => product?.variants.some((v) => v.color === c && v.stock > 0);

  useEffect(() => {
    if (variant && qty > variant.stock) setQty(Math.max(1, variant.stock));
  }, [variant, qty]);

  if (error) {
    return (
      <div className="container-x py-20">
        <ErrorState message={error.message} />
        <Link to="/koleksi" className="btn-outline mt-6">Kembali ke katalog</Link>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="container-x grid gap-10 py-10 lg:grid-cols-2">
        <div className="skeleton aspect-[4/5]" />
        <div className="space-y-4"><div className="skeleton h-4 w-1/4" /><div className="skeleton h-10 w-3/4" /><div className="skeleton h-6 w-1/3" /></div>
      </div>
    );
  }

  const off = discountPercent(product.price, product.compareAtPrice);

  async function handleAdd() {
    if (!color) return setPickError('Pilih warna dulu ya.');
    if (!size) return setPickError('Pilih ukuran dulu ya.');
    if (!variant || variant.stock === 0) return setPickError('Varian ini lagi habis. Coba warna atau ukuran lain.');
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (user.role !== 'customer') {
      toast('Akun admin tidak bisa belanja. Pakai akun customer ya.', 'error');
      return;
    }
    const ok = await add(variant.id, qty);
    if (ok) {
      toast(`${product.name} (${color}, ${size}) masuk keranjang`);
      setOpen(true);
    }
  }

  const stockText = !product.inStock
    ? 'Produk ini lagi habis. Cek produk lain di bawah ya.'
    : variant
      ? variant.stock === 0
        ? 'Varian ini habis. Coba ukuran atau warna lain.'
        : variant.stock <= 3 ? `Buruan, stok varian ini tinggal ${variant.stock} pcs.` : `Stok tersedia · ${variant.stock} pcs`
      : 'Pilih warna & ukuran untuk melihat stok.';

  const alt = modelImage(product.slug);
  const dim = product.inStock ? '' : 'opacity-50 grayscale';

  return (
    <div className="container-x pb-8 pt-6 lg:pt-8">
      <nav className="font-mono text-[11px] uppercase tracking-[0.1em] text-mute" aria-label="Breadcrumb">
        <Link to="/koleksi" className="hover:text-ink">Koleksi</Link> <span className="mx-1.5">/</span>
        <Link to={`/koleksi?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link> <span className="mx-1.5">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14">
        {/* Galeri editorial: foto utama + close-up bahan + panel info */}
        <div className="min-w-0 lg:col-span-7">
          <div className="relative overflow-hidden bg-studio">
            <img src={product.imageUrl} alt={product.name} className={`aspect-[4/5] w-full object-cover ${dim}`} />
            <div className="absolute left-4 top-4 flex flex-col items-start gap-1.5">
              {!product.inStock && <span className="tag bg-ink px-2.5 py-1.5 text-paper">Habis</span>}
              {product.inStock && off > 0 && <span className="tag bg-lemon px-2.5 py-1.5">Hemat {off}%</span>}
            </div>
            <span className="tag absolute bottom-4 right-4 bg-paper/85 px-2 py-1 text-ink/60">01 / Front</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="relative aspect-square overflow-hidden bg-studio">
              <img src={alt || product.imageUrl} alt={alt ? `${product.name} dipakai model` : `Detail bahan ${product.name}`} loading="lazy"
                className={`h-full w-full object-cover ${alt ? '' : 'scale-[2.1] object-[50%_42%]'} ${dim}`} />
              <span className="tag absolute bottom-3 right-3 bg-paper/85 px-2 py-1 text-ink/60">{alt ? '02 / On body' : '02 / Detail'}</span>
            </div>
            <div className="flex aspect-square flex-col justify-between bg-ink p-5 text-paper sm:p-7">
              <p className="eyebrow !text-paper/50">Bahan</p>
              <p className="display-tight text-[clamp(1.2rem,2.6vw,2.2rem)] leading-[1.05]">{product.material || 'Detail bahan segera hadir'}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-lemon">{product.sizes.join(' · ')}</p>
            </div>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="eyebrow">{product.category.name} · {GENDER_LABEL[product.gender]}</p>
            <h1 className="display-tight mt-4 text-[clamp(2rem,4vw,3.25rem)]">{product.name}</h1>
            <div className="mt-5 flex items-baseline gap-3">
              <Price price={product.price} compareAt={product.compareAtPrice} className="text-2xl" />
              {off > 0 && <span className="tag bg-lemon px-2 py-1">-{off}%</span>}
            </div>

            {/* Varian: warna */}
            <div className="mt-9 border-t border-ink pt-6">
              <p className="label">Warna{color && <span className="ml-2 font-sans font-normal normal-case tracking-normal text-mute">{color}</span>}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Warna">
                {product.colors.map((c) => (
                  <button key={c} role="radio" aria-checked={color === c}
                    onClick={() => {
                      setColor(c);
                      setPickError('');
                      // Ukuran yang dipilih tidak tersedia/habis di warna baru → reset
                      if (size && stockFor(c, size) === 0 && product.sizes.length > 1) setSize('');
                    }}
                    className={`flex h-11 items-center gap-2.5 border pl-2 pr-4 text-sm font-medium transition-colors ${
                      color === c ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
                    } ${colorHasStock(c) ? '' : 'text-mute line-through'}`}>
                    <span className="h-6 w-6 border border-ink/15" style={{ background: SWATCH[c] || 'var(--color-studio)' }} aria-hidden="true" />
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Varian: ukuran (stok per warna) */}
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <p className="label !mb-0">Ukuran</p>
                {product.category.sizeType !== 'onesize' && (
                  <button className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4"
                    onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide}>
                    <RulerIcon size={14} /> Size Guide
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Ukuran">
                {product.sizes.map((s) => {
                  const st = stockFor(color, s);
                  const exists = product.variants.some((v) => v.color === color && v.size === s);
                  return (
                    <button key={s} role="radio" aria-checked={size === s} disabled={!exists || st === 0}
                      onClick={() => { setSize(s); setPickError(''); }}
                      title={!exists ? 'Tidak tersedia untuk warna ini' : st === 0 ? 'Habis' : `Stok ${st}`}
                      className={`relative h-14 border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-soft disabled:text-mute/60 disabled:line-through ${
                        product.sizes.length === 1 ? 'col-span-4' : ''
                      } ${size === s ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {pickError && <p className="mt-2 text-sm text-danger" role="alert">{pickError}</p>}
              {showGuide && (
                <div className="mt-5 border border-ink bg-bone p-4">
                  <SizeGuide chart={sizeChart} sizeType={product.category.sizeType} highlight={size} />
                </div>
              )}
            </div>

            <div className="mt-8 flex items-stretch gap-2">
              <QtyStepper value={qty} max={Math.max(variant?.stock || 1, 1)} onChange={setQty} disabled={!product.inStock} className="h-14" />
              <button className="btn-primary h-14 flex-1 text-[15px]" onClick={handleAdd} disabled={!product.inStock || busy}>
                {!product.inStock ? 'Stok Habis' : busy ? 'Menambahkan…' : user ? <>Add to Cart <ArrowIcon size={18} /></> : 'Login untuk Belanja'}
              </button>
            </div>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-mute" aria-live="polite">{stockText}</p>

            <ul className="mt-8 divide-y divide-line border-y border-line">
              {PERKS.map(([n, t]) => (
                <li key={n} className="flex items-center gap-4 py-3.5 text-sm">
                  <span className="font-mono text-[11px] text-mute">{n}</span>{t}
                </li>
              ))}
            </ul>

            {product.description && (
              <details className="group border-b border-line" open>
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 [&::-webkit-details-marker]:hidden">
                  <span className="label !mb-0">Deskripsi</span>
                  <span className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="space-y-3 pb-5 text-[15px] leading-relaxed text-ink/75">
                  {product.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24 border-t border-ink pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Rekomendasi</p>
              <h2 className="display mt-3 text-[clamp(1.8rem,4vw,3rem)]">Cocok juga<br />buat kamu</h2>
            </div>
            <Link to="/koleksi" className="link-grow hidden py-1 text-sm font-semibold sm:block">Lihat semua →</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
