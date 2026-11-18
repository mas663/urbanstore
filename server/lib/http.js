export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const badRequest = (message, extra) => new HttpError(400, message, extra);
export const notFound = (message = 'Data tidak ditemukan') => new HttpError(404, message);

/** Bungkus handler async agar error diteruskan ke error middleware (Express 4). */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function errorMiddleware(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Format data tidak valid' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Data yang dikirim terlalu besar' });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Ada masalah di server. Coba lagi sebentar ya.' });
}

/** Rate limiter sederhana di memori (cukup untuk 1 instance server). */
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
