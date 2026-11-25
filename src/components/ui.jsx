import { Link } from 'react-router-dom';
import { discountPercent, formatSold, GENDER_LABEL, rupiah } from '../lib/format.js';
import { useWishlist } from '../context/WishlistContext.jsx';
import { modelImage } from '../lib/productImages.js';
import { ArrowIcon, HeartIcon } from './icons.jsx';

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div>
      {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-mute">{hint}</p>
      ) : null}
    </div>
  );
}

export function Price({ price, compareAt, className = '' }) {
  const off = discountPercent(price, compareAt);
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-semibold tabular-nums">{rupiah(price)}</span>
      {off > 0 && <span className="text-mute line-through text-[0.85em] tabular-nums">{rupiah(compareAt)}</span>}
    </span>
  );
}

/** Tombol hati (favorit). Dipakai di kartu produk dan halaman detail. */
export function WishlistButton({ product, className = '', size = 18 }) {
  const { has, toggle } = useWishlist();
  const liked = has(product.id);
  return (
    <button type="button" onClick={() => toggle(product)}
      aria-pressed={liked} aria-label={liked ? `Hapus ${product.name} dari favorit` : `Simpan ${product.name} ke favorit`}
      className={`flex items-center justify-center transition-[background-color,color,transform] duration-200 active:scale-90 ${
        liked ? 'bg-ink text-lemon' : 'bg-paper/90 text-ink hover:bg-lemon'
      } ${className}`}>
      <HeartIcon size={size} filled={liked} />
    </button>
  );
}

export function ProductCard({ product, index, priority = false }) {
  const off = discountPercent(product.price, product.compareAtPrice);
  const alt = modelImage(product.slug);
  return (
    // div pembungkus: tombol hati diletakkan DI LUAR <Link> (tombol di dalam link = HTML tidak valid)
    <div className="group relative">
    <Link to={`/produk/${product.slug}`} className="block">
      <div className="relative aspect-[4/5] overflow-hidden bg-studio">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          className={`h-full w-full object-cover transition-[transform,opacity] duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04] ${
            product.inStock ? '' : 'opacity-50 grayscale'
          } ${alt ? 'group-hover:opacity-0' : ''}`}
        />
        {alt && <img src={alt} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {!product.inStock && <span className="tag bg-ink px-2 py-1 text-paper">Habis</span>}
          {product.inStock && off > 0 && <span className="tag bg-lemon px-2 py-1">-{off}%</span>}
          {product.inStock && product.stock <= 5 && <span className="tag bg-paper px-2 py-1">Sisa {product.stock}</span>}
        </div>
        {index != null && <span className="tag absolute right-14 top-4 text-ink/45">{String(index).padStart(2, '0')}</span>}
        {product.inStock && (
          <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-ink px-4 py-3 text-paper transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-y-0">
            <span className="tag text-paper/70">{product.sizes.join(' · ')}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">Lihat <ArrowIcon size={14} /></span>
          </div>
        )}
      </div>
      <div className="mt-3.5 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="eyebrow !text-[10px]">{product.category.name} · {GENDER_LABEL[product.gender]}</p>
          <h3 className="mt-1.5 text-[15px] font-medium leading-snug group-hover:underline group-hover:underline-offset-4">{product.name}</h3>
          {product.sold > 0 && <p className="mt-1 font-mono text-[11px] text-mute">Terjual {formatSold(product.sold)}</p>}
        </div>
        <Price price={product.price} compareAt={product.compareAtPrice} className="shrink-0 flex-wrap !gap-x-2 !gap-y-0 text-sm sm:flex-col sm:!items-end" />
      </div>
    </Link>
    <WishlistButton product={product} className="absolute right-2.5 top-2.5 h-9 w-9" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i}>
      <div className="skeleton aspect-[4/5] !bg-studio" />
      <div className="skeleton mt-3.5 h-3 w-1/3" />
      <div className="skeleton mt-2 h-4 w-3/4" />
    </div>
  ));
}

/** Teks berjalan tanpa jeda (konten digandakan supaya loop mulus). */
export function Marquee({ items, className = '', separator = '✦', reverse = false }) {
  const row = (hidden) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6">{t}</span>
          <span className="text-lemon" aria-hidden="true">{separator}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`relative flex overflow-hidden whitespace-nowrap ${className}`}>
      <div className="flex animate-marquee" style={reverse ? { animationDirection: 'reverse' } : undefined}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

const STATUS_TONE = {
  menunggu_pembayaran: 'bg-soft text-ink',
  menunggu_verifikasi: 'bg-lemon text-ink',
  lunas: 'bg-ink text-paper',
  dikirim: 'bg-ink text-paper',
  selesai: 'border border-ink text-ink',
  dibatalkan: 'bg-danger/10 text-danger',
  kedaluwarsa: 'bg-soft text-mute line-through',
};

export function StatusBadge({ status, label }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${STATUS_TONE[status] || ''}`}>
      {label}
    </span>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 99, disabled, className = 'h-10' }) {
  return (
    <div className={`inline-flex items-center border border-line ${className}`}>
      <button type="button" className="h-full w-10 text-lg disabled:opacity-30" aria-label="Kurangi jumlah"
        onClick={() => onChange(value - 1)} disabled={disabled || value <= min}>−</button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="h-full w-10 text-lg disabled:opacity-30" aria-label="Tambah jumlah"
        onClick={() => onChange(value + 1)} disabled={disabled || value >= max}>+</button>
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="border border-dashed border-ink/25 bg-bone px-6 py-16 text-center">
      <p className="display-tight text-2xl">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-sm text-sm text-mute">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="border border-danger/30 bg-danger/5 px-6 py-10 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry && <button className="btn-outline btn-sm mt-4" onClick={onRetry}>Coba lagi</button>}
    </div>
  );
}
