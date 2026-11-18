import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { fetchProductBySlug, fetchRelated, fetchSizeCharts } from '../lib/catalog.js';
import { discountPercent, GENDER_LABEL } from '../lib/format.js';
import { useAuth, useCart, useToast } from '../context/AppContext.jsx';
import SizeGuide from '../components/SizeGuide.jsx';
import { RulerIcon } from '../components/icons.jsx';
import { ErrorState, Price, ProductCard, QtyStepper } from '../components/ui.jsx';

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

  return (
    <div className="container-x py-8 lg:py-12">
      <nav className="text-xs text-mute" aria-label="Breadcrumb">
        <Link to="/koleksi" className="hover:text-ink">Koleksi</Link> /{' '}
        <Link to={`/koleksi?category=${product.category.slug}`} className="hover:text-ink">{product.category.name}</Link> /{' '}
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <div className="relative bg-soft">
            <img src={product.imageUrl} alt={product.name}
              className={`aspect-[4/5] w-full object-cover ${product.inStock ? '' : 'opacity-50 grayscale'}`} />
            {!product.inStock && <span className="absolute left-4 top-4 bg-ink px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-paper">Habis</span>}
            {product.inStock && off > 0 && <span className="absolute left-4 top-4 bg-lemon px-3 py-1.5 text-xs font-bold">Hemat {off}%</span>}
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="eyebrow">{product.category.name} · {GENDER_LABEL[product.gender]}</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
            <Price price={product.price} compareAt={product.compareAtPrice} className="mt-4 text-xl" />
            <p className="mt-4 text-sm text-mute">Bahan: <span className="text-ink">{product.material || '-'}</span></p>

            {/* Varian: warna */}
            <div className="mt-8">
              <p className="label">Warna{color && <span className="ml-2 font-normal normal-case tracking-normal text-mute">{color}</span>}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Warna">
                {product.colors.map((c) => (
                  <button key={c} role="radio" aria-checked={color === c}
                    onClick={() => {
                      setColor(c);
                      setPickError('');
                      // Ukuran yang dipilih tidak tersedia/habis di warna baru → reset
                      if (size && stockFor(c, size) === 0 && product.sizes.length > 1) setSize('');
                    }}
                    className={`h-11 border px-4 text-sm font-medium transition-colors ${
                      color === c ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
                    } ${colorHasStock(c) ? '' : 'text-mute line-through'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Varian: ukuran (stok per warna) */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="label !mb-0">Ukuran</p>
                {product.category.sizeType !== 'onesize' && (
                  <button className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4"
                    onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide}>
                    <RulerIcon size={14} /> Size Guide
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Ukuran">
                {product.sizes.map((s) => {
                  const st = stockFor(color, s);
                  const exists = product.variants.some((v) => v.color === color && v.size === s);
                  return (
                    <button key={s} role="radio" aria-checked={size === s} disabled={!exists || st === 0}
                      onClick={() => { setSize(s); setPickError(''); }}
                      title={!exists ? 'Tidak tersedia untuk warna ini' : st === 0 ? 'Habis' : `Stok ${st}`}
                      className={`relative h-12 min-w-14 border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:text-mute/60 disabled:line-through ${
                        size === s ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
                      }`}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {pickError && <p className="mt-2 text-sm text-danger" role="alert">{pickError}</p>}
              {showGuide && (
                <div className="mt-5 border border-line p-4">
                  <SizeGuide chart={sizeChart} sizeType={product.category.sizeType} highlight={size} />
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <QtyStepper value={qty} max={Math.max(variant?.stock || 1, 1)} onChange={setQty} disabled={!product.inStock} />
              <button className="btn-primary flex-1" onClick={handleAdd} disabled={!product.inStock || busy}>
                {!product.inStock ? 'Stok Habis' : busy ? 'Menambahkan…' : user ? 'Add to Cart' : 'Login untuk Belanja'}
              </button>
            </div>
            <p className="mt-3 text-xs text-mute" aria-live="polite">{stockText}</p>

            {product.description && (
              <div className="mt-10 border-t border-line pt-6">
                <p className="label">Deskripsi</p>
                <div className="space-y-3 text-[15px] leading-relaxed text-ink/80">
                  {product.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="text-2xl font-bold tracking-tight">Cocok juga buat kamu</h2>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
