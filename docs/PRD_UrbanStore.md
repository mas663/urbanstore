# UrbanStore — Product Requirement Document (PRD)

> Versi 3.0 · Status: Siap dieksekusi AI Agent · Studi kasus Vibe Coding Bootcamp Batch 4 (CODEPOLITAN)
>
> Dokumen ini adalah **source of truth**. Setiap prompt development wajib mengacu ke sini. Kalau ada hal yang belum diputuskan, tandai sebagai *Open Question* — jangan ditebak.

---

## 1. Product Overview

UrbanStore adalah online store fashion pria & wanita untuk Gen Z dengan **kurasi terarah**, **informasi ukuran transparan**, dan **tampilan modern minimalis** (Swiss International Style × Japanese Minimalism, dominasi hitam-putih dengan aksen kuning kehijauan lemon).

**Problem statement**

> Gen Z pembeli online (mahasiswa & young professional) mengalami **kesulitan menemukan fashion yang sesuai selera & budget** ketika **scrolling di HP pada waktu senggang yang singkat**, sehingga membutuhkan **katalog terkurasi dengan panduan ukuran visual yang terpercaya dan checkout yang cepat**.

**Value proposition**

> "UrbanStore membantu Gen Z tampil stylish setiap hari tanpa repot & tanpa ragu ukuran."

| | |
|---|---|
| **For (target)** | Gen Z & young professional 18–30 tahun yang aktif belanja lewat smartphone |
| **Who (need)** | Butuh outfit kurasi, bosan mencari di antara jutaan item non-kurasi marketplace |
| **Our product** | UrbanStore — pakaian trendy siap pakai dengan panduan ukuran terpercaya |
| **Unlike (diff)** | Tanpa iklan banner & distraksi, checkout 3 langkah, foto produk sebagai fokus |

**Persona utama — Rian & Maya (19–25 th, mahasiswa & first-jobber)**

- Perilaku: cari inspirasi outfit di medsos, belanja lewat smartphone saat waktu luang.
- Goals: tampil stylish untuk kuliah/nongkrong tanpa menguras kantong.
- Pain points: takut salah ukuran, bahan tipis, malas isi form checkout panjang.
- Device: 100% smartphone shopper, pembayaran via transfer / e-wallet.

## 2. Product Goals

- **Goal 1 — Discoverability:** Memudahkan user menemukan outfit stylish tanpa tersesat katalog (produk relevan ditemukan ≤ 30 detik).
- **Goal 2 — Shopping Confidence:** Menyediakan panduan ukuran visual yang jelas & terpercaya.
- **Goal 3 — Fast Conversion:** Menyelesaikan checkout mobile dengan cepat tanpa hambatan (daftar akun 1 menit, checkout 3 langkah).

## 3. Success Metrics (KPI)

| Metrik | Baseline | Target |
|---|---|---|
| Product Click Rate (katalog → detail) | 12% industri | > 25% |
| Add to Cart Rate (detail → cart) | 4.5% e-commerce | > 15% |
| Checkout Completion Rate (cart → sukses) | 40% industri | > 65% |
| Cart Abandonment Rate | maks. 60% | < 30% |
| Time to First Purchase | 8 menit | < 3 menit |

*Metrik dievaluasi berkala pasca-peluncuran MVP.*

## 4. User Needs (Kebutuhan Pengguna)

1. Pengunjung dapat melihat daftar katalog produk fashion terkini.
2. Pengunjung dapat mencari dan memfilter produk per kategori (Pria/Wanita).
3. Pengunjung dapat melihat panduan ukuran visual di halaman detail.
4. Pengguna dapat mengelola item dan melihat subtotal di keranjang.
5. Pengguna dapat menyelesaikan pembayaran via checkout 3 langkah ringkas.

## 5. User Stories

Format: **As a** [persona] **I want** [aksi] **so that** [benefit].

- **US-01** As a customer, I want to filter products by category and gender, so that I can find trendy outfits that fit my style quickly.
- **US-02** As a customer, I want to see clear size measurements, so that I can buy without worrying the size won't fit.
- **US-03** As a customer, I want to change quantity or remove items in my cart, so that I always know my exact subtotal.
- **US-04** As a customer, I want to checkout in 3 short steps with my province, city, and district, so that my order arrives at the right address.
- **US-05** As a customer, I want to see an order number, bank details, a payment countdown, and upload my transfer proof, so that I know exactly how and when to pay.
- **US-05b** As a customer, I want to download my invoice as PDF, so that I have proof of purchase.
- **US-06** As a store admin, I want to add products with sizes and stock, so that the catalog is always up to date. *(v1.1)*
- **US-07** As a store admin, I want to see incoming orders and confirm payments, so that I can process orders confidently. *(v1.1)*
- **US-08** As a logged-in customer, I want to ask an AI assistant about stock and my size based on height/weight, so that I can decide faster. *(v1.2)*
- **US-09** As a store admin, I want AI to draft product descriptions and analyze sales, so that I save time on copywriting and planning. *(v1.2)*

## 6. Scope

### In Scope — MVP v1

- Homepage & Banner (landing page)
- Katalog Kurasi (grid, search, filter Pria/Wanita & kategori, sorting harga)
- Detail Produk & Size Guide
- Shopping Cart
- 3-Step Checkout
- Order Confirmation (invoice)

### Out of Scope — ditunda ke v2+

- AI Virtual Stylist & Outfit Matcher penuh (catatan: asisten belanja berbasis katalog masuk v1.2, lihat Changelog)
- Multi-seller Marketplace
- Virtual 3D Fitting Room (AR)
- Integrasi Paylater & Cicilan
- API kurir real-time
- Ulasan & rating, loyalty tier, live shopping *(wishlist masuk v2.1)*

## 7. Functional Requirements

### FR-01 — Homepage & Banner
- Menampilkan hero (headline, subheadline, CTA ke katalog), value proposition, koleksi unggulan, benefit, brand story, FAQ, final CTA, dan footer.

### FR-02 — Product Catalog
- Sistem harus menampilkan daftar produk dalam format **grid responsive**.
- Setiap kartu produk menampilkan **foto aesthetic, nama, harga, dan kategori**.
- Pengguna dapat memfilter berdasarkan kategori **Pria** dan **Wanita**, serta jenis produk.
- Pengguna dapat mencari produk berdasarkan nama dan mengurutkan berdasarkan harga.
- Produk tanpa stok harus menampilkan badge status **"Habis"** secara jelas.
- Produk diskon menampilkan harga coret & badge diskon.

### FR-03 — Product Detail, Varian & Size Guide
- Menampilkan foto, nama, harga, kategori, bahan, deskripsi.
- **Varian = warna × ukuran**, stok disimpan per varian. Customer wajib memilih warna dan ukuran sebelum Add to Cart. Varian habis tampil dicoret dan tidak bisa dipilih.
- Panduan ukuran visual (tabel ukuran pakaian + estimasi tinggi & berat badan).
- Add to Cart memerlukan login customer. Tamu diarahkan ke halaman login lalu kembali ke produk.

### FR-04 — Shopping Cart
- Keranjang tersimpan di akun customer (tabel `cart_items`).
- Pengguna dapat menambah/mengurangi jumlah item (qty) atau menghapus item langsung.
- Sistem mengupdate subtotal dan total secara instan dan menolak qty melebihi stok varian.
- Varian berbeda (warna/ukuran) disimpan sebagai baris berbeda.

### FR-05 — 3-Step Checkout (wajib login)
1. **Data pengiriman** — nama penerima, nomor WhatsApp, email, **provinsi → kota/kabupaten → kecamatan** (dropdown bertingkat), alamat lengkap, kode pos, catatan pengiriman.
2. **Pengiriman & pembayaran** — Regular (Rp15.000) / Express Next Day (Rp30.000); pembayaran **Bayar instan via Mayar.id** (QRIS, Virtual Account, e-wallet — default) atau transfer bank manual.
3. **Review** — ringkasan item, ongkir, total → tombol **Checkout**.

### FR-06 — Pesanan Berhasil, Pembayaran & Invoice
- Generate nomor order unik (format `URB-YYYY-NNN`, contoh `URB-2026-001`).
- Halaman pesanan berhasil menampilkan nomor order, info rekening & nominal transfer, dan **timer hitung mundur 1 jam**.
- **Form upload bukti transfer.** Gambar dikompres di browser sebelum diupload ke storage privat. Setelah diupload, status berubah menjadi *Menunggu Verifikasi*.
- **Invoice** tampil di halaman dengan stempel **BELUM LUNAS** (atau LUNAS / DIBATALKAN / KEDALUWARSA) dan bisa **diunduh sebagai PDF**.
- **Bayar instan (Mayar.id):** tombol *Bayar Sekarang* membuka halaman bayar Mayar. Setelah dibayar, status otomatis menjadi **Lunas** tanpa upload bukti (lihat FR-08). Transfer manual tetap tersedia sebagai cadangan.
- Riwayat status pesanan ditampilkan sebagai timeline. Semua pesanan bisa dibuka lagi dari menu *Pesanan Saya*.

### FR-07 — Store Admin
- Login khusus admin di `/admin/login` (email/password atau Google). Role disimpan di tabel `profiles` dan tidak bisa diubah dari aplikasi.
- Kelola produk & varian (stok per warna × ukuran), upload foto produk, arsipkan/aktifkan produk.
- Kelola pesanan: lihat bukti transfer, **Konfirmasi Lunas**, **Tolak Bukti** (customer mendapat 1 jam lagi untuk upload ulang), tandai Dikirim/Selesai, Batalkan (stok kembali).
- Pesanan yang dibayar via Mayar tampil dengan label **Auto · Mayar** beserta ID invoice/transaksi dan waktu verifikasi; admin tidak perlu konfirmasi manual. Pembayaran yang masuk setelah pesanan ditutup dan stoknya habis ditandai **perlu refund**.

### FR-08 — Payment Gateway Mayar.id
- Server membuat invoice lewat Mayar Headless API v2 (`POST /invoices/create`): satu baris per item + ongkir, total wajib sama dengan total pesanan, link bayar kedaluwarsa bersamaan dengan batas bayar 1 jam. Link yang masih berlaku dipakai ulang (tidak membuat invoice ganda).
- Mayar mengirim webhook `payment.received` ke `/api/webhook/mayar?token=<rahasia>`. Karena webhook Mayar tidak bertanda tangan, server **selalu memverifikasi ulang** status & nominal ke `GET /invoices/{id}` sebelum menandai lunas.
- Penandaan lunas dilakukan fungsi database `mayar_mark_paid` (hanya `service_role`): idempotent, mengunci baris pesanan, menolak nominal yang berbeda, dan memesan ulang stok bila pembayaran datang setelah pesanan kedaluwarsa.
- Cadangan tanpa webhook: saat customer kembali ke halaman pesanan, browser meminta server mengecek status ke Mayar (`/api/payments/mayar/sync`).
- API key Mayar hanya di server (`MAYAR_API_KEY`, `MAYAR_ENV` sandbox/production). Jika key kosong, opsi Bayar instan disembunyikan.

### FR-09 — Login dengan Google
- Tombol *Lanjutkan dengan Google* di `/login`, `/daftar`, `/admin/login` (Supabase Auth, OAuth PKCE). Akun Google baru otomatis berperan **customer**.
- Halaman `/auth/callback` memeriksa role: login lewat `/admin/login` dengan akun non-admin langsung di-logout dengan pesan jelas. Data admin tetap dilindungi RLS.

## 8. User Flow

**Discover → Explore → Evaluate → Purchase → Complete**

1. Login / daftar akun customer
2. Product Detail (pilih warna & ukuran)
3. Klik "Add to Cart"
4. Review Shopping Cart (tambah/kurang/hapus)
5. Isi Checkout Form (provinsi, kota, kecamatan, alamat, catatan)
6. Review Order Summary → klik "Checkout"
7. Halaman pesanan berhasil: nomor order, rekening, timer 1 jam
8. Transfer → upload bukti transfer
9. Admin verifikasi → status Lunas → Dikirim → Selesai

## 9. Business Rules

- **Kuantitas minimum:** jumlah produk yang ditambahkan ke cart minimal 1 item.
- **Validasi stok:** pengguna dilarang memesan melebihi stok tersedia (dicek ulang di server saat checkout).
- **Kalkulasi total:** Total = Σ(Harga × Qty) + Ongkir flat. Harga selalu diambil dari database, bukan dari browser.
- **Validitas pesanan:** order hanya berhasil jika field alamat & nomor HP valid.
- **Snapshot harga:** harga & nama produk disimpan saat dibeli, sehingga invoice tidak berubah jika admin mengubah harga.
- **Stok per varian:** stok varian berkurang saat order dibuat dan dikembalikan jika order dibatalkan atau kedaluwarsa.
- **Batas waktu bayar:** 1 jam setelah checkout. Jika belum dibayar via Mayar dan bukti transfer belum diupload sampai batas waktu, pesanan otomatis berstatus **Kedaluwarsa** dan stok dikembalikan.
- **Bukti ditolak:** status kembali ke Menunggu Pembayaran dengan batas waktu baru 1 jam.
- **Pembayaran Mayar:** status Lunas hanya diberikan setelah server memverifikasi status `paid` dan nominal yang sama persis langsung ke API Mayar.
- **Status pesanan:** Menunggu Pembayaran → (Menunggu Verifikasi →) Lunas (diproses) → Dikirim → Selesai; atau Dibatalkan / Kedaluwarsa.
- **Akun admin** tidak bisa checkout; checkout hanya untuk role customer.

## 10. Acceptance Criteria (Gherkin)

```gherkin
Scenario: Add to cart
  Given pengguna membuka halaman detail produk dengan stok tersedia
  When pengguna memilih ukuran "M" dan menekan tombol "Add to Cart"
  Then item masuk ke keranjang belanja dan indikator badge cart bertambah
  And subtotal keranjang diperbarui secara akurat realtime

Scenario: Add to cart tanpa ukuran
  Given pengguna di halaman detail produk
  When pengguna menekan "Add to Cart" tanpa memilih ukuran
  Then sistem menampilkan pesan "Pilih ukuran dulu ya"
  And item tidak masuk keranjang

Scenario: Produk habis
  Given stok produk adalah 0
  When pengguna melihat katalog atau detail produk
  Then badge "Habis" tampil dan tombol Add to Cart nonaktif

Scenario: Filter kategori
  Given pengguna di halaman katalog
  When pengguna memilih filter "Wanita"
  Then hanya produk wanita dan unisex yang tampil

Scenario: Checkout sukses
  Given keranjang berisi minimal 1 item dengan stok cukup
  When pengguna mengisi data pengiriman valid, memilih pengiriman, lalu menekan "Place Order"
  Then sistem membuat order dengan nomor unik "URB-YYYY-NNN"
  And keranjang dikosongkan
  And pengguna diarahkan ke halaman invoice berstatus "Menunggu Pembayaran"

Scenario: Validasi form checkout
  Given pengguna di langkah 1 checkout
  When nomor WhatsApp tidak valid
  Then muncul pesan error yang jelas dan solutif, dan pengguna tidak bisa lanjut

Scenario: Upload bukti transfer
  Given order berstatus "Menunggu Pembayaran" dan timer belum habis
  When customer memilih foto bukti transfer dan menekan "Kirim Bukti Transfer"
  Then gambar dikompres lalu tersimpan di storage privat
  And status berubah menjadi "Menunggu Verifikasi"

Scenario: Batas waktu pembayaran habis
  Given order berstatus "Menunggu Pembayaran"
  When 1 jam berlalu tanpa bukti transfer
  Then status berubah menjadi "Kedaluwarsa" dan stok varian dikembalikan

Scenario: Download invoice
  Given customer membuka halaman pesanan miliknya
  When customer menekan "Download Invoice (PDF)"
  Then file PDF terunduh dengan stempel "BELUM LUNAS" selama pesanan belum dikonfirmasi

Scenario: Admin konfirmasi pembayaran
  Given order berstatus "Menunggu Verifikasi"
  When admin melihat bukti transfer dan menekan "Konfirmasi Lunas"
  Then status berubah menjadi "Lunas" dan terlihat di halaman pesanan customer

Scenario: Bayar instan via Mayar
  Given order berstatus "Menunggu Pembayaran" dan Mayar aktif
  When customer menekan "Bayar Sekarang" lalu menyelesaikan pembayaran di halaman Mayar
  Then server memverifikasi invoice ke API Mayar
  And status berubah menjadi "Lunas" tanpa konfirmasi admin
  And admin melihat label "Auto · Mayar" pada pesanan tersebut

Scenario: Webhook palsu
  Given seseorang mengirim webhook "payment.received" untuk invoice yang belum dibayar
  When server memverifikasi invoice ke API Mayar dan statusnya bukan "paid"
  Then pesanan tetap "Menunggu Pembayaran"

Scenario: Login Google ke panel admin dengan akun biasa
  Given pengguna memakai akun Google yang berperan customer
  When pengguna login melalui "/admin/login"
  Then sesi langsung diakhiri dan muncul pesan "bukan akun Store Admin"
```

## 11. Non-Functional Requirements

- **Responsive:** sempurna di mobile, tablet & desktop (mobile-first).
- **Accessibility:** kontras teks nyaman & ukuran font terbaca; elemen interaktif bisa diakses keyboard.
- **Fast Loading:** load time katalog < 2 detik.
- **Clear Validation:** pesan error form jelas & solutif.
- **Security:** password di-hash, sesi via cookie httpOnly, API key hanya di backend.

## 12. Technical Constraints

- **Stack:** Vite + React + Tailwind CSS (frontend) yang terhubung langsung ke **Supabase** (Postgres, Auth email/password + Google OAuth, Storage) dengan Row Level Security; Express kecil sebagai Vercel Function untuk endpoint AI dan pembayaran Mayar (create invoice, sync, webhook).
- **Deploy:** Vercel (static frontend + Function `/api`).
- **Design system:** Swiss × Japanese minimalism — font Inter, strong grid, generous whitespace, tanpa gradient/shadow berlebihan, foto produk sebagai fokus. Warna: hitam `#0A0A0A`, putih `#FFFFFF`, aksen lemon `#D9F24A`.
- **Copywriting:** Bahasa Indonesia gaya Gen Z yang natural.
- **No payment assumed:** jangan mengasumsikan payment gateway live tanpa API key. Mayar aktif hanya bila `MAYAR_API_KEY` terisi; tanpa itu, transfer bank manual tetap berfungsi.
- **Secrets:** semua kredensial di environment variables (`.env`), tidak pernah di frontend.

---

## Changelog (Change Management)

### v1.1 — Sesi 4: Build Web Application

Mengubah landing page menjadi aplikasi web fullstack.

- **Database (6 entitas):** Products, Categories, Cart Items, Orders, Order Items, Payment Status.
- **Role & akses:**
  - *Store Admin* (`/admin`): tambah & kelola produk, monitoring pesanan, konfirmasi pembayaran.
  - *Customer*: katalog, pilih ukuran, cart, checkout **tanpa wajib registrasi**, invoice via Order ID.
- **Aturan input produk:** nama, kategori & harga wajib; harga & stok ≥ 0 (harga > 0); minimal 1 varian ukuran.
- **Business flow 7 tahap:** Admin input produk → Customer lihat katalog → pilih ukuran & cart → checkout → invoice → "Saya Sudah Transfer" → Admin "Konfirmasi Lunas".

### v1.2 — Sesi 5: AI Feature Integration

- **AI Shopping Assistant (customer):** floating chat; jawab stok, harga, warna, ukuran, bahan dari database; rekomendasi ukuran dari TB/BB + size chart; mix & match dari katalog; tolak sopan pertanyaan di luar UrbanStore.
  - Hanya untuk customer yang login; kuota **5 pesan / 12 jam** dihitung di backend; tampil sisa kuota; streaming, loading, error & retry.
- **AI Product Description (admin):** tombol *Generate Description with AI* di form produk, berbasis data form, hasil teks bersih tanpa Markdown dan tetap bisa diedit.
- **AI Sales Analysis (admin):** dokumen analisis penjualan & strategi (promo, bundling, restock) dari agregat data order.
- **Provider:** Gemini API (Google AI Studio) via backend; opsional AI router (9Router) yang OpenAI-compatible. API key di `.env`.
- **Dua API key terpisah:** `urbanstore-customer` (`GEMINI_API_KEY_CUSTOMER`) untuk AI Shopping Assistant, `urbanstore-admin` (`GEMINI_API_KEY_ADMIN`) untuk deskripsi & analisis — kuota tidak saling mengganggu.
- **Model cadangan:** jika model utama overload / rate limit (503/429), request otomatis dialihkan ke `GEMINI_FALLBACK_MODEL`.
- **Cost optimization:** kirim payload katalog ringkas & agregat (bukan data mentah), batasi riwayat chat.

### v2.0 — Supabase, Varian & Pembayaran dengan Bukti Transfer

- **Database & Auth pindah ke Supabase.** Tabel: profiles (role admin/customer), categories, size_charts, products, product_variants, cart_items, orders, order_items, payments, order_status_history, chat_quota. Semua tabel dilindungi RLS. Operasi penting dijalankan lewat fungsi SQL (`place_order`, `submit_payment_proof`, `admin_update_order_status`, `admin_save_product`, `get_sales_metrics`, `expire_overdue_orders`).
- **Checkout wajib login** (sebelumnya guest). Halaman cek pesanan via nomor order + WhatsApp dihapus dan digantikan *Pesanan Saya*.
- **Varian warna × ukuran** dengan stok per varian.
- **Alamat bertingkat** provinsi → kota/kabupaten → kecamatan (data statis Kemendagri via emsifa/api-wilayah-indonesia).
- **Pembayaran:** timer 1 jam, upload bukti transfer (dikompres), verifikasi admin, kedaluwarsa otomatis.
- **Invoice PDF** dengan stempel status.
- **Deploy Vercel**; endpoint AI menjadi Vercel Function. Kuota chat dihitung di database dengan fungsi khusus `service_role`.

### v2.1 — Engagement & Redesign

- Redesign "editorial streetwear" dengan foto produk nyata (pipeline `npm run photos`).
- **Wishlist** (`/favorit`, tabel `wishlist_items` + RLS), badge **"Terjual"** dari agregat `get_product_sales()`, *Terakhir kamu lihat* (localStorage), Vercel Analytics.
- Laporan **PDF Analisis Penjualan** untuk admin.
- **Rantai provider AI:** provider utama (`AI_PROVIDER`) + cadangan (`AI_FALLBACK_PROVIDER`), masing-masing dengan model cadangan; circuit breaker 3 menit untuk model yang gagal. Situs live memakai Gemini langsung; 9Router opsional untuk lokal.

### v3.0 — Sesi 6: Production Ready

- **FR-08 Mayar.id** + webhook terverifikasi (migrasi `003_mayar.sql`).
- **FR-09 Login Google** untuk customer & admin.
- Halaman `/kebijakan-privasi` dan `/syarat-ketentuan` (syarat branding Google OAuth).

### Open Questions

- Aktivasi Mayar produksi menunggu verifikasi KYC akun Mayar (sandbox `web.mayar.io` tidak dapat diakses saat pengembangan).
- Ongkir dinamis berdasarkan kota/kecamatan (saat ini flat).
- Data wilayah memakai pembagian sebelum pemekaran Papua 2022 (34 provinsi).
- Halaman lanjutan dari audit routing (lihat `docs/ROUTING_AUDIT.md`): `/keranjang`, `/admin/pesanan/:code`, lupa password, profil.
