import { config } from '../config.js';

/**
 * Lapisan provider AI (Sesi 5).
 * - gemini            → Gemini API (Google AI Studio)
 * - openai_compatible → AI router seperti 9Router (satu endpoint, banyak model)
 * AI_PROVIDER = provider utama. AI_FALLBACK_PROVIDER (opsional) = provider cadangan yang otomatis dipakai
 * saat provider utama gagal / kena limit (contoh: utama Gemini langsung, cadangan 9Router).
 * Scope menentukan API key yang dipakai:
 *   customer → GEMINI_API_KEY_CUSTOMER (key "urbanstore-customer") untuk AI Shopping Assistant
 *   admin    → GEMINI_API_KEY_ADMIN    (key "urbanstore-admin")    untuk deskripsi & analisis
 * Kode fitur tidak perlu berubah saat ganti provider.
 * API key HANYA dipakai di server — tidak pernah dikirim ke browser.
 */

const SCOPES = ['customer', 'admin'];
const KEY_ENV = { customer: 'GEMINI_API_KEY_CUSTOMER', admin: 'GEMINI_API_KEY_ADMIN' };

const keyFor = (scope, provider) =>
  provider === 'openai_compatible' ? config.ai.apiKeys[scope] : config.ai.geminiKeys[scope];

const primaryProvider = () => (config.ai.provider === 'openai_compatible' ? 'openai_compatible' : 'gemini');
const isConfigured = (t, scope) =>
  Boolean(t.model) && (t.provider === 'openai_compatible' ? Boolean(config.ai.baseUrl) : Boolean(keyFor(scope, 'gemini')));

/** Daftar (provider, model) yang akan dicoba berurutan; yang belum dikonfigurasi dibuang. */
function buildTargets(scope) {
  const ai = config.ai;
  const primary = primaryProvider();
  const modelsOf = (p) => (p === 'openai_compatible' ? [ai.model, ai.routerFallbackModel] : [ai.geminiModel, ai.fallbackModel]);
  const targets = modelsOf(primary).filter(Boolean).map((model) => ({ provider: primary, model }));
  const fb = ai.fallbackProvider;
  if (fb && fb !== primary) targets.push(...modelsOf(fb).filter(Boolean).map((model) => ({ provider: fb, model })));
  return targets
    .filter((t, i, arr) => arr.findIndex((x) => x.provider === t.provider && x.model === t.model) === i)
    .filter((t) => isConfigured(t, scope));
}

export class AiError extends Error {
  constructor(status, message, upstream = null) {
    super(message);
    this.status = status;
    this.upstream = upstream; // status asli dari provider (untuk keputusan fallback)
  }
}

// Error yang layak dicoba ulang ke model cadangan
const RETRYABLE = new Set([404, 429, 500, 503, 'timeout']); // 404 = model dihentikan → pakai cadangan

export function aiStatus(scope = 'customer') {
  const ai = config.ai;
  if (!SCOPES.includes(scope)) scope = 'customer';
  const primary = primaryProvider();
  return {
    enabled: buildTargets(scope).length > 0,
    provider: primary,
    scope,
    model: (primary === 'openai_compatible' ? ai.model : ai.geminiModel) || null,
    fallback: (primary === 'openai_compatible' ? ai.routerFallbackModel : ai.fallbackModel) || null,
    fallbackProvider: ai.fallbackProvider && ai.fallbackProvider !== primary ? ai.fallbackProvider : null,
  };
}

export function assertConfigured(scope = 'customer') {
  if (!aiStatus(scope).enabled) {
    throw new AiError(
      503,
      primaryProvider() === 'openai_compatible'
        ? 'Fitur AI belum dikonfigurasi. Isi AI_BASE_URL dan AI_MODEL di file .env server.'
        : `Fitur AI belum dikonfigurasi. Isi ${KEY_ENV[scope]} di file .env server.`,
    );
  }
}

function friendlyError(status, detail) {
  console.error(`[ai] upstream error ${status}:`, String(detail).replace(/AIza[\w-]{20,}|AQ\.[\w-]{20,}/g, '[key]').slice(0, 300));
  if (status === 429) return new AiError(429, 'AI lagi sibuk atau kuota API habis. Coba lagi sebentar ya.', status);
  if (status === 503) return new AiError(503, 'Model AI lagi ramai dipakai (high demand). Coba lagi sebentar ya.', status);
  if (status === 404) return new AiError(502, 'Model AI tidak ditemukan. Cek nama model di .env (GEMINI_MODEL / AI_MODEL).', status);
  if (status === 400 || status === 401 || status === 403) {
    return new AiError(502, 'Konfigurasi AI ditolak oleh provider. Cek API key & nama model di .env.', status);
  }
  return new AiError(502, 'Layanan AI lagi gangguan. Coba lagi beberapa saat lagi.', status);
}

// Gemini 3: token "berpikir" ikut dihitung dalam maxOutputTokens → jawaban bisa terpotong & lambat.
// Level minimal/low membuat respons cepat dan utuh. Model yang menolak pengaturan ini dicatat lalu dicoba tanpa pengaturan.
const noThinkingConfig = new Set();

function buildRequest({ system, messages, temperature = 0.7, maxTokens = 1024, stream, model, scope, thinking = 'minimal', provider }) {
  const ai = config.ai;
  const key = keyFor(scope, provider);
  if (provider === 'openai_compatible') {
    return {
      url: `${ai.baseUrl}/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: {
        model,
        stream,
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, ...messages],
      },
    };
  }
  const base = `${ai.geminiBaseUrl}/models/${encodeURIComponent(model)}`;
  return {
    url: stream ? `${base}:streamGenerateContent?alt=sse` : `${base}:generateContent`,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: {
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(thinking && !noThinkingConfig.has(model) ? { thinkingConfig: { thinkingLevel: thinking } } : {}),
      },
    },
  };
}

/** Ambil potongan teks dari satu event (Gemini / OpenAI-compatible). */
function extractText(json, provider) {
  if (provider === 'openai_compatible') {
    return json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
  }
  if (json.promptFeedback?.blockReason) throw new AiError(422, 'Pertanyaan ini tidak bisa dijawab AI. Coba ganti pertanyaannya ya.');
  const parts = json.candidates?.[0]?.content?.parts || [];
  return parts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('');
}

/**
 * Panggil AI. Jika onDelta diberikan → streaming, potongan teks dikirim bertahap.
 * Timeout: 15 detik menunggu respons pertama (rekomendasi Skill Audit Sesi 5).
 */
// ── Kesehatan model (circuit breaker sederhana) ─────────────────────────────
// Model yang baru saja overload/timeout dilewati beberapa menit, jadi request berikutnya
// langsung memakai model cadangan dan tidak menunggu model yang bermasalah lagi.
const COOLDOWN_MS = 3 * 60 * 1000;
const FAST_FAIL_MS = 8000; // batas tunggu respons pertama model utama jika ada cadangan
const unhealthyUntil = new Map();
const healthKey = (t) => `${t.provider}:${t.model}`;
export const resetModelHealth = () => unhealthyUntil.clear();
const isUnhealthy = (t) => (unhealthyUntil.get(healthKey(t)) || 0) > Date.now();

export async function callAi(opts) {
  if (!SCOPES.includes(opts.scope)) throw new Error('callAi: scope wajib "customer" atau "admin"');
  assertConfigured(opts.scope);
  const targets = buildTargets(opts.scope);
  // Target yang sedang bermasalah dicoba paling akhir (urutan lain tetap)
  const ordered = [...targets.filter((t) => !isUnhealthy(t)), ...targets.filter(isUnhealthy)];

  let lastErr;
  let i = 0;
  while (i < ordered.length) {
    const t = ordered[i];
    const hasMore = i < ordered.length - 1;
    try {
      const result = await callOnce({ ...opts, ...t, timeoutMs: hasMore ? FAST_FAIL_MS : config.ai.timeoutMs });
      unhealthyUntil.delete(healthKey(t));
      return result;
    } catch (err) {
      lastErr = err;
      // Jangan pindah jika: bukan AiError, sudah ada teks terkirim ke user, dibatalkan user, atau konten diblokir
      if (!(err instanceof AiError) || err.streamed || err.status === 499 || err.status === 422) throw err;
      // Error sementara (overload / limit / timeout / model dihentikan) → cukup coba model berikutnya.
      // Error level-provider (jaringan putus, key salah, konfigurasi) → semua model provider itu ikut gagal,
      // jadi loncat ke provider lain.
      const providerLevel = !RETRYABLE.has(err.upstream);
      const nextIdx = providerLevel ? ordered.findIndex((x, j) => j > i && x.provider !== t.provider) : i + 1;
      if (nextIdx < 0 || nextIdx >= ordered.length) throw err;
      for (const x of providerLevel ? ordered.filter((y) => y.provider === t.provider) : [t]) {
        unhealthyUntil.set(healthKey(x), Date.now() + COOLDOWN_MS);
      }
      const next = ordered[nextIdx];
      console.warn(`[ai] ${t.provider}/${t.model} gagal (${err.upstream ?? err.status}), mencoba ${next.provider}/${next.model}. Dilewati ${COOLDOWN_MS / 60000} menit.`);
      i = nextIdx;
    }
  }
  throw lastErr;
}

async function callOnce({ system, messages, temperature, maxTokens, onDelta, signal, model, scope, timeoutMs, thinking, provider }) {
  const stream = typeof onDelta === 'function';
  const req = buildRequest({ system, messages, temperature, maxTokens, stream, model, scope, thinking, provider });

  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  signal?.addEventListener('abort', abort);
  let timedOut = false;
  let timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs ?? config.ai.timeoutMs);

  try {
    let res;
    try {
      res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body), signal: ctrl.signal });
    } catch (err) {
      if (timedOut) throw new AiError(504, 'AI kelamaan merespons. Coba lagi ya.', 'timeout');
      if (signal?.aborted) throw new AiError(499, 'Dibatalkan');
      console.error('[ai] network error:', err.message);
      throw new AiError(502, 'Server tidak bisa terhubung ke layanan AI.');
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      if (res.status === 400 && /thinking/i.test(detail) && provider === 'gemini' && !noThinkingConfig.has(model)) {
        noThinkingConfig.add(model);
        console.warn(`[ai] ${model} menolak thinkingConfig, mengulang tanpa pengaturan itu`);
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        return callOnce({ system, messages, temperature, maxTokens, onDelta, signal, model, scope, timeoutMs, thinking, provider });
      }
      throw friendlyError(res.status, detail);
    }

    if (!stream) {
      const json = await res.json();
      const text = extractText(json, provider).trim();
      if (!text) throw new AiError(502, 'AI tidak memberikan jawaban. Coba lagi ya.');
      return text;
    }

    // Respons pertama sudah datang → beri waktu lebih panjang untuk menyelesaikan streaming
    clearTimeout(timer);
    timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, 90_000);

    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    try {
      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          let json;
          try { json = JSON.parse(data); } catch { continue; }
          const piece = extractText(json, provider);
          if (piece) {
            full += piece;
            onDelta(piece);
          }
        }
      }
    } catch (err) {
      const e = err instanceof AiError ? err
        : timedOut ? new AiError(504, 'Respons AI terputus karena terlalu lama.')
        : signal?.aborted ? new AiError(499, 'Dibatalkan')
        : new AiError(502, 'Koneksi ke layanan AI terputus.');
      e.streamed = full.length > 0;
      throw e;
    }
    if (!full.trim()) throw new AiError(502, 'AI tidak memberikan jawaban. Coba lagi ya.');
    return full;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

/** Bersihkan sisa Markdown / HTML supaya teks siap tampil apa adanya. */
export function cleanText(text, { allowLists = false } = {}) {
  let t = String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|`+/g, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/(^|\s)\*(\S[^*\n]*\S|\S)\*(?=\s|[.,!?]|$)/g, '$1$2');
  t = allowLists ? t.replace(/^[ \t]*[*•·][ \t]+/gm, '- ') : t.replace(/^[ \t]*(?:[-*•·]|\d+[.)])[ \t]+/gm, '');
  return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
