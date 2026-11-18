import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { hashPassword } from './lib/password.js';
import * as seed from './seed-data.js';

/**
 * Database Thinking (Sesi 4) — 6 entitas utama UrbanStore:
 *   E1 products · E2 categories · E3 cart_items · E4 orders · E5 order_items · E6 payments
 * Ditambah tabel pendukung autentikasi & kuota AI: users, sessions, chat_quota.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  size_type TEXT NOT NULL DEFAULT 'top' CHECK (size_type IN ('top','bottom','onesize'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  gender TEXT NOT NULL CHECK (gender IN ('pria','wanita','unisex')),
  price INTEGER NOT NULL CHECK (price > 0),
  compare_at_price INTEGER,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sizes TEXT NOT NULL,           -- JSON array, mis. ["S","M","L","XL"]
  colors TEXT NOT NULL DEFAULT '[]',
  material TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, gender, category_id);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id TEXT NOT NULL,          -- session keranjang (cookie anonim, tanpa wajib login)
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty >= 1),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cart_id, product_id, size)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,      -- URB-2026-001
  access_token TEXT NOT NULL,     -- token rahasia untuk membuka invoice
  user_id INTEGER REFERENCES users(id),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  shipping_method TEXT NOT NULL,
  shipping_cost INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'menunggu_pembayaran'
    CHECK (status IN ('menunggu_pembayaran','menunggu_verifikasi','lunas','dikirim','selesai','dibatalkan')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name TEXT NOT NULL,     -- snapshot saat dibeli
  image_url TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL,
  price_at_purchase INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty >= 1)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','awaiting_verification','paid','cancelled')),
  amount INTEGER NOT NULL,
  claimed_at TEXT,
  verified_at TEXT
);

CREATE TABLE IF NOT EXISTS size_charts (
  size_type TEXT NOT NULL,
  size TEXT NOT NULL,
  data TEXT NOT NULL,             -- JSON ukuran (cm) + estimasi TB/BB
  sort INTEGER NOT NULL,
  PRIMARY KEY (size_type, size)
);

CREATE TABLE IF NOT EXISTS chat_quota (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  window_start INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
`;

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 80) || 'produk';
}

export function openDatabase(file = config.databasePath) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');
  db.exec(SCHEMA);
  seedIfEmpty(db);
  return db;
}

/** Jalankan fn di dalam transaksi; rollback otomatis jika error. */
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function seedIfEmpty(db) {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM categories').get();
  if (n > 0) return;

  tx(db, () => {
    const insCat = db.prepare('INSERT INTO categories (name, slug, size_type) VALUES (?, ?, ?)');
    for (const c of seed.categories) insCat.run(c.name, c.slug, c.sizeType);

    const insChart = db.prepare('INSERT INTO size_charts (size_type, size, data, sort) VALUES (?, ?, ?, ?)');
    for (const [type, rows] of Object.entries(seed.sizeCharts)) {
      rows.forEach((row, i) => {
        const { size, ...data } = row;
        insChart.run(type, size, JSON.stringify(data), i);
      });
    }

    const catId = Object.fromEntries(
      db.prepare('SELECT id, slug FROM categories').all().map((r) => [r.slug, r.id]),
    );
    const insProd = db.prepare(`
      INSERT INTO products (name, slug, category_id, gender, price, compare_at_price, stock, sizes, colors,
                            material, description, image_url, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of seed.products) {
      insProd.run(
        p.name, slugify(p.name), catId[p.category], p.gender, p.price, p.compareAt ?? null, p.stock,
        JSON.stringify(p.sizes), JSON.stringify(p.colors), p.material, p.description, p.image, p.featured ? 1 : 0,
      );
    }
  });
}

/** Pastikan akun admin awal ada (dari ADMIN_EMAIL / ADMIN_PASSWORD di .env). */
export function ensureAdmin(db) {
  const exists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (exists) return { created: false };
  if (!config.admin.password || config.admin.password.length < 8) {
    return { created: false, reason: 'ADMIN_PASSWORD belum diisi (min. 8 karakter) di .env' };
  }
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
    .run('Store Admin', config.admin.email, hashPassword(config.admin.password));
  return { created: true };
}
