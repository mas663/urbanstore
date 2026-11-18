import { Router } from 'express';
import { createSession, destroySession } from '../lib/auth.js';
import { HttpError, badRequest, rateLimit } from '../lib/http.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { isValidEmail, str } from '../lib/validate.js';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Terlalu banyak percobaan login. Coba lagi 15 menit lagi.',
});

export function authRoutes(db) {
  const r = Router();

  r.get('/me', (req, res) => res.json({ user: req.user }));

  r.post('/register', limiter, (req, res) => {
    const name = str(req.body.name, 80);
    const email = str(req.body.email, 150).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const fields = {};
    if (name.length < 2) fields.name = 'Isi nama kamu (min. 2 huruf).';
    if (!isValidEmail(email)) fields.email = 'Format email belum bener.';
    if (password.length < 8) fields.password = 'Password minimal 8 karakter.';
    else if (password.length > 128) fields.password = 'Password terlalu panjang.';
    if (Object.keys(fields).length) throw badRequest('Cek lagi datanya ya.', { fields });

    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
      throw badRequest('Email ini sudah terdaftar. Coba login aja.', { fields: { email: 'Email sudah terdaftar.' } });
    }
    const { lastInsertRowid } = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')")
      .run(name, email, hashPassword(password));
    createSession(db, res, Number(lastInsertRowid));
    res.status(201).json({ user: { id: Number(lastInsertRowid), name, email, role: 'customer' } });
  });

  // Login customer & admin memakai endpoint yang sama; `expectRole` memisahkan halaman login admin.
  r.post('/login', limiter, (req, res) => {
    const email = str(req.body.email, 150).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new HttpError(401, 'Email atau password salah.');
    }
    if (req.body.expectRole === 'admin' && user.role !== 'admin') {
      throw new HttpError(403, 'Akun ini bukan akun Store Admin.');
    }
    createSession(db, res, user.id);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  r.post('/logout', (req, res) => {
    destroySession(db, req, res);
    res.json({ ok: true });
  });

  return r;
}
