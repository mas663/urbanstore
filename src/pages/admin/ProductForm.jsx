import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useToast } from '../../context/AppContext.jsx';
import { ErrorState, Field } from '../../components/ui.jsx';
import AiDescriptionButton from './AiDescriptionButton.jsx';
import { PageHeader } from './AdminLayout.jsx';

const EMPTY = {
  name: '', categoryId: '', gender: '', price: '', compareAtPrice: '', stock: '', sizes: [],
  colors: '', material: '', imageUrl: '', isFeatured: false, isActive: true, description: '',
};

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [charts, setCharts] = useState({});
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
    api('/size-charts').then((d) => setCharts(d.sizeCharts)).catch(() => {});
    if (!isNew) {
      api(`/admin/products/${id}`)
        .then(({ product: p }) =>
          setForm({
            name: p.name, categoryId: String(p.category.id), gender: p.gender, price: String(p.price),
            compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '', stock: String(p.stock), sizes: p.sizes,
            colors: p.colors.join(', '), material: p.material, imageUrl: p.imageUrl, isFeatured: p.isFeatured,
            isActive: p.isActive, description: p.description,
          }),
        )
        .catch((e) => setLoadError(e.message));
    }
  }, [id, isNew]);

  const category = categories.find((c) => String(c.id) === form.categoryId);
  const availableSizes = useMemo(() => (category ? (charts[category.sizeType] || []).map((r) => r.size) : []), [category, charts]);

  // Ganti kategori → buang ukuran yang tidak berlaku
  useEffect(() => {
    if (!availableSizes.length) return;
    setForm((f) => {
      const keep = f.sizes.filter((s) => availableSizes.includes(s));
      const sizes = keep.length ? keep : availableSizes.length === 1 ? availableSizes : keep;
      return sizes.join() === f.sizes.join() ? f : { ...f, sizes };
    });
  }, [availableSizes]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const toggleSize = (s) => {
    setForm((f) => ({ ...f, sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s] }));
    setErrors((x) => ({ ...x, sizes: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const body = { ...form, sizes: availableSizes.filter((s) => form.sizes.includes(s)) };
      await api(isNew ? '/admin/products' : `/admin/products/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast(isNew ? 'Produk tersimpan & tayang di katalog' : 'Perubahan produk disimpan');
      navigate('/admin/produk');
    } catch (err) {
      setErrors(err.fields || {});
      toast(err.message, 'error');
      setSaving(false);
    }
  }

  if (loadError) return <ErrorState message={loadError} />;

  const err = (k) => (errors[k] ? 'input-error' : '');

  return (
    <>
      <PageHeader eyebrow={<Link to="/admin/produk" className="hover:underline">← Produk</Link>}
        title={isNew ? 'Tambah Produk Baru' : 'Edit Produk'} />

      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 border border-line bg-paper p-5 sm:p-6 lg:col-span-8">
          <Field label="Nama produk *" htmlFor="name" error={errors.name}>
            <input id="name" className={`input ${err('name')}`} value={form.name} onChange={set('name')} placeholder="Urban Oversized Heavy Tee" />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Kategori *" htmlFor="categoryId" error={errors.categoryId}>
              <select id="categoryId" className={`input ${err('categoryId')}`} value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Pilih kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Gender *" error={errors.gender}>
              <div className="flex gap-2" role="radiogroup">
                {[['pria', 'Pria'], ['wanita', 'Wanita'], ['unisex', 'Unisex']].map(([v, l]) => (
                  <label key={v} className={`chip h-12 flex-1 cursor-pointer justify-center ${form.gender === v ? 'chip-active' : ''}`}>
                    <input type="radio" name="gender" value={v} checked={form.gender === v} onChange={set('gender')} className="sr-only" />{l}
                  </label>
                ))}
              </div>
            </Field>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Harga (Rp) *" htmlFor="price" error={errors.price}>
              <input id="price" inputMode="numeric" className={`input ${err('price')}`} value={form.price}
                onChange={(e) => set('price')({ target: { value: e.target.value.replace(/\D/g, ''), type: 'text' } })} placeholder="189000" />
            </Field>
            <Field label="Harga coret (opsional)" htmlFor="compareAtPrice" error={errors.compareAtPrice} hint="Isi kalau sedang diskon.">
              <input id="compareAtPrice" inputMode="numeric" className={`input ${err('compareAtPrice')}`} value={form.compareAtPrice}
                onChange={(e) => set('compareAtPrice')({ target: { value: e.target.value.replace(/\D/g, ''), type: 'text' } })} />
            </Field>
            <Field label={isNew ? 'Jumlah stok awal *' : 'Stok *'} htmlFor="stock" error={errors.stock} hint={isNew ? undefined : 'Isi 0 untuk menandai Habis.'}>
              <input id="stock" inputMode="numeric" className={`input ${err('stock')}`} value={form.stock}
                onChange={(e) => set('stock')({ target: { value: e.target.value.replace(/\D/g, ''), type: 'text' } })} placeholder="25" />
            </Field>
          </div>

          <Field label="Pilihan ukuran tersedia *" error={errors.sizes} hint={!category ? 'Pilih kategori dulu untuk melihat ukuran.' : undefined}>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((s) => (
                <label key={s} className={`chip h-11 min-w-14 cursor-pointer justify-center ${form.sizes.includes(s) ? 'chip-active' : ''}`}>
                  <input type="checkbox" checked={form.sizes.includes(s)} onChange={() => toggleSize(s)} className="sr-only" />{s}
                </label>
              ))}
            </div>
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Warna" htmlFor="colors" hint="Pisahkan dengan koma. Contoh: Hitam, Putih">
              <input id="colors" className="input" value={form.colors} onChange={set('colors')} />
            </Field>
            <Field label="Bahan" htmlFor="material">
              <input id="material" className="input" value={form.material} onChange={set('material')} placeholder="Cotton combed 24s" />
            </Field>
          </div>

          <Field label="URL foto produk" htmlFor="imageUrl" error={errors.imageUrl} hint="Link foto (https://…). Kosongkan untuk gambar placeholder.">
            <input id="imageUrl" className={`input ${err('imageUrl')}`} value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://…/oversized-tee.jpg" />
          </Field>

          {/* Deskripsi diletakkan paling akhir setelah semua info produk terisi (Sesi 5) */}
          <Field label="Deskripsi" htmlFor="description" error={errors.description}>
            <AiDescriptionButton form={form} categoryName={category?.name} onResult={(text) => setForm((f) => ({ ...f, description: text }))} />
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
          <button className="btn-primary w-full" disabled={saving}>{saving ? 'Menyimpan…' : isNew ? 'Simpan & Tayangkan' : 'Simpan Perubahan'}</button>
          <Link to="/admin/produk" className="btn-ghost w-full">Batal</Link>
        </aside>
      </form>
    </>
  );
}
