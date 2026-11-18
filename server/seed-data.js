// Data awal katalog UrbanStore. Admin bisa menambah / mengubah lewat /admin.
// Gambar adalah ilustrasi lokal (public/products). Admin bisa mengganti dengan URL foto asli.

export const categories = [
  { name: 'T-Shirt', slug: 't-shirt', sizeType: 'top' },
  { name: 'Kemeja', slug: 'kemeja', sizeType: 'top' },
  { name: 'Hoodie', slug: 'hoodie', sizeType: 'top' },
  { name: 'Jacket', slug: 'jacket', sizeType: 'top' },
  { name: 'Celana', slug: 'celana', sizeType: 'bottom' },
  { name: 'Topi', slug: 'topi', sizeType: 'onesize' },
  { name: 'Aksesoris', slug: 'aksesoris', sizeType: 'onesize' },
];

// Size chart visual (cm). tb/bb = estimasi tinggi & berat badan yang biasanya cocok.
export const sizeCharts = {
  top: [
    { size: 'S', chest: 100, length: 68, sleeve: 20, tb: '155–165', bb: '45–55' },
    { size: 'M', chest: 106, length: 71, sleeve: 21, tb: '163–172', bb: '55–65' },
    { size: 'L', chest: 112, length: 74, sleeve: 22, tb: '170–178', bb: '65–75' },
    { size: 'XL', chest: 118, length: 77, sleeve: 23, tb: '176–185', bb: '75–88' },
  ],
  bottom: [
    { size: 'S', waist: 70, hip: 96, length: 98, tb: '155–165', bb: '45–55' },
    { size: 'M', waist: 76, hip: 102, length: 100, tb: '163–172', bb: '55–65' },
    { size: 'L', waist: 82, hip: 108, length: 102, tb: '170–178', bb: '65–75' },
    { size: 'XL', waist: 88, hip: 114, length: 104, tb: '176–185', bb: '75–88' },
  ],
  onesize: [{ size: 'All Size', note: 'Strap adjustable / ukuran universal' }],
};

const ALL = ['S', 'M', 'L', 'XL'];

export const products = [
  {
    name: 'Urban Oversized Heavy Tee', category: 't-shirt', gender: 'unisex',
    price: 189000, stock: 25, sizes: ALL, colors: ['Hitam'], material: 'Cotton combed 24s heavyweight 220 gsm',
    image: '/products/oversized-tee-black.svg', featured: true,
    description: 'Kaos oversized dengan bahan cotton combed heavyweight yang tebal tapi tetap adem. Potongan drop shoulder bikin siluet santai yang gampang dipadukan dengan celana apa pun, dari cargo sampai chino.\n\nCocok buat kuliah, nongkrong, atau sekadar keluar cari kopi.',
  },
  {
    name: 'Essential Boxy Tee', category: 't-shirt', gender: 'unisex',
    price: 149000, compareAt: 179000, stock: 40, sizes: ALL, colors: ['Putih'], material: 'Cotton combed 30s',
    image: '/products/boxy-tee-white.svg', featured: true,
    description: 'Kaos boxy fit warna putih bersih yang jadi fondasi lemari kamu. Bahan cotton combed 30s ringan dan lembut, nyaman dipakai seharian.\n\nTinggal layer dengan kemeja atau jaket, outfit langsung jadi.',
  },
  {
    name: 'Mono Graphic Tee', category: 't-shirt', gender: 'pria',
    price: 169000, stock: 0, sizes: ALL, colors: ['Abu Tua'], material: 'Cotton combed 24s',
    image: '/products/graphic-tee-grey.svg',
    description: 'Kaos dengan grafis tipografi minimalis di bagian dada. Warna abu tua yang kalem, gampang masuk ke outfit monokrom.',
  },
  {
    name: 'Linen Relaxed Shirt', category: 'kemeja', gender: 'pria',
    price: 259000, stock: 18, sizes: ALL, colors: ['Krem'], material: 'Linen blend',
    image: '/products/linen-shirt-cream.svg', featured: true,
    description: 'Kemeja relaxed fit berbahan linen blend yang breathable. Teksturnya natural dan makin enak dipakai seiring waktu.\n\nBisa dipakai rapi dengan kancing tertutup atau santai sebagai outer di atas kaos.',
  },
  {
    name: 'Cropped Poplin Shirt', category: 'kemeja', gender: 'wanita',
    price: 229000, stock: 15, sizes: ['S', 'M', 'L'], colors: ['Putih'], material: 'Cotton poplin',
    image: '/products/poplin-shirt-white.svg',
    description: 'Kemeja cropped berbahan cotton poplin yang crisp dan rapi. Panjangnya pas di pinggang, cocok dipadukan dengan celana high waist.',
  },
  {
    name: 'Boxy Zip Hoodie', category: 'hoodie', gender: 'unisex',
    price: 329000, stock: 12, sizes: ALL, colors: ['Hitam'], material: 'Cotton fleece 280 gsm',
    image: '/products/zip-hoodie-black.svg', featured: true,
    description: 'Hoodie zip dengan potongan boxy dan bahan cotton fleece 280 gsm yang hangat. Hoodnya double layer, jadi bentuknya tetap tegas.\n\nAndalan buat ruangan ber-AC, perjalanan malam, atau layering santai.',
  },
  {
    name: 'Soft Pullover Hoodie', category: 'hoodie', gender: 'wanita',
    price: 299000, compareAt: 349000, stock: 4, sizes: ['S', 'M', 'L'], colors: ['Abu Muda'], material: 'Cotton fleece 260 gsm',
    image: '/products/pullover-hoodie-grey.svg',
    description: 'Hoodie pullover dengan bahan fleece yang lembut di bagian dalam. Warna abu muda yang soft dan gampang dipadukan.',
  },
  {
    name: 'Minimalist Work Jacket', category: 'jacket', gender: 'pria',
    price: 364000, stock: 9, sizes: ALL, colors: ['Olive'], material: 'Cotton canvas',
    image: '/products/work-jacket-olive.svg', featured: true,
    description: 'Work jacket berbahan cotton canvas yang kokoh dengan detail kantong depan fungsional. Siluetnya clean, tanpa ornamen berlebihan.\n\nLayer di atas kaos atau hoodie untuk tampilan yang effortless.',
  },
  {
    name: 'Cropped Denim Jacket', category: 'jacket', gender: 'wanita',
    price: 389000, stock: 7, sizes: ['S', 'M', 'L'], colors: ['Biru Denim'], material: 'Denim 12 oz',
    image: '/products/denim-jacket-blue.svg',
    description: 'Jaket denim cropped dengan bahan 12 oz yang kokoh. Potongannya pendek sehingga proporsional dengan celana high waist atau rok.',
  },
  {
    name: 'Cargo Pants Olive', category: 'celana', gender: 'unisex',
    price: 249000, stock: 20, sizes: ALL, colors: ['Olive'], material: 'Cotton twill',
    image: '/products/cargo-pants-olive.svg', featured: true,
    description: 'Celana cargo berbahan cotton twill dengan kantong samping yang fungsional. Potongan straight dan pinggang karet dengan tali, jadi nyaman dipakai seharian.',
  },
  {
    name: 'Urban Relaxed Chino', category: 'celana', gender: 'pria',
    price: 259000, stock: 14, sizes: ALL, colors: ['Krem'], material: 'Cotton stretch twill',
    image: '/products/chino-cream.svg',
    description: 'Chino relaxed fit dengan sedikit stretch, jadi tetap leluasa saat bergerak. Warna krem netral yang cocok untuk tampilan kasual maupun semi formal.',
  },
  {
    name: 'Wide Leg Trousers', category: 'celana', gender: 'wanita',
    price: 279000, stock: 11, sizes: ['S', 'M', 'L'], colors: ['Hitam'], material: 'Polyester rayon',
    image: '/products/wide-trousers-black.svg',
    description: 'Celana wide leg high waist dengan jatuh bahan yang flowy. Bikin kaki terlihat lebih jenjang dan tetap nyaman.',
  },
  {
    name: 'Everyday Cap', category: 'topi', gender: 'unisex',
    price: 99000, stock: 30, sizes: ['All Size'], colors: ['Hitam'], material: 'Cotton twill',
    image: '/products/cap-black.svg',
    description: 'Topi baseball low profile dengan strap belakang yang bisa diatur. Finishing bordir kecil yang subtle.',
  },
  {
    name: 'Canvas Tote Bag', category: 'aksesoris', gender: 'unisex',
    price: 119000, stock: 22, sizes: ['All Size'], colors: ['Natural'], material: 'Canvas 16 oz',
    image: '/products/tote-natural.svg',
    description: 'Tote bag kanvas tebal yang muat laptop 14 inci. Ada kantong dalam untuk barang kecil.',
  },
];
