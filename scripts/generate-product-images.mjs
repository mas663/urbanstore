// Generate ilustrasi produk minimalis (SVG) ke public/products. Jalankan: npm run images
// Ini placeholder visual yang konsisten dengan gaya Swiss × Japanese; ganti dengan foto asli lewat Admin.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/products');
fs.mkdirSync(out, { recursive: true });

const C = {
  hitam: '#1d1d1d', putih: '#fafaf8', abuTua: '#4b4b4b', krem: '#e4d9c3', abuMuda: '#c8c8c5',
  olive: '#6a6a48', denim: '#58739a', natural: '#e8e0cb',
};

const shapes = {
  tee: ({ crop = 600 } = {}) =>
    `<path d="M205,170 L255,148 Q300,182 345,148 L395,170 L478,245 L432,305 L398,280 L398,${crop} L202,${crop} L202,280 L168,305 L122,245 Z"/>`,
  boxy: () =>
    `<path d="M190,172 L255,148 Q300,182 345,148 L410,172 L488,262 L440,316 L410,292 L410,575 L190,575 L190,292 L160,316 L112,262 Z"/>`,
  longSleeve: ({ crop = 600 } = {}) =>
    `<path d="M205,170 L255,148 Q300,182 345,148 L395,170 L445,232 L478,560 L425,570 L398,330 L398,${crop} L202,${crop} L202,330 L175,570 L122,560 L155,232 Z"/>`,
  pants: ({ wide = false } = {}) =>
    wide
      ? `<path d="M220,150 L380,150 L430,640 L322,640 L300,310 L278,640 L170,640 Z"/>`
      : `<path d="M218,150 L382,150 L398,640 L318,640 L300,300 L282,640 L202,640 Z"/>`,
  cap: () =>
    `<path d="M190,410 Q188,255 300,252 Q412,255 410,410 Z"/><path d="M182,410 Q300,385 478,440 Q400,470 300,448 Q222,438 182,410 Z"/>`,
  tote: () =>
    `<path d="M240,300 Q240,170 300,170 Q360,170 360,300" fill="none" stroke-width="16" stroke="currentColor"/><path d="M185,300 L415,300 L432,630 L168,630 Z"/>`,
};

const details = {
  hood: '<path d="M240,162 Q300,58 360,162 Q300,198 240,162 Z" opacity=".85"/>',
  zip: '<line x1="300" y1="178" x2="300" y2="600" stroke-width="3"/>',
  kangaroo: '<path d="M232,470 L368,470 L384,560 L216,560 Z" fill="none" stroke-width="3"/>',
  collar: '<path d="M255,148 L300,205 L272,222 Z M345,148 L300,205 L328,222 Z" stroke-width="3"/>',
  buttons: (to = 580) =>
    Array.from({ length: Math.floor((to - 230) / 70) + 1 }, (_, i) => `<circle cx="300" cy="${235 + i * 70}" r="5"/>`).join(''),
  chestPockets: '<rect x="225" y="250" width="55" height="60" fill="none" stroke-width="3"/><rect x="320" y="250" width="55" height="60" fill="none" stroke-width="3"/>',
  cargo: '<rect x="208" y="360" width="46" height="80" fill="none" stroke-width="3"/><rect x="346" y="360" width="46" height="80" fill="none" stroke-width="3"/>',
  waistband: '<line x1="218" y1="178" x2="382" y2="178" stroke-width="3"/>',
  graphic: '<rect x="245" y="250" width="110" height="14"/><rect x="245" y="272" width="80" height="14"/><rect x="245" y="294" width="96" height="14"/>',
  capButton: '<circle cx="300" cy="252" r="9"/><path d="M300,258 L300,405" fill="none" stroke-width="3"/>',
};

const products = [
  ['oversized-tee-black', 'boxy', {}, C.hitam, '#ecebe7', []],
  ['boxy-tee-white', 'boxy', {}, C.putih, '#dedcd6', []],
  ['graphic-tee-grey', 'tee', {}, C.abuTua, '#ecebe7', ['graphic']],
  ['linen-shirt-cream', 'longSleeve', {}, C.krem, '#efeee9', ['collar', 'buttons']],
  ['poplin-shirt-white', 'longSleeve', { crop: 480 }, C.putih, '#dedcd6', ['collar', ['buttons', 440]]],
  ['zip-hoodie-black', 'longSleeve', {}, C.hitam, '#ecebe7', ['hood', 'zip', 'kangaroo']],
  ['pullover-hoodie-grey', 'longSleeve', {}, C.abuMuda, '#efeee9', ['hood', 'kangaroo']],
  ['work-jacket-olive', 'longSleeve', {}, C.olive, '#ecebe7', ['collar', 'buttons', 'chestPockets']],
  ['denim-jacket-blue', 'longSleeve', { crop: 470 }, C.denim, '#ecebe7', ['collar', ['buttons', 430], 'chestPockets']],
  ['cargo-pants-olive', 'pants', {}, C.olive, '#ecebe7', ['waistband', 'cargo']],
  ['chino-cream', 'pants', {}, C.krem, '#efeee9', ['waistband']],
  ['wide-trousers-black', 'pants', { wide: true }, C.hitam, '#ecebe7', ['waistband']],
  ['cap-black', 'cap', {}, C.hitam, '#ecebe7', ['capButton']],
  ['tote-natural', 'tote', {}, C.natural, '#dedcd6', []],
  ['placeholder', 'tee', {}, '#d6d6d2', '#ecebe7', []],
];

// Warna garis detail: lebih gelap untuk kain terang, lebih terang untuk kain gelap
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

for (const [name, shape, opts, fill, bg, extra] of products) {
  const line = lum(fill) > 0.6 ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.22)';
  const outline = lum(fill) > 0.85 ? ' stroke="rgba(0,0,0,.18)" stroke-width="2"' : '';
  const det = extra
    .map((d) => (Array.isArray(d) ? details[d[0]](d[1]) : typeof details[d] === 'function' ? details[d]() : details[d]))
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" role="img" aria-label="${name.replace(/-/g, ' ')}">
<rect width="600" height="750" fill="${bg}"/>
<g fill="${fill}" color="${fill}"${outline}>${shapes[shape](opts)}</g>
<g fill="${line}" stroke="${line}">${det}</g>
<text x="32" y="718" font-family="Inter,Helvetica,Arial,sans-serif" font-size="13" letter-spacing="3" fill="rgba(0,0,0,.35)">URBANSTORE</text>
</svg>`;
  fs.writeFileSync(path.join(out, `${name}.svg`), svg);
}
console.log(`✓ ${products.length} ilustrasi produk dibuat di public/products`);
