import { Link } from 'react-router-dom';
import { discountPercent, GENDER_LABEL, rupiah } from '../lib/format.js';

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

export function ProductCard({ product }) {
  const off = discountPercent(product.price, product.compareAtPrice);
  return (
    <Link to={`/produk/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-soft">
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
            product.inStock ? '' : 'opacity-50 grayscale'
          }`}
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {!product.inStock && <span className="bg-ink px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-paper">Habis</span>}
          {product.inStock && off > 0 && <span className="bg-lemon px-2 py-1 text-[11px] font-bold">-{off}%</span>}
          {product.inStock && product.stock <= 5 && (
            <span className="bg-paper px-2 py-1 text-[11px] font-semibold">Sisa {product.stock}</span>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p className="eyebrow">{product.category.name} · {GENDER_LABEL[product.gender]}</p>
        <h3 className="text-[15px] font-medium leading-snug group-hover:underline underline-offset-4">{product.name}</h3>
        <Price price={product.price} compareAt={product.compareAtPrice} className="text-sm" />
      </div>
    </Link>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i}>
      <div className="skeleton aspect-[4/5]" />
      <div className="skeleton mt-3 h-3 w-1/3" />
      <div className="skeleton mt-2 h-4 w-3/4" />
      <div className="skeleton mt-2 h-4 w-1/4" />
    </div>
  ));
}

const STATUS_TONE = {
  menunggu_pembayaran: 'bg-soft text-ink',
  menunggu_verifikasi: 'bg-lemon text-ink',
  lunas: 'bg-ink text-paper',
  dikirim: 'bg-ink text-paper',
  selesai: 'border border-ink text-ink',
  dibatalkan: 'bg-danger/10 text-danger',
};

export function StatusBadge({ status, label }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${STATUS_TONE[status] || ''}`}>
      {label}
    </span>
  );
}

export function QtyStepper({ value, onChange, min = 1, max = 99, disabled }) {
  return (
    <div className="inline-flex h-10 items-center border border-line">
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
    <div className="border border-dashed border-line px-6 py-16 text-center">
      <p className="text-lg font-semibold">{title}</p>
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
