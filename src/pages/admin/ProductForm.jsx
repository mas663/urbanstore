import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCategories, fetchSizeCharts, normalizeProduct, PRODUCT_SELECT, SIZE_ORDER } from '../../lib/catalog.js';
import { run, supabase } from '../../lib/supabase.js';
import { compressImage } from '../../lib/image.js';
import { useToast } from '../../context/AppContext.jsx';
import { ErrorState, Field } from '../../components/ui.jsx';
import AiDescriptionButton from './AiDescriptionButton.jsx';
import { PageHeader } from './AdminLayout.jsx';

const EMPTY = {
  name: '', categoryId: '', gender: '', price: '', compareAtPrice: '', material: '', imageUrl: '',
  isFeatured: false, isActive: true, description: '', colors: [], sizes: [], stock: {},
};
const key = (color, size) => `${color}__${size}`;
const digits = (v) => v.replace(/\D/g, '');

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [charts, setCharts] = useState({});
  const [colorInput, setColorInput] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchSizeCharts().then(setCharts).catch(() => {});
    if (!isNew) {
      run(supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle())
        .then((row) => {
          if (!row) throw new Error('Produk tidak ditemukan.');
          const p = normalizeProduct(row);
          setForm({
            name: p.name, categoryId: String(p.category.id), gender: p.gender, price: String(p.price),
            compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '', material: p.material, imageUrl: p.imageUrl,
            isFeatured: p.isFeatured, isActive: p.isActive, description: p.description,
            colors: p.colors, sizes: p.sizes,
            stock: Object.fromEntries(p.variants.map((v) => [key(v.color, v.size), String(v.stock)])),
          });
        })
        .catch((e) => setLoadError(e.message));
    }
  }, [id, isNew]);

  const category = categories.find((c) => String(c.id) === form.categoryId);
  const availableSizes = useMemo(
    () => (category ? (charts[category.size_type] || []).map((r) => r.size) : []),
    [category, charts],
  );

  // Ganti kategori → buang ukuran yang tidak berlaku; kategori one-size otomatis "All Size"
  useEffect(() => {
    if (!availableSizes.length) return;
    setForm((f) => {
      let sizes = f.sizes.filter((s) => availableSizes.includes(s));
      if (!sizes.length && availableSizes.length === 1) sizes = availableSizes;
      return sizes.join() === f.sizes.join() ? f : { ...f, sizes };
    });
  }, [availableSizes]);

  const set = (k, transform = (v) => v) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : transform(e.target.value);
    setForm((f) => ({ ...f, [k]: v }));
    setError('');
  };

  function addColor() {
    const c = colorInput.trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!c) return;
    if (form.colors.some((x) => x.toLowerCase() === c.toLowerCase())) return setColorInput('');
    setForm((f) => ({ ...f, colors: [...f.colors, c] }));
    setColorInput('');
  }
  const removeColor = (c) => setForm((f) => ({ ...f, colors: f.colors.filter((x) => x !== c) }));
  const toggleSize = (s) =>
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s].sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)),
    }));
  const setStock = (c, s, v) => setForm((f) => ({ ...f, stock: { ...f.stock, [key(c, s)]: digits(v) } }));
  const fillAll = () => {
    const v = window.prompt('Isi stok yang sama untuk semua varian:', '10');
    if (v === null || !/^\d+$/.test(v.trim())) return;
    setForm((f) => ({
      ...f,
      stock: Object.fromEntries(f.colors.flatMap((c) => f.sizes.map((s) => [key(c, s), v.trim()]))),
    }));
  };

  const variants = form.colors.flatMap((c) =>
    form.sizes.map((s) => ({ color: c, size: s, stock: form.stock[key(c, s)] === '' || form.stock[key(c, s)] == null ? null : Number(form.stock[key(c, s)]) })));
  const totalStock = variants.reduce((s, v) => s + (v.stock || 0), 0);

  async function uploadImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { blob } = await compressImage(file, { maxSize: 1200, quality: 0.82 });
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, blob, { contentType: 'image/jpeg' });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setForm((f) => ({ ...f, imageUrl: data.publicUrl }));
      toast('Foto produk terupload');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    // Validasi cepat di browser; admin_save_product di database tetap memvalidasi ulang
    if (form.name.trim().length < 3) return setError('Nama produk wajib diisi (min. 3 karakter).');
    if (!form.categoryId) return setError('Pilih kategori produk.');
    if (!form.gender) return setError('Pilih gender produk.');
    if (!(Number(form.price) > 0)) return setError('Harga wajib diisi dan harus lebih dari 0.');
    if (!form.colors.length) return setError('Tambahkan minimal 1 warna.');
    if (!form.sizes.length) return setError('Pilih minimal 1 ukuran.');
    if (variants.some((v) => v.stock === null)) return setError('Isi stok untuk semua varian (boleh 0).');
    if (isNew && totalStock <= 0) return setError('Stok awal harus lebih dari 0.');

    setSaving(true);
    try {
      await run(supabase.rpc('admin_save_product', {
        p_id: isNew ? null : Number(id),
        p_product: {
          name: form.name.trim(), category_id: Number(form.categoryId), gender: form.gender, price: Number(form.price),
          compare_at_price: form.compareAtPrice ? Number(form.compareAtPrice) : null, material: form.material.trim(),
          description: form.description.trim(), image_url: form.imageUrl.trim(),
          is_featured: form.isFeatured, is_active: form.isActive,
        },
        p_variants: variants,
      }));
      toast(isNew ? 'Produk tersimpan & tayang di katalog' : 'Perubahan produk disimpan');
      navigate('/admin/produk');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loadError) return <ErrorState message={loadError} />;

  return (
    <>
      <PageHeader eyebrow={<Link to="/admin/produk" className="hover:underline">← Produk</Link>}
        title={isNew ? 'Tambah Produk Baru' : 'Edit Produk'} />

      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 border border-line bg-paper p-5 sm:p-6 lg:col-span-8">
          <Field label="Nama produk *" htmlFor="name">
            <input id="name" className="input" value={form.name} onChange={set('name')} placeholder="Urban Oversized Heavy Tee" />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Kategori *" htmlFor="categoryId">
              <select id="categoryId" className="input" value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Pilih kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Gender *">
              <div className="flex gap-2" role="radiogroup">
                {[['pria', 'Pria'], ['wanita', 'Wanita'], ['unisex', 'Unisex']].map(([v, l]) => (
                  <label key={v} className={`chip h-12 flex-1 cursor-pointer justify-center ${form.gender === v ? 'chip-active' : ''}`}>
                    <input type="radio" name="gender" value={v} checked={form.gender === v} onChange={set('gender')} className="sr-only" />{l}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Harga (Rp) *" htmlFor="price">
              <input id="price" inputMode="numeric" className="input" value={form.price} onChange={set('price', digits)} placeholder="189000" />
            </Field>
            <Field label="Harga coret (opsional)" htmlFor="compareAtPrice" hint="Isi kalau sedang diskon.">
              <input id="compareAtPrice" inputMode="numeric" className="input" value={form.compareAtPrice} onChange={set('compareAtPrice', digits)} />
            </Field>
          </div>

          {/* Varian: warna × ukuran */}
          <fieldset className="space-y-4 border-t border-line pt-6">
            <legend className="label">Varian & stok *</legend>
            <div>
              <p className="mb-2 text-xs text-mute">Warna</p>
              <div className="flex flex-wrap gap-2">
                {form.colors.map((c) => (
                  <span key={c} className="inline-flex h-9 items-center gap-2 border border-ink bg-ink pl-3 pr-1 text-sm text-paper">
                    {c}
                    <button type="button" className="px-2 text-paper/70 hover:text-paper" onClick={() => removeColor(c)} aria-label={`Hapus warna ${c}`}>×</button>
                  </span>
                ))}
                <div className="flex">
                  <input className="input h-9 w-36 text-sm" placeholder="Tambah warna…" value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addColor(); } }} />
                  <button type="button" className="btn-outline btn-sm h-9" onClick={addColor}>+</button>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-mute">{category ? 'Ukuran' : 'Pilih kategori dulu untuk melihat ukuran'}</p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((s) => (
                  <label key={s} className={`chip h-10 min-w-14 cursor-pointer justify-center ${form.sizes.includes(s) ? 'chip-active' : ''}`}>
                    <input type="checkbox" checked={form.sizes.includes(s)} onChange={() => toggleSize(s)} className="sr-only" />{s}
                  </label>
                ))}
              </div>
            </div>
            {form.colors.length > 0 && form.sizes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b border-ink text-left text-xs uppercase tracking-wider">
                      <th className="py-2 pr-3">Warna \ Ukuran</th>
                      {form.sizes.map((s) => <th key={s} className="py-2 pr-3">{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {form.colors.map((c) => (
                      <tr key={c} className="border-b border-line">
                        <td className="py-2 pr-3 font-medium">{c}</td>
                        {form.sizes.map((s) => (
                          <td key={s} className="py-2 pr-3">
                            <input inputMode="numeric" aria-label={`Stok ${c} ${s}`} className="input h-10 w-20 px-2 text-center"
                              value={form.stock[key(c, s)] ?? ''} placeholder="0" onChange={(e) => setStock(c, s, e.target.value)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex items-center justify-between text-xs text-mute">
                  <span>{variants.length} varian · total stok {totalStock} pcs</span>
                  <button type="button" className="underline" onClick={fillAll}>Isi semua stok sekaligus</button>
                </div>
              </div>
            )}
          </fieldset>

          <Field label="Bahan" htmlFor="material">
            <input id="material" className="input" value={form.material} onChange={set('material')} placeholder="Cotton combed 24s" />
          </Field>

          <Field label="Foto produk" htmlFor="imageUrl" hint="Upload foto (otomatis dikompres) atau tempel URL https://…">
            <div className="flex gap-2">
              <input id="imageUrl" className="input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…/oversized-tee.jpg" />
              <label className={`btn-outline shrink-0 cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                {uploading ? 'Upload…' : 'Upload'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadImage} />
              </label>
            </div>
          </Field>

          {/* Deskripsi diletakkan paling akhir setelah semua info produk terisi (Sesi 5) */}
          <Field label="Deskripsi" htmlFor="description">
            <AiDescriptionButton
              form={{ ...form, colors: form.colors.join(', ') }}
              categoryName={category?.name}
              onResult={(text) => setForm((f) => ({ ...f, description: text }))} />
            <textarea id="description" rows={7} className="input mt-3 h-auto py-3 leading-relaxed" value={form.description}
              onChange={set('description')} placeholder="Ceritakan detail produk: potongan, bahan, cara styling…" />
          </Field>
        </div>

        <aside className="space-y-4 lg:col-span-4">
          <div className="border border-line bg-paper p-5">
            <p className="label">Preview foto</p>
            <img src={form.imageUrl || '/products/placeholder.svg'} alt="" className="aspect-[4/5] w-full bg-soft object-cover"
              onError={(e) => { e.currentTarget.src = '/products/placeholder.svg'; }} />
          </div>
          <div className="space-y-3 border border-line bg-paper p-5 text-sm">
            <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-ink" checked={form.isFeatured} onChange={set('isFeatured')} /> Tampilkan di Featured (homepage)</label>
            <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-ink" checked={form.isActive} onChange={set('isActive')} /> Aktif & tampil di katalog</label>
          </div>
          {error && <p className="border border-danger/40 bg-danger/5 p-3 text-sm text-danger" role="alert">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={saving || uploading}>{saving ? 'Menyimpan…' : isNew ? 'Simpan & Tayangkan' : 'Simpan Perubahan'}</button>
          <Link to="/admin/produk" className="btn-ghost w-full">Batal</Link>
        </aside>
      </form>
    </>
  );
}
