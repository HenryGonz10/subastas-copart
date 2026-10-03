import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ImagePlus, Lock, Plus, Save, Star, Trash2 } from 'lucide-react';
import { api, photoSrc } from '../lib/api';
import { compressImage } from '../lib/image';
import { DAMAGE_STYLES, formatQ, toLocalInput } from '../lib/format';
import { useCatalogs } from '../context/CatalogContext';

const MIN_PHOTOS = 5;
const MAX_PHOTOS = 12;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 1950 + 1 }, (_, i) => CURRENT_YEAR + 1 - i);

function initialValues(vehicle) {
  if (vehicle) {
    return {
      year: String(vehicle.year),
      itemTypeId: String(vehicle.itemType.id),
      makeId: String(vehicle.make.id),
      modelId: String(vehicle.model.id),
      engine: vehicle.engine,
      transmissionId: String(vehicle.transmission.id),
      fuelTypeId: String(vehicle.fuelType.id),
      driveTrainId: String(vehicle.driveTrain.id),
      cylinders: String(vehicle.cylinders),
      damageLevelId: String(vehicle.damageLevel.id),
      vin: vehicle.vin || '',
      mileage: vehicle.mileage ?? '',
      color: vehicle.color || '',
      description: vehicle.description || '',
      basePrice: String(vehicle.basePrice),
      startAt: toLocalInput(vehicle.startAt),
      endAt: toLocalInput(vehicle.endAt),
    };
  }
  const start = new Date(Date.now() + 10 * 60_000);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 3 * 24 * 3_600_000);
  return {
    year: '', itemTypeId: '', makeId: '', modelId: '', engine: '', transmissionId: '', fuelTypeId: '',
    driveTrainId: '', cylinders: '', damageLevelId: '', vin: '', mileage: '', color: '', description: '',
    basePrice: '', startAt: toLocalInput(start), endAt: toLocalInput(end),
  };
}

function Field({ label, error, children, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

function Section({ step, title, subtitle, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">{step}</span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function VehicleForm({ vehicle, onSubmit, submitLabel }) {
  const { catalogs, reload } = useCatalogs();
  const [values, setValues] = useState(() => initialValues(vehicle));
  const [photos, setPhotos] = useState(() =>
    (vehicle?.photos || []).map((p) => ({ key: `e:${p.id}`, type: 'existing', id: p.id, url: photoSrc(p.url) })),
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newModel, setNewModel] = useState(null);
  const fileInput = useRef(null);
  const newKey = useRef(0);

  const auctionLocked = Boolean(vehicle && vehicle.bidCount > 0);
  const models = useMemo(
    () => catalogs.models.filter((m) => String(m.makeId) === values.makeId),
    [catalogs.models, values.makeId],
  );

  useEffect(
    () => () => photos.forEach((p) => p.type === 'new' && URL.revokeObjectURL(p.url)),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setValues((v) => ({ ...v, [key]: value, ...(key === 'makeId' ? { modelId: '' } : {}) }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const addFiles = async (fileList) => {
    const files = [...fileList].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (files.length < fileList.length) toast.warning('Solo se aceptan imágenes JPG, PNG o WEBP');
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) toast.warning(`Máximo ${MAX_PHOTOS} fotografías por vehículo`);
    const compressed = await Promise.all(files.slice(0, room).map(compressImage));
    setPhotos((prev) => [
      ...prev,
      ...compressed.map((file) => ({ key: `new-${newKey.current++}`, type: 'new', file, url: URL.createObjectURL(file) })),
    ]);
    setErrors((er) => ({ ...er, photos: undefined }));
  };

  const move = (index, delta) =>
    setPhotos((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const makeCover = (index) => setPhotos((prev) => [prev[index], ...prev.filter((_, i) => i !== index)]);

  const remove = (index) =>
    setPhotos((prev) => {
      const p = prev[index];
      if (p.type === 'new') URL.revokeObjectURL(p.url);
      return prev.filter((_, i) => i !== index);
    });

  const saveModel = async () => {
    if (!newModel?.trim()) return;
    try {
      const model = await api.addModel(values.makeId, newModel.trim());
      await reload();
      setValues((v) => ({ ...v, modelId: String(model.id) }));
      setNewModel(null);
      toast.success(`Modelo "${model.name}" agregado`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const validate = () => {
    const e = {};
    const required = {
      year: 'Selecciona el año', itemTypeId: 'Selecciona el tipo de artículo', makeId: 'Selecciona la marca',
      modelId: 'Selecciona el modelo', engine: 'Ingresa el motor', transmissionId: 'Selecciona la transmisión',
      fuelTypeId: 'Selecciona el combustible', driveTrainId: 'Selecciona el tren de manejo',
      cylinders: 'Ingresa el número de cilindros', damageLevelId: 'Selecciona el estado de daño',
      basePrice: 'Ingresa el monto base', startAt: 'Indica la fecha de inicio', endAt: 'Indica la fecha de cierre',
    };
    for (const [k, msg] of Object.entries(required)) if (String(values[k]).trim() === '') e[k] = msg;
    if (values.basePrice && Number(values.basePrice) <= 0) e.basePrice = 'El monto base debe ser mayor a 0';
    if (values.startAt && values.endAt && new Date(values.endAt) <= new Date(values.startAt)) {
      e.endAt = 'El cierre debe ser posterior al inicio';
    }
    if (photos.length < MIN_PHOTOS) e.photos = `Agrega al menos ${MIN_PHOTOS} fotografías (llevas ${photos.length})`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Revisa los campos marcados');
      return;
    }
    const form = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (k === 'startAt' || k === 'endAt') form.append(k, new Date(v).toISOString());
      else form.append(k, v);
    }
    const newPhotos = photos.filter((p) => p.type === 'new');
    newPhotos.forEach((p) => form.append('photos', p.file));
    form.append('keepPhotoIds', JSON.stringify(photos.filter((p) => p.type === 'existing').map((p) => p.id)));
    form.append(
      'photoOrder',
      JSON.stringify(photos.map((p) => (p.type === 'existing' ? `e:${p.id}` : `n:${newPhotos.indexOf(p)}`))),
    );

    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      toast.error(err.message);
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])));
    } finally {
      setSaving(false);
    }
  };

  const select = (key, list, placeholder, label = (x) => x.name) => (
    <select className="input" value={values[key]} onChange={set(key)}>
      <option value="">{placeholder}</option>
      {list.map((x) => (
        <option key={x.id} value={x.id}>{label(x)}</option>
      ))}
    </select>
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Section step="1" title="Ficha técnica" subtitle="Todos los campos marcados son obligatorios.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Año *" error={errors.year}>
            <select className="input" value={values.year} onChange={set('year')}>
              <option value="">Selecciona el año</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Tipo de artículo *" error={errors.itemTypeId}>
            {select('itemTypeId', catalogs.itemTypes, 'Selecciona el tipo')}
          </Field>
          <Field label="Marca *" error={errors.makeId}>
            {select('makeId', catalogs.makes, 'Selecciona la marca')}
          </Field>
          <Field label="Modelo *" error={errors.modelId}>
            {newModel === null ? (
              <>
                <select className="input" value={values.modelId} onChange={set('modelId')} disabled={!values.makeId}>
                  <option value="">{values.makeId ? 'Selecciona el modelo' : 'Primero elige la marca'}</option>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {values.makeId && (
                  <button type="button" onClick={() => setNewModel('')} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                    <Plus className="size-3" /> ¿No está tu modelo? Agrégalo
                  </button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <input className="input" autoFocus value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder="Nombre del modelo" />
                <button type="button" className="btn-primary px-3" onClick={saveModel}>Agregar</button>
                <button type="button" className="btn-ghost px-3" onClick={() => setNewModel(null)}>✕</button>
              </div>
            )}
          </Field>
          <Field label="Motor *" error={errors.engine} hint="Ej. 2.5L I4, 3.5L V6 Turbo">
            <input className="input" value={values.engine} onChange={set('engine')} maxLength={80} />
          </Field>
          <Field label="Transmisión *" error={errors.transmissionId}>
            {select('transmissionId', catalogs.transmissions, 'Selecciona la transmisión')}
          </Field>
          <Field label="Tipo de combustible *" error={errors.fuelTypeId}>
            {select('fuelTypeId', catalogs.fuelTypes, 'Selecciona el combustible')}
          </Field>
          <Field label="Tren de manejo *" error={errors.driveTrainId}>
            {select('driveTrainId', catalogs.driveTrains, 'Selecciona el tren', (d) => `${d.code} · ${d.description}`)}
          </Field>
          <Field label="Número de cilindros *" error={errors.cylinders} hint="Usa 0 para vehículos eléctricos">
            <input type="number" min="0" max="16" className="input" value={values.cylinders} onChange={set('cylinders')} />
          </Field>
          <Field label="VIN" error={errors.vin}>
            <input className="input uppercase" value={values.vin} onChange={set('vin')} maxLength={30} />
          </Field>
          <Field label="Millaje" error={errors.mileage}>
            <input type="number" min="0" className="input" value={values.mileage} onChange={set('mileage')} />
          </Field>
          <Field label="Color" error={errors.color}>
            <input className="input" value={values.color} onChange={set('color')} maxLength={40} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Descripción del daño / observaciones" error={errors.description}>
            <textarea className="input min-h-24" value={values.description} onChange={set('description')} maxLength={2000} />
          </Field>
        </div>
      </Section>

      <Section step="2" title="Clasificación por estado de daño *" subtitle="Ayuda a los compradores a entender el estado real del vehículo.">
        <div className="grid gap-3 sm:grid-cols-3">
          {catalogs.damageLevels.map((d) => {
            const active = values.damageLevelId === String(d.id);
            const style = DAMAGE_STYLES[d.code];
            return (
              <button
                type="button"
                key={d.id}
                onClick={() => set('damageLevelId')(String(d.id))}
                className={`rounded-2xl p-4 text-left ring-1 transition ${active ? `${style.pill} ring-2` : 'bg-white ring-slate-200 hover:bg-slate-50'}`}
              >
                <p className="flex items-center gap-2 text-base font-bold">
                  <span className={`size-4 rounded-full ${style.dot}`} /> {style.emoji} {d.name}
                </p>
                <p className="mt-1 text-sm opacity-80">{d.description}</p>
              </button>
            );
          })}
        </div>
        {errors.damageLevelId && <p className="mt-2 text-xs font-medium text-red-600">{errors.damageLevelId}</p>}
      </Section>

      <Section
        step="3"
        title="Galería fotográfica *"
        subtitle={`Mínimo ${MIN_PHOTOS} fotografías (máximo ${MAX_PHOTOS}). La primera será la portada.`}
      >
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInput.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition hover:border-brand-500 hover:bg-brand-50 ${
            errors.photos ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50'
          }`}
        >
          <ImagePlus className="size-8 text-brand-600" />
          <p className="font-semibold text-slate-800">Arrastra tus fotos aquí o haz clic para seleccionarlas</p>
          <p className="text-xs text-slate-500">JPG, PNG o WEBP · se optimizan automáticamente</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className={`font-semibold ${photos.length >= MIN_PHOTOS ? 'text-green-600' : 'text-slate-500'}`}>
            {photos.length} / {MIN_PHOTOS} fotos mínimas
          </span>
          {errors.photos && <span className="font-medium text-red-600">{errors.photos}</span>}
        </div>
        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p, i) => (
              <div key={p.key} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                <img src={p.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-accent-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">Portada</span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-slate-900/70 to-transparent p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded-lg bg-white/90 text-slate-700" title="Mover a la izquierda"><ArrowLeft className="size-4" /></button>
                    <button type="button" onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded-lg bg-white/90 text-slate-700" title="Mover a la derecha"><ArrowRight className="size-4" /></button>
                    {i !== 0 && (
                      <button type="button" onClick={() => makeCover(i)} className="grid size-7 place-items-center rounded-lg bg-white/90 text-amber-500" title="Usar como portada"><Star className="size-4" /></button>
                    )}
                  </div>
                  <button type="button" onClick={() => remove(i)} className="grid size-7 place-items-center rounded-lg bg-white/90 text-red-600" title="Eliminar"><Trash2 className="size-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section step="4" title="Parámetros de la subasta *" subtitle="Define desde cuánto inicia la puja y cuándo abre y cierra.">
        {auctionLocked && (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
            <Lock className="size-4" /> Esta subasta ya tiene ofertas: el monto base y las fechas no se pueden modificar.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Monto base (Q) *"
            error={errors.basePrice}
            hint={values.basePrice ? `La subasta inicia en ${formatQ(Number(values.basePrice))}` : 'Ej. 20000'}
          >
            <input type="number" min="1" step="0.01" className="input" value={values.basePrice} onChange={set('basePrice')} disabled={auctionLocked} />
          </Field>
          <Field label="Fecha y hora de inicio *" error={errors.startAt}>
            <input type="datetime-local" className="input" value={values.startAt} onChange={set('startAt')} disabled={auctionLocked} />
          </Field>
          <Field label="Fecha y hora de cierre *" error={errors.endAt}>
            <input type="datetime-local" className="input" value={values.endAt} onChange={set('endAt')} disabled={auctionLocked} />
          </Field>
        </div>
      </Section>

      <div className="flex justify-end">
        <button className="btn-primary px-6 py-3 text-base" disabled={saving}>
          <Save className="size-5" /> {saving ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
