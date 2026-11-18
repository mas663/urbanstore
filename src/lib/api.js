import { supabase } from './supabase.js';

// Klien untuk endpoint AI di server (/api/*). Token login Supabase dikirim sebagai Bearer
// supaya server bisa memverifikasi user & role tanpa menyimpan sesi sendiri.

export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function authHeaders(extra = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function send(path, { method = 'GET', body, signal } = {}) {
  try {
    return await fetch(`/api${path}`, {
      method,
      headers: await authHeaders(body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Koneksi terputus. Cek internet kamu lalu coba lagi.');
  }
}

export async function api(path, opts = {}) {
  const res = await send(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Terjadi kesalahan. Coba lagi ya.', data);
  return data;
}

/**
 * Streaming response (NDJSON) untuk fitur AI.
 * Server mengirim baris: {"type":"delta","text":"..."} · {"type":"done",...} · {"type":"error","error":"..."}
 */
export async function streamApi(path, body, { onDelta, signal } = {}) {
  const res = await send(path, { method: 'POST', body, signal });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error || 'Terjadi kesalahan. Coba lagi ya.', data);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = null;
  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const evt = JSON.parse(line);
      if (evt.type === 'delta') onDelta?.(evt.text);
      else if (evt.type === 'error') throw new ApiError(evt.status || 502, evt.error, evt);
      else if (evt.type === 'done') done = evt;
    }
  }
  if (!done) throw new ApiError(502, 'Respons AI terputus di tengah jalan. Coba lagi ya.');
  return done;
}
