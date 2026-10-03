import { useEffect, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useCatalogs } from '../context/CatalogContext';
import { DAMAGE_STYLES } from '../lib/format';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 1 - 1990 + 1 }, (_, i) => CURRENT_YEAR + 1 - i);
const CYLINDERS = [0, 3, 4, 5, 6, 8, 10, 12];

export const FILTER_KEYS = [
  'q', 'makeId', 'modelId', 'itemTypeId', 'fuelTypeId', 'transmissionId', 'driveTrainId',
  'damageLevelId', 'cylinders', 'yearFrom', 'yearTo', 'priceMin', 'priceMax', 'engine',
];

const toList = (v) => (v ? String(v).split(',').filter(Boolean) : []);

function Section({ title, children }) {
  return (
    <div className="space-y-2 border-t border-slate-100 pt-4 first:border-0 first:pt-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function Select({ value, onChange, placeholder, options }) {
  return (
    <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/** Campo de texto que aplica el filtro al dejar de escribir. */
function DebouncedInput({ value, onChange, delay = 450, ...props }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => setLocal(value || ''), [value]);
  useEffect(() => {
    if ((value || '') === local) return;
    const t = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(t);
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input className="input" value={local} onChange={(e) => setLocal(e.target.value)} {...props} />;
}

export default function Filters({ values, onChange, onReset, activeCount }) {
  const { catalogs } = useCatalogs();
  const set = (key) => (value) => onChange({ [key]: value });

  const toggle = (key, id) => {
    const list = toList(values[key]);
    const next = list.includes(String(id)) ? list.filter((x) => x !== String(id)) : [...list, String(id)];
    onChange({ [key]: next.join(',') });
  };
  const isOn = (key, id) => toList(values[key]).includes(String(id));

  const models = catalogs.models.filter((m) => String(m.makeId) === String(values.makeId));
  const opts = (list, label = (x) => x.name) => list.map((x) => ({ value: String(x.id), label: label(x) }));

  return (
    <aside className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <SlidersHorizontal className="size-4 text-brand-600" /> Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">{activeCount}</span>
          )}
        </h2>
        {activeCount > 0 && (
          <button className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline" onClick={onReset}>
            <RotateCcw className="size-3.5" /> Limpiar
          </button>
        )}
      </div>

      <Section title="Nivel de daño">
        <div className="flex flex-wrap gap-2">
          {catalogs.damageLevels.map((d) => {
            const on = isOn('damageLevelId', d.id);
            const style = DAMAGE_STYLES[d.code];
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggle('damageLevelId', d.id)}
                className={`chip ${on ? `${style.pill} ring-2 border-transparent` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                title={d.description}
              >
                <span className={`size-2.5 rounded-full ${style.dot}`} /> {d.name}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Marca y modelo">
        <Select
          value={values.makeId}
          onChange={(v) => onChange({ makeId: v, modelId: '' })}
          placeholder="Todas las marcas"
          options={opts(catalogs.makes)}
        />
        <Select
          value={values.modelId}
          onChange={set('modelId')}
          placeholder={values.makeId ? 'Todos los modelos' : 'Selecciona una marca primero'}
          options={opts(models)}
        />
      </Section>

      <Section title="Año">
        <div className="grid grid-cols-2 gap-2">
          <Select value={values.yearFrom} onChange={set('yearFrom')} placeholder="Desde" options={YEARS.map((y) => ({ value: String(y), label: y }))} />
          <Select value={values.yearTo} onChange={set('yearTo')} placeholder="Hasta" options={YEARS.map((y) => ({ value: String(y), label: y }))} />
        </div>
      </Section>

      <Section title="Tipo de artículo">
        <Select value={values.itemTypeId} onChange={set('itemTypeId')} placeholder="Todos los tipos" options={opts(catalogs.itemTypes)} />
      </Section>

      <Section title="Combustible">
        <Select value={values.fuelTypeId} onChange={set('fuelTypeId')} placeholder="Todos" options={opts(catalogs.fuelTypes)} />
      </Section>

      <Section title="Transmisión">
        <Select value={values.transmissionId} onChange={set('transmissionId')} placeholder="Todas" options={opts(catalogs.transmissions)} />
      </Section>

      <Section title="Tren de manejo">
        <div className="flex flex-wrap gap-2">
          {catalogs.driveTrains.map((d) => (
            <button
              key={d.id}
              type="button"
              title={d.description}
              onClick={() => toggle('driveTrainId', d.id)}
              className={`chip ${isOn('driveTrainId', d.id) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {d.code}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Cilindros">
        <div className="flex flex-wrap gap-2">
          {CYLINDERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle('cylinders', c)}
              className={`chip ${isOn('cylinders', c) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {c === 0 ? 'Eléctrico' : c}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Motor">
        <DebouncedInput value={values.engine} onChange={set('engine')} placeholder="Ej. V6, 2.0L, Turbo" />
      </Section>

      <Section title="Precio actual (Q)">
        <div className="grid grid-cols-2 gap-2">
          <DebouncedInput type="number" min="0" value={values.priceMin} onChange={set('priceMin')} placeholder="Mínimo" />
          <DebouncedInput type="number" min="0" value={values.priceMax} onChange={set('priceMax')} placeholder="Máximo" />
        </div>
      </Section>
    </aside>
  );
}

export { DebouncedInput };
