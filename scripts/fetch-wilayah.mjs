// Unduh data wilayah Indonesia (provinsi → kota/kabupaten → kecamatan) menjadi file statis di public/wilayah.
// Sumber: https://github.com/emsifa/api-wilayah-indonesia (MIT, data Kemendagri).
// File statis = cepat & tidak bergantung API pihak ketiga saat aplikasi berjalan di Vercel.
// Jalankan sekali: npm run wilayah
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/wilayah');

const titleCase = (s) =>
  s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bDki\b/, 'DKI').replace(/\bDi\b/, 'DI');

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      if (i >= tries) throw err;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

async function pool(items, size, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

const slim = (rows) => rows.map((r) => ({ id: r.id, name: titleCase(r.name) }));
const write = (rel, data) => {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
};

const provinces = await get(`${BASE}/provinces.json`);
write('provinces.json', slim(provinces));

const regencies = [];
await pool(provinces, 8, async (p) => {
  const rows = await get(`${BASE}/regencies/${p.id}.json`);
  write(`regencies/${p.id}.json`, slim(rows));
  regencies.push(...rows);
});

let districtCount = 0;
await pool(regencies, 12, async (r) => {
  const rows = await get(`${BASE}/districts/${r.id}.json`);
  write(`districts/${r.id}.json`, slim(rows));
  districtCount += rows.length;
});

console.log(`✓ ${provinces.length} provinsi, ${regencies.length} kota/kabupaten, ${districtCount} kecamatan → public/wilayah`);
