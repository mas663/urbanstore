import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { discountPercent, GENDER_LABEL } from '../lib/format.js';
import { useCart, useToast } from '../context/AppContext.jsx';
import SizeGuide from '../components/SizeGuide.jsx';
import { RulerIcon } from '../components/icons.jsx';
import { ErrorState, Price, ProductCard, QtyStepper } from '../components/ui.jsx';

export default function ProductDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const { add, busy, setOpen } = useCart();
  const toast = useToast();

  useEffect(() => {
    setData(null);
    setError(null);
    setSize('');
    setQty(1);
    setSizeError('');
    api(`/products/${slug}`)
      .then((d) => {
        setData(d);
        if (d.product.sizes.length === 1) setSize(d.product.sizes[0]);
        document.title = `${d.product.name} — UrbanStore`;
      })
      .catch((e) => setError(e));
    return () => { document.title = 'UrbanStore — Find Your Everyday Style'; };
  }, [slug]);

  if (error) {
    return (
      <div className="container-x py-20">
        <ErrorState message={error.message} />
        <Link to="/koleksi" className="btn-outline mt-6">Kembali ke katalog</Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container-x grid gap-10 py-10 lg:grid-cols-2">
        <div className="skeleton aspect-[4/5]" />
        <div className="space-y-4"><div className="skeleton h-4 w-1/4" /><div className="skeleton h-10 w-3/4" /><div className="skeleton h-6 w-1/3" /></div>
      </div>
    );
  }

  const { product, sizeChart, related } = data;
  const off = discountPercent(product.price, product.compareAtPrice);

  async function handleAdd() {
    if (!size) {
      setSizeError('Pilih ukuran dulu ya.');
      return;
    }
    const ok = await add(product.id, size, qty);
    if (ok) {
      toast(`${product.name} (${size}) masuk keranjang`);
      setOpen(true);
    }
  }

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

            <dl className="mt-8 grid grid-cols-2 gap-px border border-line bg-line text-sm">
              <div className="bg-paper p-3"><dt className="text-xs text-mute">Warna</dt><dd className="mt-1 font-medium">{product.colors.join(', ') || '-'}</dd></div>
              <div className="bg-paper p-3"><dt className="text-xs text-mute">Bahan</dt><dd className="mt-1 font-medium">{product.material || '-'}</dd></div>
            </dl>

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <p className="label !mb-0">Pilih ukuran</p>
                {product.category.sizeType !== 'onesize' && (
                  <button className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4"
                    onClick={() => setShowGuide((v) => !v)} aria-expanded={showGuide}>
                    <RulerIcon size={14} /> Size Guide
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Ukuran">
                {product.sizes.map((s) => (
                  <button key={s} role="radio" aria-checked={size === s} disabled={!product.inStock}
                    onClick={() => { setSize(s); setSizeError(''); }}
                    className={`h-12 min-w-14 border px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${
                      size === s ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              {sizeError && <p className="mt-2 text-sm text-danger" role="alert">{sizeError}</p>}
              {showGuide && (
                <div className="mt-5 border border-line p-4">
                  <SizeGuide chart={sizeChart} sizeType={product.category.sizeType} highlight={size} />
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <QtyStepper value={qty} max={Math.max(product.stock, 1)} onChange={setQty} disabled={!product.inStock} />
              <button className="btn-primary flex-1" onClick={handleAdd} disabled={!product.inStock || busy}>
                {product.inStock ? (busy ? 'Menambahkan…' : 'Add to Cart') : 'Stok Habis'}
              </button>
            </div>
            <p className="mt-3 text-xs text-mute">
              {product.inStock
                ? product.stock <= 5 ? `Buruan, stok tinggal ${product.stock} pcs.` : `Stok tersedia · ${product.stock} pcs`
                : 'Produk ini lagi habis. Cek produk lain di bawah ya.'}
            </p>

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
