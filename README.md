# UrbanStore

Online fashion store pria & wanita untuk Gen Z, project studi kasus **Vibe Coding Bootcamp Batch 4 (CODEPOLITAN)**.

> Swiss International Style × Japanese Minimalism · hitam-putih + aksen lemon · copywriting Gen Z

**Stack:** Vite + React + Tailwind CSS · **Supabase** (Postgres, Auth, Storage, RLS) · Gemini API · deploy **Vercel**

```
Browser (React) ──► Supabase  (katalog, keranjang, pesanan, auth, storage — dijaga Row Level Security)
       │
       └──► /api (Vercel Function, Express) ──► Gemini   (fitur AI; API key hanya di server)
```

---

## 1. Setup Supabase (sekali saja)

1. **Buat project** di [supabase.com](https://supabase.com) (kalau belum).
2. **Buat tabel:** Dashboard → **SQL Editor** → *New query* → paste isi [`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql) → **Run**.
3. **Isi data contoh:** query baru → paste isi [`supabase/seed.sql`](supabase/seed.sql) → **Run** (14 produk + varian).
4. **Auth:** Dashboard → **Authentication → Sign In / Providers → Email**:
   - Untuk development, matikan **Confirm email** supaya bisa langsung login setelah daftar. Kalau tetap aktif, user harus klik link konfirmasi di email dulu.
   - **Authentication → URL Configuration**: isi *Site URL* dengan `http://localhost:5173`. Setelah deploy, ganti dengan domain Vercel dan tambahkan juga ke *Redirect URLs*.
5. **Buat akun admin:** daftar akun biasa lewat halaman `/daftar` (misalnya `admin@urbanstore.id`), lalu jalankan di SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@urbanstore.id';
   ```
   Role tidak bisa diubah dari aplikasi. Hanya lewat SQL Editor atau secret key.

## 2. Environment variables

```bash
cp .env.example .env
```

| Variabel | Dari mana | Dipakai di |
|---|---|---|
| `VITE_SUPABASE_URL` | Project Settings → API Keys (atau `https://<project-id>.supabase.co`) | Browser + server |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → *Publishable key* | Browser + server |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → *Secret key* | **Server saja** (kuota chat AI) |
| `GEMINI_API_KEY_CUSTOMER` | Google AI Studio, key `urbanstore-customer` | Server: AI Shopping Assistant |
| `GEMINI_API_KEY_ADMIN` | Google AI Studio, key `urbanstore-admin` | Server: AI Deskripsi & Analisis |
| `VITE_STORE_BANK_*` | Rekening tujuan transfer | Halaman pesanan & invoice PDF |

> Variabel berawalan `VITE_` ikut terkirim ke browser. **Jangan** pernah memberi prefix `VITE_` pada secret key atau API key Gemini.

## 3. Jalankan lokal

Butuh **Node.js 22.13+**.

```bash
npm install
npm run dev        # web http://localhost:5173 + server AI :3001
```

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development (Vite + server AI) |
| `npm test` | 23 tes: skema Supabase di Postgres lokal (PGlite) + endpoint AI |
| `npm run build` | Build production ke `dist/` |
| `npm run seed:sql` | Generate ulang `supabase/seed.sql` dari `scripts/seed-data.js` |
| `npm run wilayah` | Unduh ulang data provinsi/kota/kecamatan ke `public/wilayah` |
| `npm run docs:prd` | Generate `docs/PRD_UrbanStore.html` |

## 4. Deploy ke Vercel

1. Push repo ke GitHub, lalu di Vercel: **Add New → Project → Import** repo ini. Framework (Vite) terdeteksi otomatis lewat [`vercel.json`](vercel.json).
2. **Environment Variables:** jalankan `npm run vercel:env` (menyiapkan `.env.vercel` berisi 13 variabel yang dibutuhkan, tanpa menampilkan nilainya), lalu `pbcopy < .env.vercel` dan **paste sekali** ke kolom Key di halaman import Vercel. Pilih Production & Preview. Hapus file itu setelahnya: `rm .env.vercel`. Variabel berawalan `VITE_` ikut ke browser saat **build**, jadi kalau diubah harus redeploy.
3. **Deploy.** Frontend disajikan sebagai static, dan `/api/*` berjalan sebagai Vercel Function ([`api/index.js`](api/index.js), timeout 60 detik untuk streaming AI).
4. Di Supabase → Authentication → URL Configuration: ganti *Site URL* ke `https://<app>.vercel.app` dan tambahkan ke *Redirect URLs*.

---

## Fitur

**Customer**
- Katalog kurasi: search, filter Pria/Wanita & jenis, sorting harga, badge Habis/diskon
- Detail produk: **pilih warna × ukuran** (stok per varian), size guide visual
- Login/daftar email + password · keranjang tersimpan di akun (tambah/kurang/hapus, subtotal realtime)
- **Checkout 3 langkah:** provinsi → kota/kabupaten → kecamatan, alamat lengkap, catatan pengiriman, pilihan kurir
- **Pesanan berhasil:** nomor order unik `URB-2026-001`, info rekening, **timer 1 jam**, **upload bukti transfer** (dikompres otomatis), invoice dengan stempel **BELUM LUNAS**, **download PDF**, riwayat status
- Pesanan lewat 1 jam tanpa bukti → **kedaluwarsa otomatis** & stok kembali
- **AI Shopping Assistant:** cek stok varian, saran ukuran dari TB/BB, mix & match, kuota 5 pesan / 12 jam

**Store Admin (`/admin`)**
- Dashboard: pesanan, menunggu verifikasi, omzet terkonfirmasi, stok varian menipis
- Produk: editor varian warna × ukuran, upload foto (dikompres), arsip/aktifkan, **Generate Description with AI**
- Pesanan: lihat bukti transfer, **Konfirmasi Lunas**, Tolak Bukti, Dikirim, Selesai, Batalkan (stok kembali)
- **Analisis Penjualan AI** (streaming) dari metrik teragregasi

## Keamanan

- **Row Level Security** di semua tabel: customer hanya bisa melihat keranjang & pesanannya sendiri, dan data katalog hanya bisa diubah admin.
- Pesanan **tidak bisa dibuat/diubah langsung**. Semua perubahan lewat fungsi SQL yang memvalidasi data, menghitung harga dari database, mengunci stok, dan menyimpan snapshot harga.
- Bukti transfer disimpan di bucket **privat** `{user_id}/...`. Hanya pemilik dan admin yang bisa melihat (signed URL).
- Kuota chat AI hanya bisa diubah oleh `service_role` (secret key di server).
- Semua aturan di atas diuji otomatis di [`tests/supabase/schema.test.js`](tests/supabase/schema.test.js).

## Peta materi → implementasi

| Sesi | Implementasi |
|---|---|
| 1 | Fitur dibangun bertahap, satu prompt satu fitur, dan commit per fase (`git log`) |
| 2 | [`docs/PRD_UrbanStore.md`](docs/PRD_UrbanStore.md) + `.html` (v2.0) |
| 3 | Landing page 8 section: [`src/pages/Home.jsx`](src/pages/Home.jsx) |
| 4 | Web app fullstack + **Supabase** ([`supabase/`](supabase)), checkout, pembayaran, admin, [audit routing](docs/ROUTING_AUDIT.md) |
| 5 | Fitur AI: [`server/`](server), [`ChatWidget.jsx`](src/components/ChatWidget.jsx), [`admin/`](src/pages/admin) |

## Struktur

```
api/index.js            Vercel Function → server/app.js
docs/                   PRD (md + html), audit routing
public/wilayah/         data provinsi/kota/kecamatan (statis)
server/                 endpoint AI (Express), provider Gemini/9Router, prompt
supabase/               migrations/001_schema.sql, seed.sql
src/
  lib/                  supabase client, catalog, api AI, kompres gambar, invoice PDF
  context/              Auth (Supabase), Cart, Toast
  components/           Layout, CartDrawer, ChatWidget, RegionSelect, SizeGuide, UI kit
  pages/                storefront + admin/
tests/                  tes skema (PGlite) & AI
```

## Catatan

- Foto produk contoh berupa **ilustrasi SVG**. Ganti lewat Admin → Edit Produk → Upload foto.
- Data wilayah dari [emsifa/api-wilayah-indonesia](https://github.com/emsifa/api-wilayah-indonesia) (MIT, data Kemendagri). Data ini memakai pembagian 34 provinsi, sebelum pemekaran Papua 2022.
- Di luar scope saat ini: payment gateway/QRIS otomatis, ongkir per kota, multi-seller.

## Provider AI: utama + cadangan

`AI_PROVIDER` = provider utama, `AI_FALLBACK_PROVIDER` (opsional) = cadangan otomatis saat utama gagal, kena limit (429/503), timeout, atau key salah.
Contoh lokal: 9Router utama, Gemini cadangan (`AI_PROVIDER=openai_compatible`, `AI_FALLBACK_PROVIDER=gemini`).
Di Vercel pakai Gemini langsung saja (`AI_PROVIDER=gemini`, tanpa cadangan provider) karena 9Router di localhost tidak terjangkau.
Catatan akun gratis Google AI Studio: `gemini-3-flash-preview` hanya 20 permintaan/hari. Untuk situs live pakai `gemini-3.5-flash-lite` atau aktifkan billing.

## Jika fitur AI terasa lambat atau gagal

- Ketersediaan model Gemini berubah-ubah (akun gratis punya kuota & beban per model). Server mencatat model yang sedang gagal (503/429/timeout/404) dan melewatinya 3 menit, lalu memakai `GEMINI_FALLBACK_MODEL`.
- Model Gemini 3 "berpikir" dulu dan token berpikir ikut menghabiskan `maxOutputTokens` (jawaban terpotong + lambat). Karena itu server mengirim `thinkingLevel` (`minimal` untuk chat & deskripsi, `low` untuk analisis).
- Cara memilih model: ukur kecepatan beberapa model dengan key kamu sendiri (lihat contoh di riwayat commit "perf: speed up AI"), lalu isi `GEMINI_MODEL` di `.env` dan restart.
