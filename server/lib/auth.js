import { asyncHandler, HttpError } from './http.js';

/**
 * Middleware Express: wajib login (token Supabase di header Authorization).
 * `role` opsional ('customer' | 'admin'); kalau role tidak cocok → 403 dengan pesan `forbidden`.
 * Hasil verifikasi disimpan di req.user supaya handler berikutnya bisa memakainya.
 */
export function requireUser(data, role, forbidden = 'Akses ditolak untuk akun ini.') {
  return asyncHandler(async (req, _res, next) => {
    req.user = await data.authenticate(req);
    if (role && req.user.role !== role) throw new HttpError(403, forbidden);
    next();
  });
}
