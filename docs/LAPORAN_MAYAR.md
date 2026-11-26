# Laporan Integrasi Payment Gateway Mayar.id — UrbanStore

> Sesi 6 · Tugas 02 · Prompt: *"Mengubah metode pembayaran menggunakan Mayar"*
> Referensi: https://docs.mayar.id/api-reference-v2/introduction

## 1. Ringkasan

Checkout UrbanStore kini memakai **Mayar.id** sebagai metode pembayaran utama (QRIS, Virtual Account, e-wallet). Setelah customer membayar, **status pesanan otomatis menjadi Lunas** dan **terverifikasi otomatis di halaman admin**, tanpa upload bukti dan tanpa konfirmasi manual. Transfer bank manual tetap ada sebagai cadangan bila Mayar sedang tidak aktif.

| Syarat dari prompt | Status | Cara dipenuhi |
|---|---|---|
| Setiap customer bisa melakukan pembayaran | ✅ | Tombol **Bayar Sekarang** di checkout & halaman pesanan → halaman bayar Mayar |
| Status pesanan otomatis terupdate | ✅ | Webhook `payment.received` + pengecekan ulang saat customer kembali ke tab |
| Stok produk terupdate | ✅ | Stok dipotong saat checkout dan dikembalikan bila kedaluwarsa; bila pembayaran datang terlambat, stok dipesan ulang (atau ditandai perlu refund jika habis) |
| Admin otomatis terverifikasi berdasarkan response Mayar | ✅ | Label **Auto · Mayar** + ID invoice/transaksi + waktu verifikasi di Admin → Pesanan |
| Tidak ada kesalahan pembayaran | ✅ | Nominal wajib sama persis, verifikasi ulang ke API, idempotent, terkunci per pesanan (detail di §4) |
| Dicek dulu & dilaporkan | ✅ | 45 tes otomatis (10 khusus Mayar) + dokumen ini |

## 2. Alur pembayaran

```
Customer checkout ──► place_order (stok dipotong, status: Menunggu Pembayaran)
        │
        ▼
POST /api/payments/mayar/create ──► Mayar POST /invoices/create ──► link bayar
        │                                                         (berlaku s.d. batas bayar 1 jam)
        ▼
Customer membayar di halaman Mayar (QRIS / VA / e-wallet)
        │
        ├──► Mayar → POST /api/webhook/mayar?token=…   (event payment.received)
        │         └─► server: GET /invoices/{id} ke Mayar → status "paid" & nominal cocok?
        │                    └─► mayar_mark_paid()  → Lunas
        │
        └──► Customer kembali ke tab UrbanStore
                  └─► POST /api/payments/mayar/sync → cek ke Mayar → mayar_mark_paid()  (cadangan bila webhook telat)
```

## 3. File yang dibuat / diubah

| File | Isi |
|---|---|
| `supabase/migrations/003_mayar.sql` | Kolom Mayar di `payments` (`mayar_invoice_id`, `mayar_transaction_id`, `mayar_link`, `mayar_expired_at`, `paid_via`), fungsi `mayar_attach_invoice` & `mayar_mark_paid` (khusus `service_role`) |
| `server/payments/mayar.js` | Klien Mayar API v2: header Bearer, timeout 15 dtk, `statusCode` di body sebagai penentu, pesan error ramah (429/401/502/503); `buildInvoicePayload()` |
| `server/routes/payments.js` | Endpoint `GET /api/payments/config`, `POST /api/payments/mayar/create`, `POST /api/payments/mayar/sync`, `POST /api/webhook/mayar` |
| `server/lib/auth.js` | Middleware `requireUser(role)` dipakai bersama endpoint AI & pembayaran |
| `server/data.js`, `server/config.js`, `server/app.js` | Akses data pembayaran, konfigurasi env Mayar, pemasangan route |
| `src/lib/payments.js` | Helper frontend: cek Mayar aktif, mulai bayar, sinkron status |
| `src/pages/Checkout.jsx` | Pilihan metode: **Bayar instan** (default) / transfer manual; langsung diarahkan ke Mayar setelah order dibuat |
| `src/pages/Invoice.jsx` | Kartu *Bayar Sekarang*, cek status otomatis saat kembali ke tab, transfer manual dilipat sebagai cadangan |
| `src/pages/admin/Orders.jsx` | Label **Auto · Mayar**, detail invoice/transaksi, catatan sistem di riwayat, peringatan perlu refund |
| `tests/payments.test.js`, `tests/supabase/schema.test.js` | Tes endpoint & fungsi database Mayar |

## 4. Pengamanan (kenapa pembayaran tidak bisa dipalsukan)

1. **API key hanya di server** (`MAYAR_API_KEY`). Browser tidak pernah melihatnya.
2. **Webhook tidak dipercaya mentah-mentah.** Mayar v2 belum menyediakan signature webhook, jadi webhook hanya "pemicu"; server selalu menanyakan status invoice langsung ke `GET /invoices/{id}` memakai API key sendiri.
3. **Token rahasia di URL webhook** (`MAYAR_WEBHOOK_SECRET`) dibandingkan dengan `crypto.timingSafeEqual` sebagai filter lapis pertama.
4. **Nominal wajib sama persis** dengan total pesanan; bila beda, pesanan tidak dilunasi dan admin mendapat catatan.
5. **Hanya server yang bisa melunasi.** `mayar_mark_paid` dicabut dari `anon`/`authenticated`; tes membuktikan browser ditolak.
6. **Idempotent & terkunci** (`select … for update`): webhook ganda / bersamaan tidak memproses pesanan dua kali.
7. **Satu invoice = satu pesanan** (unique index), link yang masih berlaku dipakai ulang sehingga tidak ada invoice ganda dan aman terhadap aturan *duplicate request* (429) Mayar. Batas API 50 request/menit.
8. **Total invoice dicek** sebelum dikirim ke Mayar (Σ item + ongkir = total pesanan).

## 5. Pengujian

`npm test` → **45 tes lolos**, termasuk:

| Tes | Membuktikan |
|---|---|
| `buildInvoicePayload` | Rincian item + ongkir, total cocok, kedaluwarsa ikut batas bayar |
| create: login, format kode, milik sendiri | Tamu 401, admin 403, kode aneh 400, pesanan orang lain 404 |
| create: invoice sekali lalu dipakai ulang | Tidak ada invoice ganda |
| create: pesanan kedaluwarsa | Ditolak 409 dengan pesan jelas |
| webhook: token & event | Token salah 401, event lain diabaikan |
| **webhook palsu** | Invoice belum dibayar → pesanan **tetap** Menunggu Pembayaran |
| webhook asli | Dicek ulang ke Mayar → Lunas dengan nominal dari Mayar |
| sync | Status terupdate tanpa menunggu webhook; customer lain 404 |
| klien Mayar | Header Bearer, `statusCode` body, key kosong → 503 |
| skema `mayar_mark_paid` | Browser ditolak; not_found; amount_mismatch; paid; already_paid; bayar terlambat → stok dipesan ulang (paid_late) |

Verifikasi di Supabase live: migrasi 003 sudah dijalankan — kolom ada, dan `mayar_mark_paid` menolak panggilan dari browser (`permission denied`).

## 6. Konfigurasi

| Env | Keterangan |
|---|---|
| `MAYAR_API_KEY` | API key Read & Write dari dashboard Mayar → Integrasi → API Keys |
| `MAYAR_ENV` | `sandbox` (api.mayar.io) atau `production` (api.mayar.id) |
| `MAYAR_WEBHOOK_SECRET` | String acak; dipakai di URL webhook |

Webhook di dashboard Mayar → Integrasi → Webhook:
`https://urbanstore-coral.vercel.app/api/webhook/mayar?token=<MAYAR_WEBHOOK_SECRET>`

## 7. Status & catatan

- ✅ Kode, database, tes, dan tampilan admin selesai.
- ⏳ **Uji transaksi nyata menunggu verifikasi KYC akun Mayar.** Server sandbox Mayar (`web.mayar.io` / `api.mayar.io`) tidak dapat dijangkau selama pengembangan (timeout dari dua jaringan berbeda), sehingga pengujian dilakukan di produksi setelah KYC disetujui, memakai nominal kecil.
- Transfer bank manual dipertahankan sebagai cadangan agar toko tetap bisa menerima pesanan bila Mayar sedang gangguan.
