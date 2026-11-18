import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { SparkIcon, RefreshIcon } from '../../components/icons.jsx';

/* AI Product Description Generator (Sesi 5)
   Membaca seluruh data form → backend → Gemini → hasil teks bersih masuk ke field deskripsi (tetap bisa diedit). */
export default function AiDescriptionButton({ form, categoryName, onResult }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    api('/ai/status?scope=admin').then((d) => setEnabled(d.enabled)).catch(() => {});
  }, []);

  const missing = [
    form.name.trim().length < 3 && 'nama',
    !categoryName && 'kategori',
    !form.material.trim() && 'bahan',
  ].filter(Boolean);

  async function generate() {
    if (form.description.trim() && state !== 'done' &&
      !window.confirm('Deskripsi yang sudah ada akan diganti hasil AI. Lanjut?')) return;
    setState('loading');
    setError('');
    try {
      const { description } = await api('/admin/describe', {
        method: 'POST',
        body: {
          name: form.name,
          category: categoryName,
          gender: form.gender,
          price: form.price,
          colors: form.colors,
          sizes: form.sizes,
          material: form.material,
        },
      });
      onResult(description);
      setState('done');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  }

  return (
    <div className="border border-dashed border-line bg-soft/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-7 w-7 items-center justify-center bg-lemon"><SparkIcon size={14} /></span>
          <span>
            {state === 'loading'
              ? 'AI lagi nulis deskripsi dari data produk…'
              : state === 'done'
                ? 'Deskripsi dibuat AI. Cek & edit dulu sebelum disimpan ya.'
                : !enabled
                  ? 'AI belum dikonfigurasi (isi GEMINI_API_KEY_ADMIN di .env).'
                  : missing.length
                    ? `Isi ${missing.join(', ')} dulu agar AI tidak mengarang.`
                    : 'Biar AI bikinin deskripsi dari data di atas.'}
          </span>
        </div>
        <button type="button" onClick={generate}
          disabled={!enabled || missing.length > 0 || state === 'loading'}
          className={`${state === 'done' ? 'btn-outline' : 'btn-primary'} btn-sm`}>
          {state === 'loading' ? (
            <><span className="h-3 w-3 animate-spin border-2 border-current border-t-transparent" /> Generating…</>
          ) : state === 'done' || state === 'error' ? (
            <><RefreshIcon size={14} /> Generate ulang</>
          ) : (
            <><SparkIcon size={14} /> Generate Description with AI</>
          )}
        </button>
      </div>
      {state === 'loading' && (
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-11/12" /><div className="skeleton h-3 w-4/5" />
        </div>
      )}
      {state === 'error' && <p className="mt-2 text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
