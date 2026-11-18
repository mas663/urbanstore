import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { loadUser } from './lib/auth.js';
import { errorMiddleware, notFound } from './lib/http.js';
import { catalogRoutes } from './routes/catalog.js';
import { cartRoutes } from './routes/cart.js';
import { orderRoutes } from './routes/orders.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';
import { aiRoutes } from './routes/ai.js';
import { AiError } from './ai/provider.js';
import { HttpError } from './lib/http.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(loadUser(db));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ ok: true }));
  api.use('/', catalogRoutes(db));
  api.use('/cart', cartRoutes(db));
  api.use('/', orderRoutes(db));
  api.use('/auth', authRoutes(db));
  api.use('/', aiRoutes(db)); // Sesi 5: /chat, /admin/describe, /admin/analyze
  api.use('/admin', adminRoutes(db));
  api.use((_req, _res, next) => next(notFound('Endpoint tidak ditemukan')));
  app.use('/api', api);

  // Production: sajikan hasil build frontend (npm run build)
  const dist = path.join(root, 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // AiError (mis. AI belum dikonfigurasi / timeout) → diteruskan sebagai HttpError dengan pesan ramah
  app.use((err, _req, _res, next) => next(err instanceof AiError ? new HttpError(err.status, err.message) : err));
  app.use(errorMiddleware);
  return app;
}
