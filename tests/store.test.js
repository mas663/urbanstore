import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, client, validCheckout } from './helpers.js';

let srv;
before(async () => (srv = await startServer()));
after(() => srv.close());

const findProduct = async (req, name) => {
  const { data } = await req('GET', `/api/products?q=${encodeURIComponent(name)}`);
  return data.products.find((p) => p.name === name);
};

test('katalog: filter gender menampilkan produk gender itu + unisex', async () => {
  const req = client(srv.base);
  const { status, data } = await req('GET', '/api/products?gender=wanita');
  assert.equal(status, 200);
  assert.ok(data.products.length > 0);
  assert.ok(data.products.every((p) => ['wanita', 'unisex'].includes(p.gender)));
});

test('katalog: sorting harga termurah', async () => {
  const req = client(srv.base);
  const { data } = await req('GET', '/api/products?sort=price_asc');
  const prices = data.products.map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});

test('detail: menyertakan size chart', async () => {
  const req = client(srv.base);
  const { data } = await req('GET', '/api/products/urban-oversized-heavy-tee');
  assert.equal(data.product.name, 'Urban Oversized Heavy Tee');
  assert.equal(data.sizeChart.length, 4);
});

test('cart: tanpa ukuran ditolak, produk habis ditolak', async () => {
  const req = client(srv.base);
  const tee = await findProduct(req, 'Urban Oversized Heavy Tee');
  const noSize = await req('POST', '/api/cart/items', { productId: tee.id });
  assert.equal(noSize.status, 400);
  assert.match(noSize.data.error, /Pilih ukuran/);

  const habis = await findProduct(req, 'Mono Graphic Tee');
  assert.equal(habis.inStock, false);
  const r = await req('POST', '/api/cart/items', { productId: habis.id, size: 'M' });
  assert.equal(r.status, 409);
});

test('cart: ukuran berbeda = baris berbeda, subtotal realtime, qty tidak boleh melebihi stok', async () => {
  const req = client(srv.base);
  const hoodie = await findProduct(req, 'Soft Pullover Hoodie'); // stok 4
  await req('POST', '/api/cart/items', { productId: hoodie.id, size: 'S' });
  const { data } = await req('POST', '/api/cart/items', { productId: hoodie.id, size: 'M', qty: 2 });
  assert.equal(data.items.length, 2);
  assert.equal(data.subtotal, hoodie.price * 3);

  const over = await req('POST', '/api/cart/items', { productId: hoodie.id, size: 'L', qty: 2 });
  assert.equal(over.status, 409);

  const upd = await req('PATCH', `/api/cart/items/${data.items[0].id}`, { qty: 2 });
  assert.equal(upd.data.subtotal, hoodie.price * 4);
  const del = await req('DELETE', `/api/cart/items/${data.items[0].id}`);
  assert.equal(del.data.items.length, 1);
});

test('alur bisnis 7 tahap: admin input → checkout → invoice → transfer → konfirmasi lunas', async () => {
  const admin = client(srv.base);
  const login = await admin('POST', '/api/auth/login', { email: 'admin@test.id', password: 'admin-password-123', expectRole: 'admin' });
  assert.equal(login.status, 200);

  // 01 Admin input produk baru
  const cats = (await admin('GET', '/api/categories')).data.categories;
  const created = await admin('POST', '/api/admin/products', {
    name: 'Test Linen Tee', categoryId: cats.find((c) => c.slug === 't-shirt').id, gender: 'unisex',
    price: 150000, stock: 5, sizes: ['M', 'L'], colors: 'Putih', material: 'Linen',
  });
  assert.equal(created.status, 201);

  // 02 Customer melihat produk baru di katalog
  const cust = client(srv.base);
  const p = await findProduct(cust, 'Test Linen Tee');
  assert.ok(p);

  // 03 Pilih ukuran & masukkan ke cart
  await cust('POST', '/api/cart/items', { productId: p.id, size: 'L', qty: 2 });

  // 04 Checkout — validasi form dulu
  const bad = await cust('POST', '/api/orders', { ...validCheckout, phone: '123' });
  assert.equal(bad.status, 400);
  assert.ok(bad.data.fields.phone);

  const ok = await cust('POST', '/api/orders', validCheckout);
  assert.equal(ok.status, 201);
  assert.match(ok.data.code, /^URB-\d{4}-\d{3}$/);

  // Keranjang dikosongkan & stok berkurang
  assert.equal((await cust('GET', '/api/cart')).data.items.length, 0);
  assert.equal((await findProduct(cust, 'Test Linen Tee')).stock, 3);

  // 05 Invoice hanya bisa dibuka dengan token
  const stranger = client(srv.base);
  assert.equal((await stranger('GET', `/api/orders/${ok.data.code}`)).status, 404);
  const inv = await cust('GET', `/api/orders/${ok.data.code}?t=${ok.data.token}`);
  assert.equal(inv.data.order.status, 'menunggu_pembayaran');
  assert.equal(inv.data.order.total, 150000 * 2 + 15000);

  // Snapshot harga: admin ubah harga, invoice tetap
  await admin('PUT', `/api/admin/products/${p.id}`, { ...created.data.product, categoryId: created.data.product.category.id, price: 999000 });
  const inv2 = await cust('GET', `/api/orders/${ok.data.code}?t=${ok.data.token}`);
  assert.equal(inv2.data.order.items[0].price, 150000);

  // 06 Customer klik "Saya Sudah Transfer"
  const claim = await cust('POST', `/api/orders/${ok.data.code}/confirm-transfer`, { t: ok.data.token });
  assert.equal(claim.data.order.status, 'menunggu_verifikasi');

  // 07 Admin konfirmasi lunas → terlihat di invoice customer
  const orders = (await admin('GET', '/api/admin/orders')).data.orders;
  const o = orders.find((x) => x.code === ok.data.code);
  const paid = await admin('PATCH', `/api/admin/orders/${o.id}/status`, { status: 'lunas' });
  assert.equal(paid.data.order.status, 'lunas');
  assert.equal(paid.data.order.payment.status, 'paid');
  assert.equal((await cust('GET', `/api/orders/${ok.data.code}?t=${ok.data.token}`)).data.order.status, 'lunas');

  // Lookup pesanan via nomor order + WhatsApp
  const look = await stranger('POST', '/api/orders/lookup', { code: ok.data.code, phone: '+62 812 3456 7890' });
  assert.equal(look.data.token, ok.data.token);
});

test('batalkan pesanan mengembalikan stok', async () => {
  const admin = client(srv.base);
  await admin('POST', '/api/auth/login', { email: 'admin@test.id', password: 'admin-password-123' });
  const cust = client(srv.base);
  const cap = await findProduct(cust, 'Everyday Cap');
  await cust('POST', '/api/cart/items', { productId: cap.id, size: 'All Size', qty: 3 });
  const { data } = await cust('POST', '/api/orders', validCheckout);
  assert.equal((await findProduct(cust, 'Everyday Cap')).stock, cap.stock - 3);
  const o = (await admin('GET', `/api/admin/orders?q=${data.code}`)).data.orders[0];
  await admin('PATCH', `/api/admin/orders/${o.id}/status`, { status: 'dibatalkan' });
  assert.equal((await findProduct(cust, 'Everyday Cap')).stock, cap.stock);
  const again = await admin('PATCH', `/api/admin/orders/${o.id}/status`, { status: 'lunas' });
  assert.equal(again.status, 409);
});

test('hak akses: customer tidak bisa membuka API admin', async () => {
  const cust = client(srv.base);
  assert.equal((await cust('GET', '/api/admin/stats')).status, 401);
  await cust('POST', '/api/auth/register', { name: 'Maya', email: 'maya@test.id', password: 'password123' });
  assert.equal((await cust('GET', '/api/admin/stats')).status, 403);
  const adminLogin = await client(srv.base)('POST', '/api/auth/login', { email: 'maya@test.id', password: 'password123', expectRole: 'admin' });
  assert.equal(adminLogin.status, 403);
});

test('validasi produk admin: harga, stok, ukuran wajib', async () => {
  const admin = client(srv.base);
  await admin('POST', '/api/auth/login', { email: 'admin@test.id', password: 'admin-password-123' });
  const r = await admin('POST', '/api/admin/products', { name: 'X', price: 0, stock: 0, sizes: [] });
  assert.equal(r.status, 400);
  for (const f of ['name', 'categoryId', 'gender', 'price', 'stock', 'sizes']) assert.ok(r.data.fields[f], f);
});
