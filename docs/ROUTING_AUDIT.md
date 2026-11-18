# Audit Routing & Rekomendasi Halaman — UrbanStore

> Status: **analisis untuk direview** (belum ada perubahan kode dari dokumen ini).
> Dibuat sesuai prompt "Senior Software Architect & UI/UX Strategist" (Sesi 4 · prompt 4).

## 1. Ringkasan temuan

Kekhawatiran di prompt ("semua fitur berkumpul di satu URL atau modal") **sebagian besar sudah teratasi** di codebase saat ini. Aplikasi sudah memakai React Router dengan **14 route terpisah** dan area admin yang terisolasi di `/admin/*`.

Yang masih tersisa:

| # | Temuan | Dampak | Prioritas |
|---|---|---|---|
| 1 | Keranjang hanya berupa **drawer/modal** (tidak ada `/keranjang`) | Tidak bisa di-share atau di-bookmark; tombol Back di HP tidak menutup drawer | Tinggi |
| 2 | Detail pesanan admin **di-expand inline** di `/admin/pesanan` | Admin tidak bisa membagikan link pesanan tertentu ke rekan, dan state hilang saat refresh | Tinggi |
| 3 | **Route guard tersebar** di tiap halaman (`Checkout`, `Invoice`, `MyOrders`, `AdminLayout`) | Logika duplikat dan rawan lupa saat menambah halaman baru | Sedang |
| 4 | Belum ada **lupa password / reset password** | Customer terkunci jika lupa password (Supabase Auth sudah mendukung) | Sedang |
| 5 | Belum ada halaman **profil / alamat tersimpan** | Customer harus mengetik alamat setiap checkout | Sedang |
| 6 | **Judul & meta** halaman hanya diatur di detail produk | SEO dan pratinjau link (WhatsApp/IG) kurang informatif | Rendah |
| 7 | AI chat berupa overlay | **Sudah tepat** sebagai overlay karena berupa bantuan kontekstual, tidak perlu dijadikan halaman sendiri | — |

## 2. Peta route saat ini

| Route | Akses | Isi | Status |
|---|---|---|---|
| `/` | Publik | Landing page 8 section | ✅ Halaman sendiri |
| `/koleksi?gender&category&sort&q` | Publik | Katalog + filter di query string | ✅ Bisa di-share, termasuk filternya |
| `/produk/:slug` | Publik | Detail, varian, size guide | ✅ Slug ramah SEO |
| `/login`, `/daftar` | Publik (tamu) | Auth customer, `?next=` redirect aman | ✅ |
| `/checkout` | Customer | Checkout 3 langkah | ✅ Guard di komponen |
| `/pesanan/:code` | Pemilik / admin | Pesanan berhasil, timer, upload bukti, invoice | ✅ Dilindungi RLS |
| `/akun/pesanan` | Customer | Riwayat pesanan | ✅ |
| `/admin/login` | Publik | Login khusus admin | ✅ Terpisah dari login customer |
| `/admin` | Admin | Dashboard | ✅ |
| `/admin/produk`, `/admin/produk/baru`, `/admin/produk/:id` | Admin | CRUD produk + varian | ✅ |
| `/admin/pesanan?status=` | Admin | Daftar transaksi | ⚠️ Detail masih inline |
| `/admin/analisis` | Admin | Analisis penjualan AI | ✅ |
| `*` | Publik | 404 | ✅ |
| *(drawer)* | Customer | Keranjang | ⚠️ Perlu route `/keranjang` |
| *(overlay)* | Customer | AI Shopping Assistant | ✅ Tetap overlay |

## 3. Rekomendasi halaman baru / dipisah

### 3.1 `/keranjang` — Halaman keranjang

- **Alasan pemisahan:**
  - *UX mobile:* drawer layar penuh di HP terasa seperti halaman, tapi tombol Back justru keluar dari situs.
  - *Deep-linking:* link "lanjutkan belanja" di notifikasi atau email tidak bisa diarahkan ke keranjang.
  - *State:* scroll dan fokus hilang setiap drawer ditutup.
- **Yang dipindahkan:** isi `CartDrawer.jsx` (daftar item, stepper qty, subtotal, peringatan stok) dijadikan komponen `CartList` yang dipakai bersama.
- **Catatan:** drawer tetap dipertahankan sebagai "mini cart" sesaat setelah Add to Cart, dengan tombol "Lihat keranjang" menuju `/keranjang`.

### 3.2 `/admin/pesanan/:code` — Detail pesanan admin

- **Alasan pemisahan:**
  - *Kolaborasi:* admin bisa mengirim link pesanan bermasalah ke rekan.
  - *Keamanan/audit:* setiap aksi (konfirmasi lunas, tolak bukti) punya konteks halaman yang jelas.
  - *State:* tidak hilang saat daftar di-refresh atau difilter.
  - *Ruang:* bukti transfer bisa ditampilkan besar di samping data pesanan.
- **Yang dipindahkan:** komponen `OrderDetail` dan tombol aksi status dari `admin/Orders.jsx`.

### 3.3 `/lupa-password` & `/reset-password`

- **Alasan:** alur keamanan wajib untuk aplikasi dengan login. Halaman reset harus punya URL sendiri karena link dari email Supabase mengarah ke sana. Alur ini tidak bisa dibuat sebagai modal.
- **Komponen:** baru, memakai `supabase.auth.resetPasswordForEmail` dan `supabase.auth.updateUser`.

### 3.4 `/akun` (profil & alamat)

- **Alasan:** data pribadi sebaiknya dipisahkan dari riwayat pesanan sesuai prinsip RBAC dan kejelasan menu. Halaman ini juga memungkinkan prefill alamat di checkout, yang mempercepat konversi sesuai Goal 3 PRD.
- **Komponen:** form nama dan nomor WhatsApp (tabel `profiles` sudah ada, dan RLS sudah mengizinkan update profil sendiri).

## 4. Struktur routing & proteksi yang disarankan

```
src/
  routes/
    guards.jsx          ← <RequireAuth role="customer|admin"> & <GuestOnly>
  pages/
    public/             Home, Catalog, ProductDetail, NotFound
    auth/               Login, Register, ForgotPassword, ResetPassword
    account/            Profile, MyOrders, OrderDetail(Invoice), Cart, Checkout
    admin/              Layout, Dashboard, Products, ProductForm, Orders, OrderDetail, Analysis
```

```jsx
<Route element={<Layout />}>
  {/* Publik */}
  <Route index element={<Home />} />
  <Route path="koleksi" element={<Catalog />} />
  <Route path="produk/:slug" element={<ProductDetail />} />

  {/* Tamu saja (sudah login → diarahkan) */}
  <Route element={<GuestOnly />}>
    <Route path="login" element={<Login />} />
    <Route path="daftar" element={<Register />} />
    <Route path="lupa-password" element={<ForgotPassword />} />
  </Route>
  <Route path="reset-password" element={<ResetPassword />} />

  {/* Customer */}
  <Route element={<RequireAuth role="customer" />}>
    <Route path="keranjang" element={<Cart />} />
    <Route path="checkout" element={<Checkout />} />
    <Route path="akun" element={<Profile />} />
    <Route path="akun/pesanan" element={<MyOrders />} />
    <Route path="pesanan/:code" element={<Invoice />} />
  </Route>
</Route>

{/* Admin (lazy-loaded, sudah diterapkan) */}
<Route path="admin/login" element={<Login admin />} />
<Route path="admin" element={<RequireAuth role="admin" redirect="/admin/login"><AdminLayout /></RequireAuth>}>
  ...
  <Route path="pesanan/:code" element={<AdminOrderDetail />} />
</Route>
```

**Lapisan proteksi:**

1. **Route guard (UX):** mengarahkan tamu ke login dengan `?next=`, dan menolak customer yang membuka `/admin`. Lapisan ini **bukan** lapisan keamanan.
2. **Row Level Security Supabase (keamanan sebenarnya):** walaupun seseorang memanggil API langsung, customer tetap hanya bisa membaca pesanan dan keranjangnya sendiri. Perubahan pesanan hanya bisa dilakukan lewat fungsi `place_order` dan `admin_update_order_status`. Ini sudah diterapkan dan teruji di `tests/supabase/schema.test.js`.
3. **Server AI:** setiap request memverifikasi token Supabase dan role sebelum memanggil Gemini, dan kuota chat dihitung dengan secret key.

## 5. Urutan pengerjaan yang disarankan

1. `guards.jsx` dan migrasi guard yang tersebar → tidak ada perubahan tampilan, risikonya rendah.
2. `/admin/pesanan/:code` → paling berdampak untuk operasional admin.
3. `/keranjang` dan mini-cart drawer.
4. `/lupa-password` dan `/reset-password` (perlu set *Redirect URL* di Supabase Auth ke domain Vercel).
5. `/akun` profil dan prefill checkout.
6. Judul & meta per halaman.

Silakan review dan setujui poin mana yang mau dikerjakan. Implementasinya menyusul setelah disetujui, sesuai instruksi prompt.
