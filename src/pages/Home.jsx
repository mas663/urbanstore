import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../lib/catalog.js';
import { ArrowIcon } from '../components/icons.jsx';
import { ProductCard, ProductGridSkeleton } from '../components/ui.jsx';

/* Struktur landing page UrbanStore (Sesi 3):
   01 Hero · 02 Value Proposition · 03 Featured Collection · 04 Benefits
   05 Brand Story · 06 FAQ · 07 Final CTA · 08 Footer (di Layout) */

const VALUES = [
  { n: '01', title: 'Kurasi, bukan katalog raksasa', text: 'Cuma item yang beneran wearable buat harian. Nggak perlu scroll ribuan produk buat nemu satu yang cocok.' },
  { n: '02', title: 'Size jelas dari awal', text: 'Setiap produk punya size chart visual dalam cm plus estimasi tinggi & berat badan. Bye, salah ukuran.' },
  { n: '03', title: 'Checkout 3 langkah', text: 'Isi alamat, pilih pengiriman, review. Done. Bayar transfer, upload bukti, beres.' },
];

const BENEFITS = [
  ['Bahan dijelasin detail', 'Jenis kain dan ketebalannya ditulis di setiap produk, jadi kamu tahu apa yang kamu beli.'],
  ['Harga transparan', 'Total = harga barang + ongkir flat. Kelihatan dari awal, nggak ada biaya kejutan.'],
  ['Foto produk jadi fokus', 'Tampilan bersih tanpa banner iklan yang ganggu. Kamu fokus ke outfit-nya.'],
  ['Pantau pesanan gampang', 'Semua pesanan, invoice PDF, dan status pembayaran ada di menu Pesanan Saya.'],
];

const FAQ = [
  ['Gimana cara milih ukuran yang pas?', 'Buka halaman produk lalu cek Size Guide. Di sana ada ukuran lebar dada / pinggang dan panjang dalam cm, plus estimasi tinggi & berat badan untuk tiap size. Kalau sudah punya akun, kamu juga bisa tanya AI Shopping Assistant.'],
  ['Harus bikin akun dulu buat belanja?', 'Iya, cukup daftar pakai email & password (gratis, 1 menit). Dengan akun, keranjang kamu tersimpan, pesanan & invoice bisa dipantau, dan kamu bisa pakai AI Shopping Assistant.'],
  ['Metode pembayarannya apa aja?', 'Saat ini pembayaran via transfer bank manual. Setelah checkout kamu dapat nomor order, info rekening, dan waktu 1 jam untuk transfer lalu upload bukti transfer. Admin memverifikasi dan mengubah status jadi Lunas. Lewat 1 jam tanpa bukti, pesanan dibatalkan otomatis.'],
  ['Ongkirnya berapa?', 'Ada dua pilihan: Regular Shipping Rp15.000 (2–4 hari kerja) dan Express Next Day Rp30.000.'],
  ['Gimana cara cek status pesanan?', 'Login lalu buka menu Pesanan Saya. Di sana ada status terbaru, riwayat, dan tombol download invoice PDF untuk setiap pesanan (contoh nomor order: URB-2026-001).'],
];

export default function Home() {
  const [featured, setFeatured] = useState(null);

  useEffect(() => {
    fetchProducts({ featured: true, limit: 6 })
      .then(setFeatured)
      .catch(() => setFeatured([]));
  }, []);

  const heroImages = (featured || []).slice(0, 2);

  return (
    <>
      {/* 01 · HERO */}
      <section className="border-b border-line">
        <div className="container-x grid gap-10 py-12 lg:grid-cols-12 lg:gap-6 lg:py-20">
          <div className="flex flex-col justify-between lg:col-span-6">
            <p className="eyebrow">New Season · Koleksi Harian</p>
            <div className="mt-8 lg:mt-0">
              <h1 className="text-[clamp(2.75rem,7vw,5.75rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
                Find Your<br />Everyday<br /><span className="mt-[0.12em] inline-block bg-lemon px-2 -mx-2 leading-[0.95]">Style.</span>
              </h1>
              <p className="mt-8 max-w-md text-lg text-mute">
                Outfit harian yang kece, size-nya jelas, checkout-nya cuma 3 langkah. No drama, no ribet.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/koleksi" className="btn-primary">Explore Collection <ArrowIcon size={18} /></Link>
                <Link to="/koleksi?gender=wanita" className="btn-outline">Lihat Koleksi Wanita</Link>
              </div>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 border-t border-line pt-6 text-sm">
              <div><dt className="text-mute">Kategori</dt><dd className="mt-1 text-xl font-semibold">Pria & Wanita</dd></div>
              <div><dt className="text-mute">Checkout</dt><dd className="mt-1 text-xl font-semibold">3 langkah</dd></div>
              <div><dt className="text-mute">Ukuran</dt><dd className="mt-1 text-xl font-semibold">S — XL</dd></div>
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-6">
            {featured === null
              ? [0, 1].map((i) => <div key={i} className={`skeleton aspect-[4/5] ${i ? 'mt-12' : ''}`} />)
              : heroImages.map((p, i) => (
                  <Link key={p.id} to={`/produk/${p.slug}`} className={`group relative block ${i ? 'mt-12' : ''}`}>
                    <img src={p.imageUrl} alt={p.name} className="aspect-[4/5] w-full bg-soft object-cover" />
                    <span className="absolute bottom-0 left-0 bg-paper px-3 py-2 text-xs font-medium group-hover:bg-lemon">{p.name}</span>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* 02 · VALUE PROPOSITION */}
      <section className="container-x py-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Kenapa UrbanStore</p>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">Tampil stylish tiap hari, tanpa repot & tanpa ragu ukuran.</h2>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-3 lg:col-span-8">
            {VALUES.map((v) => (
              <div key={v.n} className="bg-paper p-6 sm:pt-0">
                <p className="text-sm font-semibold text-mute">{v.n}</p>
                <h3 className="mt-6 text-lg font-semibold leading-snug">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mute">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 · FEATURED COLLECTION */}
      <section className="border-t border-line">
        <div className="container-x py-20">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/koleksi?gender=pria', label: 'Pria', sub: 'Tee, kemeja, jaket & celana', bg: 'bg-ink text-paper' },
              { to: '/koleksi?gender=wanita', label: 'Wanita', sub: 'Cropped, wide leg & layering', bg: 'bg-soft' },
            ].map((c) => (
              <Link key={c.label} to={c.to} className={`group flex aspect-[16/9] flex-col justify-between p-6 sm:p-8 ${c.bg}`}>
                <p className="eyebrow !text-current opacity-60">Koleksi</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-5xl font-extrabold tracking-tight sm:text-6xl">{c.label}</p>
                    <p className="mt-2 text-sm opacity-70">{c.sub}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center border border-current transition-colors group-hover:bg-lemon group-hover:text-ink group-hover:border-lemon">
                    <ArrowIcon />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-20 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Lagi banyak dicari</h2>
            </div>
            <Link to="/koleksi" className="hidden text-sm font-semibold underline underline-offset-4 sm:block">Lihat semua</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-3">
            {featured === null ? <ProductGridSkeleton count={6} /> : featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <Link to="/koleksi" className="btn-outline mt-10 w-full sm:hidden">Lihat semua koleksi</Link>
        </div>
      </section>

      {/* 04 · BENEFITS */}
      <section className="bg-soft">
        <div className="container-x grid gap-10 py-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Benefits</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Belanja yang bikin tenang.</h2>
          </div>
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-8">
            {BENEFITS.map(([t, d]) => (
              <li key={t} className="border-t border-ink pt-4">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 05 · BRAND STORY */}
      <section className="container-x py-24">
        <div className="grid gap-10 lg:grid-cols-12">
          <p className="eyebrow lg:col-span-3">Brand Story</p>
          <div className="lg:col-span-9">
            <p className="text-[clamp(1.6rem,3.6vw,2.75rem)] font-semibold leading-[1.15] tracking-tight">
              UrbanStore lahir dari satu keresahan: belanja baju online harusnya nggak bikin pusing.
              <span className="text-mute"> Kebanyakan pilihan, info ukuran nggak jelas, checkout berbelit. Jadi kami pilih jalan yang lebih simpel: kurasi yang rapi, informasi yang jujur, dan pengalaman belanja secepat scroll.</span>
            </p>
          </div>
        </div>
      </section>

      {/* 06 · FAQ */}
      <section id="faq" className="border-t border-line scroll-mt-16">
        <div className="container-x grid gap-10 py-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Yang sering ditanyain.</h2>
          </div>
          <div className="divide-y divide-line border-y border-line lg:col-span-8">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mute">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 07 · FINAL CTA */}
      <section className="container-x">
        <div className="flex flex-col items-start justify-between gap-8 bg-ink p-8 text-paper sm:p-14 lg:flex-row lg:items-end">
          <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
            Lemari kamu siap di-<span className="text-lemon">upgrade</span>?
          </h2>
          <Link to="/koleksi" className="btn-lemon">Mulai Belanja <ArrowIcon size={18} /></Link>
        </div>
      </section>
    </>
  );
}
