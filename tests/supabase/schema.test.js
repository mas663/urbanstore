import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createDb, createUser, as } from './harness.js';

let db, adminId, rianId, mayaId, admin, rian, maya, anon;

const checkout = (overrides = {}) => [
  overrides.name ?? 'Rian Pratama', overrides.phone ?? '+62 812-3456-7890', overrides.email ?? 'rian@test.id',
  'DKI Jakarta', 'Kota Jakarta Selatan', 'Kebayoran Baru',
  overrides.address ?? 'Jl. Kemang Raya No. 12, RT 01/RW 02', overrides.postal ?? '12730', 'Titip satpam',
  overrides.shipping ?? 'regular',
];
const PLACE = 'select public.place_order($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as r';

const variant = async (productName, color, size) =>
  (await db.query(
    `select v.id, v.stock from public.product_variants v join public.products p on p.id = v.product_id
     where p.name = $1 and v.color = $2 and v.size = $3`, [productName, color, size])).rows[0];

before(async () => {
  db = await createDb();
  adminId = await createUser(db, 'admin@urbanstore.id', { admin: true });
  rianId = await createUser(db, 'rian@test.id');
  mayaId = await createUser(db, 'maya@test.id');
  admin = as(db, adminId);
  rian = as(db, rianId);
  maya = as(db, mayaId);
  anon = as(db, null);
});

test('seed: 14 produk, varian warna × ukuran, stok terbagi', async () => {
  const { rows } = await anon('select count(*)::int as n from public.products');
  assert.equal(rows[0].n, 14);
  const tee = await db.query(`select sum(stock)::int as total, count(*)::int as n from public.product_variants v
    join public.products p on p.id = v.product_id where p.name = 'Urban Oversized Heavy Tee'`);
  assert.deepEqual(tee.rows[0], { total: 25, n: 8 }); // 2 warna × 4 ukuran
});

test('auth: profil otomatis dibuat sebagai customer, role tidak bisa dinaikkan sendiri', async () => {
  const { rows } = await rian('select role from public.profiles where id = auth.uid()');
  assert.equal(rows[0].role, 'customer');
  await assert.rejects(rian(`update public.profiles set role = 'admin' where id = auth.uid()`), /Role tidak bisa diubah/);
  await rian(`update public.profiles set full_name = 'Rian P' where id = auth.uid()`); // ubah nama boleh
  // Customer tidak bisa melihat profil orang lain
  assert.equal((await rian('select count(*)::int as n from public.profiles')).rows[0].n, 1);
  assert.equal((await admin('select count(*)::int as n from public.profiles')).rows[0].n, 3);
});

test('RLS: anon tidak bisa mengubah produk, customer tidak bisa membuat pesanan langsung', async () => {
  await assert.rejects(anon(`update public.products set price = 1`), /permission denied/);
  const upd = await rian(`update public.products set price = 1 returning id`);
  assert.equal(upd.rows.length, 0); // RLS: tidak ada baris yang boleh diubah
  await assert.rejects(rian(`insert into public.orders (code) values ('X')`), /permission denied/);
});

test('keranjang: validasi stok per varian & varian habis', async () => {
  const v = await variant('Urban Oversized Heavy Tee', 'Hitam', 'M');
  await rian('select public.add_to_cart($1, 2)', [v.id]);
  await rian('select public.add_to_cart($1, 1)', [v.id]);
  assert.equal((await rian('select qty from public.cart_items')).rows[0].qty, 3);
  await assert.rejects(rian('select public.add_to_cart($1, 99)', [v.id]), /Stok varian ini cuma tersisa/);
  const habis = await variant('Mono Graphic Tee', 'Abu Tua', 'M');
  await assert.rejects(rian('select public.add_to_cart($1, 1)', [habis.id]), /habis/);
  // Maya tidak melihat keranjang Rian
  assert.equal((await maya('select count(*)::int as n from public.cart_items')).rows[0].n, 0);
  await assert.rejects(anon('select public.add_to_cart($1, 1)', [v.id]), /permission denied/);
});

let order;
test('checkout: validasi, nomor order unik, snapshot harga, stok berkurang, keranjang kosong, deadline 1 jam', async () => {
  await assert.rejects(rian(PLACE, checkout({ phone: '123' })), /Nomor WhatsApp belum valid/);
  await assert.rejects(rian(PLACE, checkout({ postal: '12' })), /Kode pos/);
  await assert.rejects(admin(PLACE, checkout()), /Akun admin tidak bisa checkout/);

  const before = await variant('Urban Oversized Heavy Tee', 'Hitam', 'M');
  const { rows } = await rian(PLACE, checkout({ shipping: 'express' }));
  order = rows[0].r;
  assert.match(order.code, /^URB-\d{4}-001$/);

  const o = (await rian('select * from public.orders where code = $1', [order.code])).rows[0];
  assert.equal(o.subtotal, 189000 * 3);
  assert.equal(o.total, 189000 * 3 + 30000);
  assert.equal(o.phone, '081234567890');
  assert.equal(o.status, 'menunggu_pembayaran');
  const minutes = (new Date(o.payment_deadline) - new Date(o.created_at)) / 60000;
  assert.ok(Math.abs(minutes - 60) < 1);

  assert.equal((await variant('Urban Oversized Heavy Tee', 'Hitam', 'M')).stock, before.stock - 3);
  assert.equal((await rian('select count(*)::int as n from public.cart_items')).rows[0].n, 0);
  const items = (await rian('select color, size, price, qty from public.order_items')).rows;
  assert.deepEqual(items, [{ color: 'Hitam', size: 'M', price: 189000, qty: 3 }]);

  // Snapshot: admin ubah harga, invoice tetap
  await db.query(`update public.products set price = 999000 where name = 'Urban Oversized Heavy Tee'`);
  assert.equal((await rian('select price from public.order_items')).rows[0].price, 189000);
  await db.query(`update public.products set price = 189000 where name = 'Urban Oversized Heavy Tee'`);

  // Customer lain tidak bisa melihat pesanan ini
  assert.equal((await maya('select count(*)::int as n from public.orders')).rows[0].n, 0);
  await assert.rejects(rian(PLACE, checkout()), /Keranjang kamu masih kosong/);
});

test('bukti transfer: hanya folder milik sendiri, lalu status menunggu verifikasi', async () => {
  // Storage policy
  await rian(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [`${rianId}/${order.code}.jpg`]);
  await assert.rejects(
    rian(`insert into storage.objects (bucket_id, name) values ('payment-proofs', $1)`, [`${mayaId}/curang.jpg`]),
    /row-level security/,
  );
  assert.equal((await maya(`select count(*)::int as n from storage.objects`)).rows[0].n, 0);
  assert.equal((await admin(`select count(*)::int as n from storage.objects`)).rows[0].n, 1);

  await assert.rejects(rian('select public.submit_payment_proof($1, $2)', [order.code, `${mayaId}/x.jpg`]), /tidak valid/);
  await assert.rejects(maya('select public.submit_payment_proof($1, $2)', [order.code, `${mayaId}/x.jpg`]), /tidak ditemukan/);
  await rian('select public.submit_payment_proof($1, $2)', [order.code, `${rianId}/${order.code}.jpg`]);
  const o = (await rian('select o.status, p.status as pay, p.proof_path from public.orders o join public.payments p on p.order_id = o.id')).rows[0];
  assert.deepEqual(o, { status: 'menunggu_verifikasi', pay: 'awaiting_verification', proof_path: `${rianId}/${order.code}.jpg` });
});

test('admin: hanya admin yang bisa konfirmasi; transisi status divalidasi', async () => {
  await assert.rejects(rian('select public.admin_update_order_status($1, $2)', [order.id, 'lunas']), /Akses ditolak/);
  await assert.rejects(admin('select public.admin_update_order_status($1, $2)', [order.id, 'selesai']), /tidak bisa diubah/);
  await admin('select public.admin_update_order_status($1, $2)', [order.id, 'lunas']);
  const pay = (await rian('select status, verified_by from public.payments')).rows[0];
  assert.equal(pay.status, 'paid');
  assert.equal(pay.verified_by, adminId);
  await admin('select public.admin_update_order_status($1, $2)', [order.id, 'dikirim']);
  const history = (await rian('select status from public.order_status_history order by id')).rows.map((r) => r.status);
  assert.deepEqual(history, ['menunggu_pembayaran', 'menunggu_verifikasi', 'lunas', 'dikirim']);
});

test('tolak bukti → kembali menunggu pembayaran dengan deadline baru; batal → stok kembali', async () => {
  const v = await variant('Cargo Pants Olive', 'Hitam', 'L');
  await maya('select public.add_to_cart($1, 2)', [v.id]);
  const { r } = (await maya(PLACE, checkout({ email: 'maya@test.id' }))).rows[0];
  assert.match(r.code, /-002$/);
  await maya('select public.submit_payment_proof($1, $2)', [r.code, `${mayaId}/bukti.jpg`]);
  await admin('select public.admin_update_order_status($1, $2)', [r.id, 'menunggu_pembayaran']);
  assert.equal((await maya('select status from public.orders')).rows[0].status, 'menunggu_pembayaran');
  await admin('select public.admin_update_order_status($1, $2)', [r.id, 'dibatalkan']);
  assert.equal((await variant('Cargo Pants Olive', 'Hitam', 'L')).stock, v.stock);
});

test('batas waktu 1 jam: pesanan kedaluwarsa otomatis & stok dikembalikan', async () => {
  const v = await variant('Everyday Cap', 'Krem', 'All Size');
  await rian('select public.add_to_cart($1, 1)', [v.id]);
  const { r } = (await rian(PLACE, checkout())).rows[0];
  assert.equal((await variant('Everyday Cap', 'Krem', 'All Size')).stock, v.stock - 1);
  await db.query(`update public.orders set payment_deadline = now() - interval '1 minute' where id = $1`, [r.id]);
  const n = (await rian('select public.expire_overdue_orders() as n')).rows[0].n;
  assert.equal(n, 1);
  assert.equal((await rian('select status from public.orders where id = $1', [r.id])).rows[0].status, 'kedaluwarsa');
  assert.equal((await variant('Everyday Cap', 'Krem', 'All Size')).stock, v.stock);
  await assert.rejects(rian('select public.submit_payment_proof($1, $2)', [r.code, `${rianId}/telat.jpg`]), /Batas waktu/);
});

test('admin_save_product: validasi, varian, slug unik, hanya admin', async () => {
  const cat = (await db.query(`select id from public.categories where slug = 'kemeja'`)).rows[0].id;
  const product = { name: 'Relaxed Knit Polo', category_id: cat, gender: 'pria', price: 219000, material: 'Cotton knit' };
  const variants = [{ color: 'Navy', size: 'M', stock: 5 }, { color: 'Navy', size: 'L', stock: 7 }];
  await assert.rejects(rian('select public.admin_save_product(null, $1, $2)', [product, variants]), /Akses ditolak/);
  await assert.rejects(admin('select public.admin_save_product(null, $1, $2)', [{ ...product, price: 0 }, variants]), /Harga wajib/);
  await assert.rejects(admin('select public.admin_save_product(null, $1, $2)', [product, []]), /minimal 1 varian/);
  await assert.rejects(admin('select public.admin_save_product(null, $1, $2)',
    [product, [{ color: 'Navy', size: 'All Size', stock: 1 }]]), /tidak cocok/);

  const id = (await admin('select public.admin_save_product(null, $1, $2) as id', [product, variants])).rows[0].id;
  const id2 = (await admin('select public.admin_save_product(null, $1, $2) as id', [product, variants])).rows[0].id;
  const slugs = (await anon('select slug from public.products where id in ($1, $2) order by id', [id, id2])).rows.map((r) => r.slug);
  assert.deepEqual(slugs, ['relaxed-knit-polo', 'relaxed-knit-polo-2']);

  // Edit: ubah stok M, hapus L, tambah XL
  await admin('select public.admin_save_product($1, $2, $3)', [id, product,
    [{ color: 'Navy', size: 'M', stock: 9 }, { color: 'Navy', size: 'XL', stock: 2 }]]);
  const vs = (await anon('select size, stock from public.product_variants where product_id = $1 order by size', [id])).rows;
  assert.deepEqual(vs, [{ size: 'M', stock: 9 }, { size: 'XL', stock: 2 }]);

  // Produk nonaktif tidak terlihat publik
  await admin('select public.admin_save_product($1, $2, $3)', [id2, { ...product, is_active: false }, variants]);
  assert.equal((await anon('select count(*)::int as n from public.products where id = $1', [id2])).rows[0].n, 0);
  assert.equal((await admin('select count(*)::int as n from public.products where id = $1', [id2])).rows[0].n, 1);
});

test('metrik penjualan: hanya admin, angka sesuai transaksi', async () => {
  await assert.rejects(rian('select public.get_sales_metrics()'), /Akses ditolak/);
  const m = (await admin('select public.get_sales_metrics() as m')).rows[0].m;
  assert.equal(m.orders.confirmed, 1);
  assert.equal(m.orders.cancelled, 2); // 1 dibatalkan + 1 kedaluwarsa
  assert.equal(m.revenue.confirmed, 189000 * 3 + 30000);
  assert.equal(m.revenue.avgOrderValue, 189000 * 3 + 30000);
  assert.equal(m.topProducts[0].name, 'Urban Oversized Heavy Tee');
  assert.ok(m.noSales.length > 0);
});

test('chat_quota tidak bisa diakses dari browser (hanya server dengan secret key)', async () => {
  await assert.rejects(rian('select * from public.chat_quota'), /permission denied/);
  await assert.rejects(rian(`insert into public.chat_quota values (auth.uid(), now(), 0)`), /permission denied/);
});

test('kuota chat: hanya service_role; maks 5 per jendela; refund; reset setelah jendela lewat', async () => {
  await assert.rejects(rian('select public.consume_chat_quota(auth.uid(), 5, 43200)'), /permission denied/);
  await assert.rejects(rian('select public.refund_chat_quota(auth.uid())'), /permission denied/);

  const svc = async (sql, params) => {
    await db.exec('set role service_role');
    try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
  };
  const consume = async () => (await svc('select public.consume_chat_quota($1, 5, 43200) as q', [rianId])).rows[0].q;
  for (let i = 1; i <= 5; i++) assert.equal((await consume()).remaining, 5 - i);
  const blocked = await consume();
  assert.equal(blocked.ok, false);
  assert.ok(blocked.resetAt);

  await svc('select public.refund_chat_quota($1)', [rianId]);
  assert.equal((await svc('select public.get_chat_quota($1, 5, 43200) as q', [rianId])).rows[0].q.remaining, 1);

  await db.query(`update public.chat_quota set window_start = now() - interval '13 hours' where user_id = $1`, [rianId]);
  assert.equal((await svc('select public.get_chat_quota($1, 5, 43200) as q', [rianId])).rows[0].q.remaining, 5);
  assert.equal((await consume()).remaining, 4);
});
