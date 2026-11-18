import { config } from '../config.js';
import { HttpError } from './http.js';
import { randomToken, sha256 } from './password.js';

const SESSION_COOKIE = 'us_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  path: '/',
  maxAge,
});

export function createSession(db, res, userId) {
  const token = randomToken();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), userId, Date.now() + SESSION_TTL_MS);
  res.cookie(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_MS));
}

export function destroySession(db, req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Middleware: isi req.user jika cookie sesi valid. */
export const loadUser = (db) => (req, _res, next) => {
  req.user = null;
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    const row = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, s.expires_at
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`).get(sha256(token));
    if (row && row.expires_at > Date.now()) {
      req.user = { id: row.id, name: row.name, email: row.email, role: row.role };
    }
  }
  next();
};

export const requireRole = (role) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Kamu perlu login dulu.'));
  if (role && req.user.role !== role) return next(new HttpError(403, 'Akses ditolak untuk akun ini.'));
  next();
};

/** Cookie keranjang anonim — customer bisa belanja tanpa wajib registrasi. */
export function getCartId(req, res, { create = false } = {}) {
  let id = req.cookies?.us_cart;
  if (id && /^[\w-]{20,64}$/.test(id)) return id;
  if (!create) return null;
  id = randomToken(24);
  res.cookie('us_cart', id, cookieOptions(60 * 24 * 60 * 60 * 1000));
  return id;
}
