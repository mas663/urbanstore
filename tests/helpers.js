// Helper tes: jalankan app dengan database in-memory + klien HTTP yang menyimpan cookie.
process.env.ADMIN_EMAIL = 'admin@test.id';
process.env.ADMIN_PASSWORD = 'admin-password-123';

const { openDatabase, ensureAdmin } = await import('../server/db.js');
const { createApp } = await import('../server/app.js');

export async function startServer() {
  const db = openDatabase(':memory:');
  ensureAdmin(db);
  const server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { db, base, close: () => new Promise((r) => server.close(r)) };
}

export function client(base) {
  const jar = new Map();
  return async function request(method, url, body) {
    const res = await fetch(base + url, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const [k, ...v] = pair.split('=');
      jar.set(k, v.join('='));
    }
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data, headers: res.headers };
  };
}

export const validCheckout = {
  name: 'Budi Santoso',
  phone: '0812-3456-7890',
  email: 'budi.santoso@email.com',
  address: 'Jl. Kemang Raya No. 12, RT 01/RW 02',
  city: 'Jakarta Selatan',
  postalCode: '12730',
  shippingMethod: 'regular',
};
