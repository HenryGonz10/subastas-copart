const money = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat('es-GT', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const formatQ = (n) => (n === null || n === undefined ? '—' : `Q ${money.format(n)}`);
export const formatDate = (d) => dateTime.format(new Date(d));
export const formatKm = (n) => (n === null || n === undefined ? '—' : `${new Intl.NumberFormat('es-GT').format(n)} mi`);

/** Convierte una fecha a valor de <input type="datetime-local"> en hora local. */
export function toLocalInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const vehicleTitle = (v) => `${v.year} ${v.make.name} ${v.model.name}`;

export const DAMAGE_STYLES = {
  GREEN: { dot: 'bg-green-500', pill: 'bg-green-50 text-green-700 ring-green-200', emoji: '🟢' },
  YELLOW: { dot: 'bg-yellow-400', pill: 'bg-yellow-50 text-yellow-800 ring-yellow-200', emoji: '🟡' },
  RED: { dot: 'bg-red-500', pill: 'bg-red-50 text-red-700 ring-red-200', emoji: '🔴' },
};

export const STATUS_LABELS = {
  ACTIVE: 'En vivo',
  SCHEDULED: 'Próximamente',
  SOLD: 'Vendido',
  UNSOLD: 'Desierta',
};
