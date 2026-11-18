import { useEffect, useState } from 'react';
import { Field } from './ui.jsx';

// Data wilayah statis (public/wilayah) — sumber: emsifa/api-wilayah-indonesia (data Kemendagri)
const cache = new Map();
async function load(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(`/wilayah/${path}`).then((r) => {
      if (!r.ok) throw new Error('Gagal memuat data wilayah');
      return r.json();
    }));
  }
  try {
    return await cache.get(path);
  } catch (err) {
    cache.delete(path);
    throw err;
  }
}

/**
 * Pilih Provinsi → Kota/Kabupaten → Kecamatan.
 * value: { provinceId, province, cityId, city, districtId, district }
 */
export default function RegionSelect({ value, onChange, errors = {} }) {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    load('provinces.json').then(setProvinces).catch((e) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    setCities([]);
    if (value.provinceId) load(`regencies/${value.provinceId}.json`).then(setCities).catch((e) => setLoadError(e.message));
  }, [value.provinceId]);

  useEffect(() => {
    setDistricts([]);
    if (value.cityId) load(`districts/${value.cityId}.json`).then(setDistricts).catch((e) => setLoadError(e.message));
  }, [value.cityId]);

  const pick = (list, id) => list.find((x) => x.id === id)?.name || '';

  const select = (id, label, list, current, placeholder, onPick, disabled, error) => (
    <Field label={label} htmlFor={id} error={error}>
      <select id={id} className={`input ${error ? 'input-error' : ''}`} value={current} disabled={disabled}
        onChange={(e) => onPick(e.target.value)}>
        <option value="">{placeholder}</option>
        {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
    </Field>
  );

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {select('province', 'Provinsi', provinces, value.provinceId, 'Pilih provinsi',
        (id) => onChange({ provinceId: id, province: pick(provinces, id), cityId: '', city: '', districtId: '', district: '' }),
        !provinces.length, errors.province)}
      {select('city', 'Kota / Kabupaten', cities, value.cityId, value.provinceId ? 'Pilih kota/kab.' : 'Pilih provinsi dulu',
        (id) => onChange({ ...value, cityId: id, city: pick(cities, id), districtId: '', district: '' }),
        !value.provinceId || !cities.length, errors.city)}
      {select('district', 'Kecamatan', districts, value.districtId, value.cityId ? 'Pilih kecamatan' : 'Pilih kota dulu',
        (id) => onChange({ ...value, districtId: id, district: pick(districts, id) }),
        !value.cityId || !districts.length, errors.district)}
      {loadError && <p className="text-sm text-danger sm:col-span-3">{loadError}. Muat ulang halaman ya.</p>}
    </div>
  );
}
