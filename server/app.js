import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { errorMiddleware, HttpError, notFound } from './lib/http.js';
import { aiRoutes } from './routes/ai.js';
import { AiError } from './ai/provider.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Server kecil khusus fitur AI (Sesi 5). Di Vercel berjalan sebagai Function di /api.
 * Katalog, keranjang, pesanan & auth ditangani frontend langsung ke Supabase (RLS).
 */
export function createApp(data, { serveStatic = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    next();
  });
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ ok: true }));
  api.use('/', aiRoutes(data));
  api.use((_req, _res, next) => next(notFound('Endpoint tidak ditemukan')));
  app.use('/api', api);

  // Mode lokal "npm start": sajikan hasil build frontend
  const dist = path.join(root, 'dist');
  if (serveStatic && fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  // AiError (mis. AI belum dikonfigurasi / timeout) → HttpError dengan pesan ramah
  app.use((err, _req, _res, next) => next(err instanceof AiError ? new HttpError(err.status, err.message) : err));
  app.use(errorMiddleware);
  return app;
}
