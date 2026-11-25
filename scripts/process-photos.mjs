// Olah foto mentah hasil AI → WebP siap pakai. Jalankan: npm run photos
// Input : foto-mentah/<nama>.jpg|jpeg|png|webp   (nama sesuai docs/PROMPT_FOTO_AI.md)
// Output: public/images/products/<slug>.webp  (4:5)
//         public/images/editorial/<nama>.webp (rasio sesuai slot)
//         src/lib/photoManifest.json → dipakai resolveImage() untuk mengganti ilustrasi SVG lama
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(root, 'foto-mentah');
const OUT_PRODUCTS = path.join(root, 'public/images/products');
const OUT_EDITORIAL = path.join(root, 'public/images/editorial');
const MANIFEST = path.join(root, 'src/lib/photoManifest.json');

// slug produk → ilustrasi SVG bawaan seed (supaya data lama di database otomatis ikut memakai foto)
const PRODUCTS = {
  'urban-oversized-heavy-tee': '/products/oversized-tee-black.svg',
  'essential-boxy-tee': '/products/boxy-tee-white.svg',
  'mono-graphic-tee': '/products/graphic-tee-grey.svg',
  'linen-relaxed-shirt': '/products/linen-shirt-cream.svg',
  'cropped-poplin-shirt': '/products/poplin-shirt-white.svg',
  'boxy-zip-hoodie': '/products/zip-hoodie-black.svg',
  'soft-pullover-hoodie': '/products/pullover-hoodie-grey.svg',
  'minimalist-work-jacket': '/products/work-jacket-olive.svg',
  'cropped-denim-jacket': '/products/denim-jacket-blue.svg',
  'cargo-pants-olive': '/products/cargo-pants-olive.svg',
  'urban-relaxed-chino': '/products/chino-cream.svg',
  'wide-leg-trousers': '/products/wide-trousers-black.svg',
  'everyday-cap': '/products/cap-black.svg',
  'canvas-tote-bag': '/products/tote-natural.svg',
};

// slot editorial → ukuran output [lebar, tinggi]
const EDITORIAL = {
  'hero-1': [1200, 1500], 'hero-2': [1200, 1500], lookbook: [1920, 1080],
  'cat-pria': [960, 1200], 'cat-wanita': [960, 1200], 'cat-outerwear': [1200, 800], 'cat-essentials': [1000, 1000],
  story: [1200, 1500], sizeguide: [1000, 1000], cta: [1920, 1080],
};

fs.mkdirSync(OUT_PRODUCTS, { recursive: true });
fs.mkdirSync(OUT_EDITORIAL, { recursive: true });

const files = fs.existsSync(RAW) ? fs.readdirSync(RAW).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : [];
const manifest = { products: {}, editorial: {} };
const skipped = [];

for (const file of files) {
  const raw = path.parse(file).name.toLowerCase();
  const isModel = raw.endsWith('-model');
  const slug = isModel ? raw.slice(0, -6) : raw;
  const input = path.join(RAW, file);

  if (PRODUCTS[slug]) {
    const name = isModel ? `${slug}-model` : slug;
    const out = path.join(OUT_PRODUCTS, `${name}.webp`);
    await sharp(input).rotate().resize(960, 1200, { fit: 'cover', position: 'attention' }).webp({ quality: 80 }).toFile(out);
    manifest.products[slug] ??= {};
    manifest.products[slug][isModel ? 'model' : 'main'] = `/images/products/${name}.webp`;
    console.log('✓ produk   ', name);
  } else if (EDITORIAL[raw]) {
    const [w, h] = EDITORIAL[raw];
    await sharp(input).rotate().resize(w, h, { fit: 'cover', position: 'attention' }).webp({ quality: 78 }).toFile(path.join(OUT_EDITORIAL, `${raw}.webp`));
    manifest.editorial[raw] = `/images/editorial/${raw}.webp`;
    console.log('✓ editorial', raw);
  } else {
    skipped.push(file);
  }
}

// Gabungkan dengan hasil sebelumnya (foto yang sudah diolah tetap tercatat walau file mentahnya dihapus)
for (const f of fs.readdirSync(OUT_PRODUCTS)) {
  const name = path.parse(f).name;
  const isModel = name.endsWith('-model');
  const slug = isModel ? name.slice(0, -6) : name;
  if (!PRODUCTS[slug]) continue;
  manifest.products[slug] ??= {};
  manifest.products[slug][isModel ? 'model' : 'main'] ??= `/images/products/${f}`;
}
for (const f of fs.readdirSync(OUT_EDITORIAL)) {
  const name = path.parse(f).name;
  if (EDITORIAL[name]) manifest.editorial[name] ??= `/images/editorial/${f}`;
}

const legacy = {};
for (const [slug, svg] of Object.entries(PRODUCTS)) if (manifest.products[slug]?.main) legacy[svg] = manifest.products[slug].main;
fs.writeFileSync(MANIFEST, JSON.stringify({ ...manifest, legacy }, null, 2) + '\n');

console.log(`\n${Object.keys(manifest.products).length}/14 foto produk, ${Object.keys(manifest.editorial).length} foto editorial → src/lib/photoManifest.json`);
if (skipped.length) console.log('⚠ Nama file tidak dikenali (cek docs/PROMPT_FOTO_AI.md):', skipped.join(', '));
