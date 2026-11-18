# UrbanStore

Online fashion store pria & wanita untuk Gen Z — project studi kasus **Vibe Coding Bootcamp Batch 4 (CODEPOLITAN)**, dibangun mengikuti materi Sesi 1–5.

> Swiss International Style × Japanese Minimalism · hitam-putih + aksen lemon · copywriting Gen Z

**Stack:** Vite + React + Tailwind CSS · Node.js + Express · SQLite (bawaan Node, `node:sqlite`) · Gemini API

---

## Cara menjalankan

Butuh **Node.js 22.13+** (disarankan versi terbaru).

```bash
npm install
cp .env.example .env      # lalu isi ADMIN_PASSWORD & API key (lihat di bawah)
npm run dev               # API di :3001 + web di http://localhost:5173
```

Database SQLite dibuat otomatis di `data/urbanstore.db` dan langsung terisi 14 produk contoh.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Mode development (frontend + backend sekaligus) |
| `npm run build && npm start` | Mode production — buka http://localhost:3001 |
| `npm test` | Menjalankan 19 tes otomatis (alur bisnis, hak akses, AI, kuota) |
| `npm run seed` | Reset database ke data contoh (semua pesanan & akun customer terhapus) |
| `npm run docs:prd` | Generate `docs/PRD_UrbanStore.html` dari versi Markdown |
| `npm run images` | Generate ulang ilustrasi produk di `public/products` |

### Akun

- **Store Admin:** buka `/admin`, login dengan `ADMIN_EMAIL` & `ADMIN_PASSWORD` dari `.env` (akun dibuat otomatis saat database pertama kali dibuat).
- **Customer:** daftar sendiri di `/daftar`. Checkout **tidak wajib** akun; akun hanya dibutuhkan untuk AI Shopping Assistant & riwayat pesanan.

### Konfigurasi AI (Sesi 5)

Ambil API key di [Google AI Studio](https://aistudio.google.com) lalu isi di `.env`:

```env
GEMINI_API_KEY_CUSTOMER=...   # key "urbanstore-customer" → AI Shopping Assistant (floating chat)
GEMINI_API_KEY_ADMIN=...      # key "urbanstore-admin"    → AI Generate Deskripsi & AI Analisis Penjualan
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite   # dipakai otomatis saat model utama overload (503/429)
```

`GEMINI_API_KEY` (tanpa akhiran) tetap didukung sebagai key cadangan jika salah satu key di atas kosong.
API key **hanya dibaca di server** — tidak pernah dikirim ke browser. Restart server setelah mengubah `.env`.

**Pakai 9Router / AI router lain:** set `AI_PROVIDER=openai_compatible`, lalu isi `AI_BASE_URL`, `AI_MODEL`, dan `AI_API_KEY_CUSTOMER` / `AI_API_KEY_ADMIN` sesuai dashboard router. Kode fitur tidak perlu diubah.

---

## Peta materi → implementasi

| Sesi | Materi | Implementasi di project ini |
|---|---|---|
| **1** | Vibe coding, prompt RTF/RTCF/RISE, *One Prompt = One Feature*, iterasi & debugging | Fitur dibangun bertahap per modul & di-commit per tahap (lihat `git log`) |
| **2** | Product planning, MVP, MoSCoW, PRD AI-ready | [`docs/PRD_UrbanStore.md`](docs/PRD_UrbanStore.md) + [`.html`](docs/PRD_UrbanStore.html) — 12 section, user story, Gherkin, changelog |
| **3** | Landing page (8 section) | [`src/pages/Home.jsx`](src/pages/Home.jsx): Hero · Value Prop · Featured · Benefits · Brand Story · FAQ · Final CTA · Footer |
| **4** | Web app fullstack, database thinking (6 entitas), role Admin/Customer, 7 tahap transaksi, Git per fitur | [`server/db.js`](server/db.js), [`server/routes/`](server/routes), storefront [`src/pages/`](src/pages), admin [`src/pages/admin/`](src/pages/admin) |
| **5** | Gemini API di backend, floating chat, AI deskripsi, AI analisis, AI UX, kuota, 9Router, hemat token | [`server/ai/`](server/ai), [`server/routes/ai.js`](server/routes/ai.js), [`ChatWidget.jsx`](src/components/ChatWidget.jsx), [`AiDescriptionButton.jsx`](src/pages/admin/AiDescriptionButton.jsx), [`Analysis.jsx`](src/pages/admin/Analysis.jsx) |

### Fitur

**Customer (storefront)**
- Katalog kurasi: grid responsive, search, filter Pria/Wanita & jenis produk, sorting harga, badge **Habis** & diskon
- Detail produk: size picker wajib, **size guide visual** (cm + estimasi TB/BB), stok, produk terkait
- Keranjang (tersimpan di server via cookie, tanpa login): ubah qty, hapus, subtotal realtime, validasi stok
- **Checkout 3 langkah**: data pengiriman → pengiriman (Regular Rp15.000 / Express Rp30.000) & transfer bank → review
- Invoice dengan **Order ID unik** `URB-2026-001`, instruksi transfer, tombol *Saya Sudah Transfer*, timeline status
- Cek pesanan via nomor order + WhatsApp · Pesanan Saya (untuk yang login)
- **AI Shopping Assistant** (login): cek stok/harga/bahan dari database, saran ukuran dari TB/BB, mix & match, tolak topik di luar toko, **5 pesan / 12 jam** (dihitung di backend), streaming, retry

**Store Admin (`/admin`)**
- Dashboard: total pesanan, menunggu konfirmasi, omzet terkonfirmasi, stok menipis
- Produk: tambah/edit/arsip dengan validasi (nama, kategori, harga > 0, stok, min. 1 ukuran)
- **Generate Description with AI**: dari data form → teks bersih tanpa Markdown, tetap bisa diedit
- Pesanan: filter status, detail, **Konfirmasi Lunas**, tandai dikirim/selesai, batalkan (stok dikembalikan)
- **Analisis Penjualan AI**: metrik agregat + dokumen strategi (promo, bundling, restock) secara streaming

### Aturan bisnis penting
- Harga & total selalu dihitung ulang di server — harga dari browser tidak dipercaya
- Stok dikurangi saat order dibuat (dalam transaksi, anti-oversell) dan dikembalikan saat dibatalkan
- Harga & nama produk disimpan sebagai *snapshot* di invoice
- Invoice hanya bisa dibuka dengan token rahasia di link, oleh pemilik akun, atau admin

### Struktur folder

```
docs/            PRD (md + html)
server/
  ai/            provider Gemini / OpenAI-compatible, system prompt
  lib/           auth (cookie httpOnly), validasi, helper HTTP
  routes/        catalog, cart, orders, auth, admin, ai
  db.js          skema SQLite + seed
src/
  components/    Layout, CartDrawer, ChatWidget, SizeGuide, UI kit
  context/       Auth, Cart, Toast
  pages/         storefront + admin/
tests/           tes API & AI (dengan server AI tiruan)
```

### Catatan
- Foto produk berupa **ilustrasi SVG** (placeholder). Ganti dengan foto asli lewat Admin → Edit Produk → URL foto.
- Rekening transfer (`STORE_BANK_*`) adalah contoh dari materi — sesuaikan di `.env`.
- Di luar scope MVP (sesuai PRD): payment gateway/QRIS otomatis, API kurir, multi-seller, AR fitting.
