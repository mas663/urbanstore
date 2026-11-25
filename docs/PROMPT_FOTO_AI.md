# Paket Prompt Foto AI — UrbanStore

Panduan membuat **30 foto** (produk + editorial) untuk desain baru UrbanStore memakai Claude di sesi chat terpisah.
Semua foto memakai *art direction* yang sama, jadi hasilnya terlihat seperti **satu sesi pemotretan brand**.

---

## 1. Tutorial singkat

### Yang perlu disiapkan
- **Tidak perlu skill tambahan.** Yang dibutuhkan hanya **konektor Canva** yang aktif di akun claude.ai kamu (Canva punya alat *generate image*).
  - Cek: claude.ai → **Settings → Connectors** → pastikan **Canva** tersambung.
  - Di chat baru, klik ikon **+ / Search and tools** di kolom pesan → pastikan **Canva** dicentang.
- Kalau Claude di sesi itu bilang tidak bisa membuat gambar, berarti konektornya belum aktif di chat tersebut. Aktifkan lalu kirim ulang.
- Alternatif kalau kuota Canva habis: tempel prompt yang sama di generator gambar lain (ChatGPT, Gemini, Ideogram, dsb.). Prompt-nya ditulis umum, jadi tetap berlaku.

### Langkah kerja
1. Buka **chat baru** di claude.ai, aktifkan Canva.
2. Kirim **pesan pembuka** di bawah ini (sekali saja).
3. Kirim **satu prompt per pesan** (salin blok prompt apa adanya, jangan diubah).
4. Klik link **"Open generated image"** → di Canva, **Download** (format JPG/PNG, ukuran terbesar).
5. Ganti nama file **persis** seperti kolom *Nama file* lalu simpan ke folder:
   ```
   Project/urbanstore/foto-mentah/
   ```
   (Folder ini ter-ignore Git. Saya yang akan mengompres, mengubah ke WebP, dan memindahkannya ke `public/images/`.)
6. Kalau hasilnya kurang pas (tangan aneh, ada tulisan/logo, warna salah), minta di chat itu: **"ulangi, ikuti prompt yang sama"**.
7. Setelah selesai (atau sebagian), kabari saya: *"foto sudah di foto-mentah"*.

### Pesan pembuka (kirim pertama kali)
```
Saya akan mengirim beberapa prompt foto untuk website fashion saya. Untuk setiap pesan berikutnya:
gunakan alat generate image Canva, pakai prompt saya PERSIS apa adanya, satu gambar per pesan,
dan gunakan rasio yang tertulis di akhir prompt (contoh "Aspect ratio 4:5" → PORTRAIT_4_5).
Tidak perlu menjelaskan panjang, cukup tampilkan gambarnya dan link Canva-nya.
```

### Prioritas (kalau kuota terbatas, kerjakan berurutan)
| Prioritas | Jumlah | Isi |
|---|---|---|
| **A. Wajib** | 16 | 14 foto produk + hero utama + lookbook |
| **B. Disarankan** | 5 | hero kedua + 4 foto kategori |
| **C. Opsional** | 9 | 6 foto produk dipakai model + brand story + size guide + CTA |

### Cek kualitas sebelum menyimpan
- [ ] Tidak ada **tulisan, logo, atau watermark** di foto (kecuali dibuat sendiri)
- [ ] **Warna** produk sesuai (hitam = hitam pekat, krem = krem hangat, olive = hijau zaitun)
- [ ] Tangan, jari, wajah terlihat **wajar**
- [ ] Produk **utuh**, tidak terpotong, ada ruang kosong di sekelilingnya
- [ ] Latar studio **abu terang hangat** yang sama di semua foto produk

---

## 2. Art direction (sudah termasuk di setiap prompt)

- **Gaya:** editorial streetwear premium, minimalis Jepang × Swiss, kontras bersih.
- **Palet:** hitam, putih tulang, abu, olive, krem, denim. Aksen tunggal **kuning lemon (#D9F24A)** hanya di foto editorial tertentu.
- **Model:** Gen Z Indonesia (awal 20-an), beragam, pose natural & percaya diri, tanpa ekspresi berlebihan.
- **Foto produk:** *ghost mannequin* (tanpa model/gantungan), latar studio abu terang hangat seamless, cahaya lembut, bayangan halus.
- **Foto editorial:** arsitektur beton minimalis kota (nuansa Jakarta modern), cahaya sore yang tegas.

---

## 3. A. Foto produk (WAJIB) — rasio 4:5

> Satu foto per produk, tampak depan. Nama file harus persis.

| # | Nama file | Produk |
|---|---|---|
| 1 | `urban-oversized-heavy-tee.jpg` | Kaos oversized hitam |
| 2 | `essential-boxy-tee.jpg` | Kaos boxy putih |
| 3 | `mono-graphic-tee.jpg` | Kaos grafis abu tua |
| 4 | `linen-relaxed-shirt.jpg` | Kemeja linen krem |
| 5 | `cropped-poplin-shirt.jpg` | Kemeja crop putih (wanita) |
| 6 | `boxy-zip-hoodie.jpg` | Hoodie zip hitam |
| 7 | `soft-pullover-hoodie.jpg` | Hoodie abu muda (wanita) |
| 8 | `minimalist-work-jacket.jpg` | Work jacket olive |
| 9 | `cropped-denim-jacket.jpg` | Jaket denim crop (wanita) |
| 10 | `cargo-pants-olive.jpg` | Celana cargo olive |
| 11 | `urban-relaxed-chino.jpg` | Chino krem |
| 12 | `wide-leg-trousers.jpg` | Celana wide leg hitam (wanita) |
| 13 | `everyday-cap.jpg` | Topi hitam |
| 14 | `canvas-tote-bag.jpg` | Tote bag kanvas natural |

**1 · `urban-oversized-heavy-tee.jpg`**
```
Professional e-commerce product photo of a heavyweight oversized t-shirt in deep jet black cotton (220 gsm), boxy drop-shoulder cut, slightly longer body, ribbed crew neck, visible thick cotton texture. Invisible ghost mannequin, front view, garment centered with generous empty margin around it. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle natural contact shadow, true-to-life color, ultra sharp fabric detail, 85mm lens, f/8. No model, no hanger, no text, no logo, no print, no watermark, no props. Aspect ratio 4:5.
```

**2 · `essential-boxy-tee.jpg`**
```
Professional e-commerce product photo of a clean bright white boxy-fit cotton t-shirt, short and wide silhouette, crew neck, lightweight soft cotton with subtle texture. Invisible ghost mannequin, front view, centered with generous empty margin. Seamless warm light grey studio background (#E8E7E3) so the white garment stands out, soft diffused top light, gentle shadows defining the shape, true-to-life color, ultra sharp, 85mm lens, f/8. No model, no hanger, no text, no logo, no watermark, no props. Aspect ratio 4:5.
```

**3 · `mono-graphic-tee.jpg`**
```
Professional e-commerce product photo of a charcoal dark grey cotton t-shirt with one small minimalist abstract geometric graphic printed in off-white on the left chest (simple circle and line shapes, no letters, no words), regular fit, crew neck. Invisible ghost mannequin, front view, centered with generous empty margin. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle shadow, true-to-life color, ultra sharp, 85mm lens, f/8. No model, no hanger, no readable text, no brand logo, no watermark. Aspect ratio 4:5.
```

**4 · `linen-relaxed-shirt.jpg`**
```
Professional e-commerce product photo of a men's relaxed-fit long sleeve button-up shirt in warm cream linen blend, natural slub linen texture, soft camp collar, cream buttons, slightly wrinkled natural linen look. Invisible ghost mannequin, front view, buttoned, centered with generous empty margin. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle shadow, true-to-life color, ultra sharp, 85mm lens, f/8. No model, no hanger, no text, no logo, no watermark, no props. Aspect ratio 4:5.
```

**5 · `cropped-poplin-shirt.jpg`**
```
Professional e-commerce product photo of a women's cropped button-up shirt in crisp white cotton poplin, waist-length cropped hem, classic pointed collar, long sleeves with buttoned cuffs, smooth crisp fabric. Invisible ghost mannequin, front view, centered with generous empty margin. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, gentle shadows defining the shape, true-to-life color, ultra sharp, 85mm lens, f/8. No model, no hanger, no text, no logo, no watermark, no props. Aspect ratio 4:5.
```

**6 · `boxy-zip-hoodie.jpg`**
```
Professional e-commerce product photo of a black boxy-fit full-zip hoodie in thick cotton fleece (280 gsm), structured double-layer hood standing upright, matte black metal zipper fully closed, two kangaroo side pockets, ribbed cuffs and hem. Invisible ghost mannequin, front view, centered with generous empty margin. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle shadow, true-to-life color, ultra sharp fabric texture, 85mm lens, f/8. No model, no hanger, no drawstring logo, no text, no logo, no watermark. Aspect ratio 4:5.
```

**7 · `soft-pullover-hoodie.jpg`**
```
Professional e-commerce product photo of a women's soft pullover hoodie in light heather grey cotton fleece, relaxed fit, soft rounded hood, kangaroo front pocket, ribbed cuffs and hem, cozy brushed texture. Invisible ghost mannequin, front view, centered with generous empty margin. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, gentle shadows defining the shape, true-to-life color, ultra sharp, 85mm lens, f/8. No model, no hanger, no text, no logo, no watermark. Aspect ratio 4:5.
```

**8 · `minimalist-work-jacket.jpg`**
```
Professional e-commerce product photo of a men's minimalist work jacket in olive green cotton canvas, clean chore-coat silhouette, point collar, matching olive buttons, two flat chest patch pockets, sturdy canvas texture, no decorative details. Invisible ghost mannequin, front view, buttoned, centered with generous empty margin. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle shadow, true-to-life olive color, ultra sharp, 85mm lens, f/8. No model, no hanger, no text, no logo, no watermark. Aspect ratio 4:5.
```

**9 · `cropped-denim-jacket.jpg`**
```
Professional e-commerce product photo of a women's cropped denim jacket in classic mid-blue denim (12 oz), short boxy cropped length ending at the waist, point collar, silver metal buttons, two chest flap pockets, visible denim twill texture with subtle natural fading. Invisible ghost mannequin, front view, buttoned, centered with generous empty margin. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle shadow, true-to-life color, ultra sharp, 85mm lens, f/8. No model, no hanger, no text, no logo, no brand patch, no watermark. Aspect ratio 4:5.
```

**10 · `cargo-pants-olive.jpg`**
```
Professional e-commerce product photo of unisex straight-leg cargo pants in olive green cotton twill, functional side cargo pockets with flaps on both legs, elastic waistband with drawstring, full length, sturdy twill texture. Invisible ghost mannequin, front view, full length visible, centered with generous empty margin top and bottom. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle shadow, true-to-life olive color, ultra sharp, 85mm lens, f/8. No model, no hanger, no text, no logo, no watermark. Aspect ratio 4:5.
```

**11 · `urban-relaxed-chino.jpg`**
```
Professional e-commerce product photo of men's relaxed-fit chino trousers in warm cream beige cotton stretch twill, clean front with subtle crease, straight leg, belt loops, full length. Invisible ghost mannequin, front view, full length visible, centered with generous empty margin top and bottom. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle shadow, true-to-life color, ultra sharp, 85mm lens, f/8. No model, no hanger, no belt, no text, no logo, no watermark. Aspect ratio 4:5.
```

**12 · `wide-leg-trousers.jpg`**
```
Professional e-commerce product photo of women's high-waist wide-leg trousers in black fluid polyester rayon, very wide flowing legs with soft drape, front pleats, full length. Invisible ghost mannequin, front view, full length visible, centered with generous empty margin top and bottom. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle shadow, true-to-life deep black, ultra sharp, 85mm lens, f/8. No model, no hanger, no text, no logo, no watermark. Aspect ratio 4:5.
```

**13 · `everyday-cap.jpg`**
```
Professional e-commerce still life photo of a black low-profile cotton twill baseball cap, curved brim, six-panel crown, adjustable strap partly visible, three-quarter front angle, sitting on a seamless warm light grey studio surface (#E8E7E3) with matching background, soft diffused top light, gentle natural shadow under the brim, true-to-life color, ultra sharp texture, 85mm lens, f/8. No embroidery text, no logo, no watermark, no props. Aspect ratio 4:5.
```

**14 · `canvas-tote-bag.jpg`**
```
Professional e-commerce still life photo of a natural undyed heavy cotton canvas tote bag (16 oz), rectangular shape, two sturdy long shoulder straps, standing upright, front view, slightly full shape, visible woven canvas texture. Seamless warm light grey studio background (#E8E7E3), soft diffused top light, subtle natural contact shadow, true-to-life color, ultra sharp, 85mm lens, f/8. No print, no text, no logo, no watermark, no props. Aspect ratio 4:5.
```

---

## 4. A. Editorial wajib

**15 · `hero-1.jpg`** — foto utama halaman depan (rasio 4:5)
```
Editorial streetwear campaign photo: a confident Indonesian Gen Z young man (early 20s) wearing a black oversized heavyweight t-shirt and olive straight-leg cargo pants, white minimal sneakers, standing in front of a minimalist raw concrete wall with clean geometric architecture, one acid lemon-yellow (#D9F24A) painted block on the wall behind him as the only bright accent. Late-afternoon sunlight with crisp defined shadows, high contrast, Japanese-Swiss minimalist aesthetic, full body, centered, natural relaxed pose, shot on 35mm, subtle film grain. No text, no logos, no watermark. Aspect ratio 4:5.
```

**16 · `lookbook.jpg`** — fitur "Shop the Look" (rasio 16:9, model di tengah)
```
Wide editorial fashion photo, a stylish Indonesian Gen Z young woman (early 20s) standing in the exact center of the frame, full body, wearing a black oversized heavyweight t-shirt, olive green cargo pants, a black low-profile baseball cap, and carrying a natural canvas tote bag on her shoulder, white minimal sneakers. Background: seamless warm light grey studio wall (#E8E7E3) with lots of empty space on the left and right sides. Soft daylight, crisp detail, every garment clearly visible, minimalist high-end streetwear lookbook, true-to-life colors. No text, no logos, no watermark. Aspect ratio 16:9.
```

---

## 5. B. Disarankan

**17 · `hero-2.jpg`** (rasio 4:5)
```
Editorial streetwear campaign photo: a confident Indonesian Gen Z young woman (early 20s) wearing a white cropped poplin shirt and black high-waist wide-leg trousers, walking along a minimalist concrete staircase with strong geometric lines, late-afternoon sunlight casting long crisp shadows, high contrast, Japanese-Swiss minimalist aesthetic, three-quarter body, candid natural movement, shot on 35mm, subtle film grain. No text, no logos, no watermark. Aspect ratio 4:5.
```

**18 · `cat-pria.jpg`** (rasio 4:5)
```
Minimalist menswear editorial photo: an Indonesian young man (early 20s) wearing a cream linen relaxed shirt and cream chino trousers, standing against a seamless warm light grey studio wall (#E8E7E3), soft window daylight, calm confident expression, three-quarter body, Japanese minimalist styling, high-end catalogue look, true-to-life colors. No text, no logos, no watermark. Aspect ratio 4:5.
```

**19 · `cat-wanita.jpg`** (rasio 4:5)
```
Minimalist womenswear editorial photo: an Indonesian young woman (early 20s) wearing a modest neutral beige hijab, a light heather grey soft pullover hoodie and black wide-leg trousers, standing against a seamless warm light grey studio wall (#E8E7E3), soft window daylight, calm confident expression, three-quarter body, Japanese minimalist styling, high-end catalogue look, true-to-life colors. No text, no logos, no watermark. Aspect ratio 4:5.
```

**20 · `cat-outerwear.jpg`** (rasio 3:2)
```
Editorial outerwear photo: two Indonesian Gen Z friends (a young man and a young woman, early 20s) standing side by side on a minimalist city rooftop with concrete textures, he wears an olive cotton canvas work jacket, she wears a cropped mid-blue denim jacket, overcast soft daylight, muted tones, relaxed natural poses, waist-up, Japanese-Swiss minimalist aesthetic, shot on 35mm. No text, no logos, no watermark. Aspect ratio 3:2.
```

**21 · `cat-essentials.jpg`** (rasio 1:1)
```
Overhead flat lay photo of essential wardrobe basics neatly arranged on a seamless warm light grey surface (#E8E7E3): a folded black oversized t-shirt, a folded white boxy t-shirt, a black low-profile baseball cap, and a natural canvas tote bag, precise minimalist grid arrangement with generous spacing, soft even daylight, subtle shadows, true-to-life colors, ultra sharp. No text, no logos, no watermark. Aspect ratio 1:1.
```

---

## 6. C. Opsional (foto produk dipakai model) — rasio 4:5

Dipakai sebagai gambar kedua saat kursor diarahkan ke kartu produk.

| # | Nama file | Isi |
|---|---|---|
| 22 | `urban-oversized-heavy-tee-model.jpg` | Kaos hitam dipakai model pria |
| 23 | `essential-boxy-tee-model.jpg` | Kaos putih dipakai model wanita |
| 24 | `linen-relaxed-shirt-model.jpg` | Kemeja linen dipakai model pria |
| 25 | `boxy-zip-hoodie-model.jpg` | Hoodie zip dipakai model |
| 26 | `minimalist-work-jacket-model.jpg` | Work jacket dipakai model pria |
| 27 | `cargo-pants-olive-model.jpg` | Cargo dipakai model wanita |

Gunakan template ini (ganti bagian dalam kurung siku):
```
Minimalist e-commerce on-model photo: an Indonesian Gen Z [young man / young woman] (early 20s) wearing [NAMA & DESKRIPSI PRODUK, contoh: a black heavyweight oversized t-shirt] styled with [contoh: olive cargo pants], standing against a seamless warm light grey studio wall (#E8E7E3), soft diffused daylight, natural relaxed pose, three-quarter body, face partly visible, the garment is the clear focus, true-to-life colors, high-end streetwear catalogue. No text, no logos, no watermark. Aspect ratio 4:5.
```

**28 · `story.jpg`** (rasio 4:5)
```
Moody editorial photo of a minimalist clothing studio workspace: a clothing rack with a few neatly hung garments in black, white, olive and cream, a wooden table with folded t-shirts and a measuring tape, raw concrete wall, soft late-afternoon window light with long shadows, calm Japanese minimalist atmosphere, no people. No text, no logos, no watermark. Aspect ratio 4:5.
```

**29 · `sizeguide.jpg`** (rasio 1:1)
```
Overhead flat lay photo of a black oversized t-shirt laid perfectly flat on a seamless warm light grey surface (#E8E7E3) with a yellow tailor measuring tape stretched straight across the chest width and another along the body length, precise and clean, soft even daylight, true-to-life colors, ultra sharp. No text, no numbers readable, no logos, no watermark. Aspect ratio 1:1.
```

**30 · `cta.jpg`** (rasio 16:9)
```
Wide cinematic editorial photo of a group of four stylish Indonesian Gen Z friends (early 20s, mixed men and women, one woman wearing a black hijab) walking together toward the camera across a minimalist concrete plaza at golden hour, outfits in black, white, olive, cream and denim streetwear, long dramatic shadows, high contrast, slightly dark moody tones on the left side of the frame for text overlay, shot on 35mm, subtle film grain. No text, no logos, no watermark. Aspect ratio 16:9.
```

---

## 7. Setelah foto siap

Kabari saya. Saya akan:
1. Mengompres & mengubah ke WebP (cepat dimuat, tetap tajam).
2. Memasangnya di halaman depan, katalog, dan detail produk.
3. Membuat file SQL untuk mengganti foto produk di Supabase (kamu tinggal paste di SQL Editor, sama seperti sebelumnya).
