import { splitDuration } from '../lib/time';

export default function Countdown({ ms, tone = 'brand' }) {
  const { days, hours, minutes, seconds } = splitDuration(ms);
  const units = [
    { label: 'días', value: days },
    { label: 'horas', value: hours },
    { label: 'min', value: minutes },
    { label: 'seg', value: seconds },
  ];
  const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-100',
    urgent: 'bg-red-50 text-red-600 ring-red-100',
  };
  return (
    <div className="grid grid-cols-4 gap-2">
      {units.map((u) => (
        <div key={u.label} className={`rounded-xl py-2 text-center ring-1 ${tones[tone]}`}>
          <p className="text-2xl font-extrabold tabular-nums">{String(u.value).padStart(2, '0')}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{u.label}</p>
        </div>
      ))}
    </div>
  );
}
