import { Clock, Radio } from 'lucide-react';
import { DAMAGE_STYLES, STATUS_LABELS } from '../lib/format';
import { liveStatus, shortDuration, useServerNow } from '../lib/time';

export function DamageBadge({ level, className = '' }) {
  const style = DAMAGE_STYLES[level.code] || DAMAGE_STYLES.GREEN;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${style.pill} ${className}`}
      title={level.description}
    >
      <span className={`size-2.5 rounded-full ${style.dot}`} />
      {level.name} · {level.description}
    </span>
  );
}

/** Píldora de estado con cuenta regresiva corta (tarjetas del inventario). */
export function TimeLeftBadge({ vehicle }) {
  const now = useServerNow();
  const status = liveStatus(vehicle, now);
  const end = new Date(vehicle.endAt).getTime();
  const start = new Date(vehicle.startAt).getTime();

  if (status === 'ACTIVE') {
    const urgent = end - now < 3_600_000;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${
          urgent ? 'bg-red-500 text-white' : 'bg-white/95 text-slate-800'
        }`}
      >
        <Radio className={`size-3.5 ${urgent ? '' : 'text-green-600'}`} />
        {shortDuration(end - now)}
      </span>
    );
  }
  if (status === 'SCHEDULED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
        <Clock className="size-3.5" /> Inicia en {shortDuration(start - now)}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${
        status === 'SOLD' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
      }`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
