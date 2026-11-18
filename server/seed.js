// Reset database ke data contoh: `npm run seed`
import fs from 'node:fs';
import { config } from './config.js';
import { ensureAdmin, openDatabase } from './db.js';

for (const suffix of ['', '-wal', '-shm']) fs.rmSync(config.databasePath + suffix, { force: true });
const db = openDatabase();
const admin = ensureAdmin(db);
const { n } = db.prepare('SELECT COUNT(*) AS n FROM products').get();
console.log(`✓ Database dibuat ulang di ${config.databasePath} (${n} produk contoh)`);
console.log(admin.created ? `✓ Admin: ${config.admin.email}` : `! Admin belum dibuat — ${admin.reason}`);
