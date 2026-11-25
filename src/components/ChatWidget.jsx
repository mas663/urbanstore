import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, streamApi } from '../lib/api.js';
import { cleanAiText } from '../lib/format.js';
import { useAuth, useToast } from '../context/AppContext.jsx';
import { ChatIcon, CloseIcon, RefreshIcon, SendIcon, SparkIcon } from './icons.jsx';

/* AI Shopping Assistant (Sesi 5)
   - Hanya untuk customer login (belum login → diarahkan ke halaman login)
   - Kuota 5 pesan / 12 jam dihitung di backend; UI hanya menampilkan sisa kuota
   - Streaming response, loading kontekstual, error + retry, riwayat selama sesi */

const QUICK_PROMPTS = [
  'Urban Oversized Heavy Tee masih ada stok?',
  'TB 170 cm, BB 65 kg cocok size apa?',
  'Mix & match outfit buat nongkrong dong',
];

const LOADING_LINES = [
  'Asisten lagi ngecek stok katalog…',
  'Mencocokkan dengan size chart…',
  'Nyusun rekomendasi buat kamu…',
];

function formatReset(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function ChatWidget() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [quota, setQuota] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [loadingLine, setLoadingLine] = useState(0);
  const listRef = useRef(null);
  const ctrlRef = useRef(null);
  const storageKey = user ? `us_chat_${user.id}` : null;

  // Riwayat percakapan bertahan selama sesi browser
  useEffect(() => {
    if (!storageKey) return setMessages([]);
    try {
      setMessages(JSON.parse(sessionStorage.getItem(storageKey) || '[]'));
    } catch {
      setMessages([]);
    }
  }, [storageKey]);
  useEffect(() => {
    if (!storageKey || streaming) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages.filter((m) => !m.error).slice(-20)));
    } catch { /* storage penuh / diblokir */ }
  }, [messages, storageKey, streaming]);

  const loadQuota = useCallback(() => {
    api('/chat/quota')
      .then((d) => { setQuota(d.quota); setAiEnabled(d.ai.enabled); })
      .catch(() => {});
  }, []);

  const openChat = useCallback(() => {
    if (!user) {
      const sep = location.search ? '&' : '?';
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search + sep + 'chat=1')}`);
      return;
    }
    if (user.role !== 'customer') {
      toast('AI Shopping Assistant khusus untuk akun customer.', 'error');
      return;
    }
    setOpen(true);
    loadQuota();
  }, [user, location, navigate, toast, loadQuota]);

  // Kembali dari halaman login dengan ?chat=1 → langsung buka chat
  useEffect(() => {
    if (params.get('chat') === '1' && user?.role === 'customer') {
      const next = new URLSearchParams(params);
      next.delete('chat');
      setParams(next, { replace: true });
      setOpen(true);
      loadQuota();
    }
  }, [params, user, setParams, loadQuota]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!streaming) return;
    const t = setInterval(() => setLoadingLine((n) => (n + 1) % LOADING_LINES.length), 1600);
    return () => clearInterval(t);
  }, [streaming]);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  async function send(text, baseMessages = messages) {
    const content = text.trim();
    if (!content || streaming) return;
    if (quota && quota.remaining <= 0) return;

    const history = baseMessages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    const next = [...baseMessages, { role: 'user', content }, { role: 'assistant', content: '', pending: true }];
    setMessages(next);
    setInput('');
    setStreaming(true);
    setLoadingLine(0);

    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    let reply = '';
    const update = (patch) =>
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
        return copy;
      });

    try {
      const done = await streamApi('/chat', { message: content, history }, {
        signal: ctrl.signal,
        onDelta: (piece) => {
          reply += piece;
          update({ content: reply, pending: false });
        },
      });
      update({ content: reply, pending: false });
      setQuota(done.quota);
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (err.data?.quota) setQuota(err.data.quota);
      if (err.status === 401) toast('Sesi login kamu habis. Login lagi ya.', 'error');
      update({ content: err.message, pending: false, error: true, retryText: content, retryable: err.status !== 429 && err.status !== 503 });
    } finally {
      setStreaming(false);
      ctrlRef.current = null;
    }
  }

  function retry(index) {
    const failed = messages[index];
    // Buang pesan user + bubble error, lalu kirim ulang dengan riwayat sebelumnya
    send(failed.retryText, messages.slice(0, index - 1));
  }

  function clearChat() {
    if (streaming) return;
    setMessages([]);
  }

  // Revisi: chat tidak ditampilkan di halaman login & daftar (belum bisa dipakai sebelum login)
  if (['/login', '/daftar'].includes(location.pathname)) return null;

  const outOfQuota = quota && quota.remaining <= 0;
  const disabled = streaming || outOfQuota || !aiEnabled;

  return (
    <>
      {!open && (
        <button onClick={openChat}
          className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 bg-ink pl-4 pr-5 text-sm font-semibold text-paper transition-colors hover:bg-ink/85"
          aria-label="Buka AI Shopping Assistant">
          <span className="flex h-7 w-7 items-center justify-center bg-lemon text-ink"><ChatIcon size={16} /></span>
          <span className="hidden sm:inline">Tanya Asisten</span>
        </button>
      )}

      {open && (
        <section role="dialog" aria-label="AI Shopping Assistant"
          className="fixed inset-0 z-[55] flex flex-col bg-paper sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[600px] sm:max-h-[calc(100vh-40px)] sm:w-[400px] sm:border sm:border-ink">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center bg-lemon"><SparkIcon size={18} /></span>
              <div>
                <p className="text-sm font-semibold leading-tight">Urban Assistant</p>
                <p className="text-xs text-mute" aria-live="polite">
                  {quota ? `${quota.remaining}/${quota.limit} pesan tersisa` : 'Memuat kuota…'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              {messages.length > 0 && (
                <button className="btn-ghost btn-sm text-xs text-mute" onClick={clearChat} disabled={streaming}>Bersihkan</button>
              )}
              <button className="p-2" onClick={() => setOpen(false)} aria-label="Tutup chat"><CloseIcon /></button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
            <div className="max-w-[88%] bg-soft p-3 text-sm leading-relaxed">
              Haii {user?.name.split(' ')[0]}! Aku Urban Assistant. Aku bisa cek stok, bantu pilih ukuran dari tinggi & berat badan kamu, atau kasih ide mix & match dari katalog UrbanStore.
            </div>
            {messages.length === 0 && aiEnabled && (
              <div className="flex flex-col items-start gap-2">
                {QUICK_PROMPTS.map((q) => (
                  <button key={q} className="border border-line px-3 py-2 text-left text-xs hover:border-ink disabled:opacity-40"
                    onClick={() => send(q)} disabled={disabled}>{q}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-auto max-w-[85%] bg-ink p-3 text-sm text-paper whitespace-pre-line">{m.content}</div>
              ) : m.error ? (
                <div key={i} className="max-w-[88%] border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
                  <p>{m.content}</p>
                  {m.retryable && i === messages.length - 1 && (
                    <button className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline" onClick={() => retry(i)} disabled={streaming}>
                      <RefreshIcon size={12} /> Coba lagi
                    </button>
                  )}
                </div>
              ) : m.pending ? (
                <div key={i} className="max-w-[88%] bg-soft p-3 text-sm text-mute">
                  <span className="mr-2 inline-flex gap-1 align-middle" aria-hidden="true">
                    {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce bg-mute" style={{ animationDelay: `${d * 120}ms` }} />)}
                  </span>
                  {LOADING_LINES[loadingLine]}
                </div>
              ) : (
                <div key={i} className="max-w-[88%] bg-soft p-3 text-sm leading-relaxed whitespace-pre-line">{cleanAiText(m.content)}</div>
              ),
            )}
          </div>

          <footer className="border-t border-line p-3">
            {!aiEnabled ? (
              <p className="bg-soft p-3 text-xs text-mute">Fitur AI belum diaktifkan oleh toko (API key belum diisi). Coba lagi nanti ya.</p>
            ) : outOfQuota ? (
              <p className="bg-soft p-3 text-xs text-mute">
                Kuota 5 pesan kamu sudah habis. Reset otomatis {formatReset(quota.resetAt)}. Sementara itu, cek Size Guide di halaman produk ya.
              </p>
            ) : (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
                <label className="sr-only" htmlFor="chat-input">Pesan</label>
                <input id="chat-input" className="input h-11 flex-1 text-sm" placeholder="Tanya stok, size, outfit…" maxLength={500}
                  value={input} onChange={(e) => setInput(e.target.value)} disabled={disabled} autoComplete="off" />
                <button className="btn-primary h-11 w-11 px-0" disabled={disabled || !input.trim()} aria-label="Kirim pesan">
                  <SendIcon size={18} />
                </button>
              </form>
            )}
            <p className="mt-2 text-[11px] leading-snug text-mute">Rekomendasi ukuran adalah estimasi dari size chart, bukan jaminan pas.</p>
          </footer>
        </section>
      )}
    </>
  );
}
