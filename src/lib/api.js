export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
    this.fields = data.fields || {};
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Koneksi terputus. Cek internet kamu lalu coba lagi.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Terjadi kesalahan. Coba lagi ya.', data);
  return data;
}

/**
 * Streaming response (NDJSON) untuk fitur AI.
 * Server mengirim baris: {"type":"delta","text":"..."} · {"type":"done",...} · {"type":"error","error":"..."}
 */
export async function streamApi(path, body, { onDelta, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Koneksi terputus. Cek internet kamu lalu coba lagi.');
  }
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
