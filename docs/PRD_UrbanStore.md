# UrbanStore — Product Requirement Document (PRD)

> Versi 1.2 · Status: Siap dieksekusi AI Agent · Studi kasus Vibe Coding Bootcamp Batch 4 (CODEPOLITAN)
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
- **Goal 3 — Fast Conversion:** Menyelesaikan checkout mobile dengan cepat tanpa hambatan (3 langkah, tanpa wajib daftar akun).

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
- **US-04** As a customer, I want to checkout in 3 short steps without creating an account, so that I can finish buying in under 3 minutes.
- **US-05** As a customer, I want to see an invoice with an order number and bank details, so that I know how to pay.
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
- Integrasi Paylater & Cicilan / KYC
- Payment gateway otomatis (Midtrans/Xendit) & API kurir real-time
- Wishlist, ulasan & rating, loyalty tier, live shopping

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

### FR-03 — Product Detail & Size Guide
- Menampilkan foto, nama, harga, kategori, bahan, warna, deskripsi, stok.
- Size picker wajib (S/M/L/XL sesuai varian produk) sebelum Add to Cart.
- Panduan ukuran visual (tabel ukuran badan/pakaian + estimasi tinggi & berat badan).
- Pengguna dapat menambah produk ke keranjang dari halaman detail.

### FR-04 — Shopping Cart
- Pengguna dapat mengubah jumlah item (qty) atau menghapus item langsung.
- Sistem harus mengupdate subtotal dan total biaya secara instan (realtime).
- Item yang sama dengan ukuran berbeda disimpan sebagai baris berbeda.

### FR-05 — 3-Step Checkout
1. **Data pengiriman** — nama penerima, nomor WhatsApp, email, alamat lengkap, kota, kode pos.
2. **Pengiriman & pembayaran** — Regular (Rp15.000) / Express Next Day (Rp30.000); pembayaran transfer bank manual.
3. **Review** — ringkasan item, ongkir, total → tombol **Place Order**.

### FR-06 — Order Confirmation
- Generate nomor order unik (format `URB-YYYY-NNN`, contoh `URB-2026-001`).
- Halaman invoice berisi status, item, total, instruksi transfer, dan tombol **"Saya Sudah Transfer"**.
- Customer dapat membuka kembali invoice via nomor order + nomor WhatsApp.

## 8. User Flow

**Discover → Explore → Evaluate → Purchase → Complete**

1. Product Detail (pilih size)
2. Klik "Add to Cart"
3. Review Shopping Cart
4. Isi Checkout Form (alamat)
5. Review Order Summary
6. Klik "Place Order"
7. Invoice & instruksi pembayaran

## 9. Business Rules

- **Kuantitas minimum:** jumlah produk yang ditambahkan ke cart minimal 1 item.
- **Validasi stok:** pengguna dilarang memesan melebihi stok tersedia (dicek ulang di server saat checkout).
- **Kalkulasi total:** Total = Σ(Harga × Qty) + Ongkir flat. Harga selalu diambil dari database, bukan dari browser.
- **Validitas pesanan:** order hanya berhasil jika field alamat & nomor HP valid.
- **Snapshot harga:** harga & nama produk disimpan saat dibeli, sehingga invoice tidak berubah jika admin mengubah harga.
- **Stok:** stok berkurang saat order dibuat dan dikembalikan jika order dibatalkan.
- **Status pesanan:** Menunggu Pembayaran → Menunggu Verifikasi → Lunas (diproses) → Dikirim → Selesai; atau Dibatalkan.

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

Scenario: Admin konfirmasi pembayaran (v1.1)
  Given order berstatus "Menunggu Verifikasi"
  When admin menekan "Konfirmasi Lunas"
  Then status berubah menjadi "Lunas" dan terlihat di halaman invoice customer
```

## 11. Non-Functional Requirements

- **Responsive:** sempurna di mobile, tablet & desktop (mobile-first).
- **Accessibility:** kontras teks nyaman & ukuran font terbaca; elemen interaktif bisa diakses keyboard.
- **Fast Loading:** load time katalog < 2 detik.
- **Clear Validation:** pesan error form jelas & solutif.
- **Security:** password di-hash, sesi via cookie httpOnly, API key hanya di backend.

## 12. Technical Constraints

- **Stack:** Vite + React + Tailwind CSS (frontend), Node.js + Express (backend), SQLite (database).
- **Design system:** Swiss × Japanese minimalism — font Inter, strong grid, generous whitespace, tanpa gradient/shadow berlebihan, foto produk sebagai fokus. Warna: hitam `#0A0A0A`, putih `#FFFFFF`, aksen lemon `#D9F24A`.
- **Copywriting:** Bahasa Indonesia gaya Gen Z yang natural.
- **No payment assumed:** jangan mengasumsikan payment gateway live tanpa API key; MVP memakai transfer bank manual.
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

### Open Questions

- Integrasi QRIS / payment gateway otomatis (ditunda v2).
- Ongkir dinamis berdasarkan kota (saat ini flat).
