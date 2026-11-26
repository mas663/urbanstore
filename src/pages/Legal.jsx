import { Link } from 'react-router-dom';

/* Halaman legal sederhana. Google mewajibkan link Kebijakan Privasi & Syarat Layanan
   di OAuth consent screen (Branding) supaya nama & logo "UrbanStore" tampil saat login Google. */

const UPDATED = '26 November 2026';

function LegalPage({ eyebrow, title, sections }) {
  return (
    <article className="container-x max-w-3xl py-16 lg:py-24">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">{title}</h1>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-mute">Terakhir diperbarui {UPDATED}</p>
      <div className="mt-12 space-y-10">
        {sections.map(([heading, body]) => (
          <section key={heading}>
            <h2 className="text-lg font-bold">{heading}</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink/80">{body}</div>
          </section>
        ))}
      </div>
      <p className="mt-14 border-t border-line pt-6 text-sm text-mute">
        UrbanStore adalah proyek pembelajaran Vibe Coding Bootcamp. Ada pertanyaan? Lihat <Link to="/#faq" className="underline">FAQ</Link>.
      </p>
    </article>
  );
}

export function Privacy() {
  return (
    <LegalPage eyebrow="UrbanStore" title="Kebijakan Privasi" sections={[
      ['Data yang kami kumpulkan', <>
        <p>Saat kamu membuat akun atau login dengan Google, kami menerima <b>nama, alamat email, dan foto profil</b> dari akun Google kamu. Kami tidak pernah menerima password Google kamu.</p>
        <p>Saat checkout, kami menyimpan nama penerima, nomor HP, alamat pengiriman, isi pesanan, dan bukti pembayaran yang kamu unggah.</p>
      </>],
      ['Untuk apa data dipakai', <>
        <p>Data hanya dipakai untuk menjalankan toko: login, menyimpan keranjang & favorit, memproses pesanan, pembayaran, pengiriman, dan menjawab pertanyaan lewat Urban Assistant.</p>
        <p>Kami tidak menjual atau menyewakan data kamu kepada pihak lain.</p>
      </>],
      ['Pihak ketiga', <>
        <p>Kami memakai layanan berikut untuk menjalankan toko: <b>Supabase</b> (database & login), <b>Google</b> (login), <b>Mayar.id</b> (pembayaran — data nama, email, HP, dan rincian tagihan dikirim untuk membuat invoice), <b>Vercel</b> (hosting & statistik kunjungan anonim), dan penyedia AI untuk Urban Assistant.</p>
      </>],
      ['Keamanan', <>
        <p>Akses data dibatasi per akun dengan Row Level Security: customer hanya bisa melihat data miliknya sendiri. Bukti transfer disimpan di penyimpanan privat.</p>
      </>],
      ['Hak kamu', <>
        <p>Kamu bisa meminta data akunmu dihapus kapan saja dengan menghubungi pengelola toko. Kamu juga bisa mencabut akses UrbanStore di <a className="underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">pengaturan akun Google</a>.</p>
      </>],
    ]} />
  );
}

export function Terms() {
  return (
    <LegalPage eyebrow="UrbanStore" title="Syarat & Ketentuan" sections={[
      ['Akun', <>
        <p>Kamu bertanggung jawab menjaga akses akunmu. Satu akun untuk satu orang. Akun admin hanya untuk pengelola toko.</p>
      </>],
      ['Pesanan & pembayaran', <>
        <p>Pesanan wajib dibayar dalam <b>1 jam</b> setelah checkout. Lewat dari itu pesanan otomatis kedaluwarsa dan stok dikembalikan.</p>
        <p>Pembayaran otomatis diproses oleh Mayar.id (QRIS, Virtual Account, e-wallet). Transfer manual diverifikasi admin setelah bukti diunggah.</p>
      </>],
      ['Harga & stok', <>
        <p>Harga dan stok bisa berubah sewaktu-waktu. Harga yang berlaku adalah harga saat checkout.</p>
      </>],
      ['Pengiriman', <>
        <p>Regular 2–4 hari kerja (Rp15.000) dan Express next day (Rp30.000), dihitung sejak pembayaran terverifikasi.</p>
      </>],
      ['Urban Assistant (AI)', <>
        <p>Jawaban asisten AI bersifat saran. Selalu cek kembali ukuran, stok, dan harga di halaman produk sebelum membeli.</p>
      </>],
    ]} />
  );
}
