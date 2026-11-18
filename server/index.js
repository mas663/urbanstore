import { config } from './config.js';
import { ensureAdmin, openDatabase } from './db.js';
import { createApp } from './app.js';

const db = openDatabase();
const admin = ensureAdmin(db);
if (admin.created) console.log(`✓ Akun Store Admin dibuat: ${config.admin.email}`);
if (admin.reason) console.warn(`! Akun admin belum dibuat — ${admin.reason}`);

createApp(db).listen(config.port, () => {
  console.log(`✓ UrbanStore API jalan di http://localhost:${config.port}`);
});
