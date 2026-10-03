import { prisma } from '../db.js';
import { CLOSED_STATUSES, applyClockTransition } from './auction.service.js';
import { broadcastAuction } from '../realtime/socket.js';

// Reloj de subastas basado en temporizadores: en lugar de consultar la base de datos
// cada pocos segundos, se programa un setTimeout exacto para el próximo inicio/cierre
// de cada subasta. La base solo se consulta al arrancar y cada HORIZON_MS.
const HORIZON_MS = 6 * 60 * 60 * 1000;
const timers = new Map();

function nextEventAt(v, now = Date.now()) {
  if (CLOSED_STATUSES.includes(v.status)) return null;
  const start = new Date(v.startAt).getTime();
  const end = new Date(v.endAt).getTime();
  if (v.status === 'SCHEDULED' && start > now) return start;
  return end;
}

export function scheduleVehicle(v) {
  clearTimeout(timers.get(v.id));
  timers.delete(v.id);
  const at = nextEventAt(v);
  if (at === null) return;
  const delay = Math.max(0, at - Date.now());
  if (delay > HORIZON_MS) return; // lo programará el siguiente refresco
  timers.set(
    v.id,
    setTimeout(() => runTransition(v.id), delay + 250),
  );
}

async function runTransition(vehicleId) {
  timers.delete(vehicleId);
  try {
    const result = await applyClockTransition(vehicleId);
    if (!result) return;
    await broadcastAuction(result.vehicle, result.event === 'closed' ? 'auction:closed' : 'auction:update');
    scheduleVehicle(result.vehicle);
  } catch (err) {
    console.error(`Error en el reloj de la subasta ${vehicleId}:`, err.message);
    setTimeout(() => runTransition(vehicleId), 10_000);
  }
}

export async function refreshSchedule() {
  const limit = new Date(Date.now() + HORIZON_MS);
  const vehicles = await prisma.vehicle.findMany({
    where: {
      status: { in: ['SCHEDULED', 'ACTIVE'] },
      OR: [{ endAt: { lte: limit } }, { status: 'SCHEDULED', startAt: { lte: limit } }],
    },
    select: { id: true, status: true, startAt: true, endAt: true },
  });
  vehicles.forEach(scheduleVehicle);
  return vehicles.length;
}

export function startScheduler() {
  const refresh = () =>
    refreshSchedule().catch((err) => console.error('No se pudo refrescar el reloj de subastas:', err.message));
  refresh();
  setInterval(refresh, HORIZON_MS - 10 * 60 * 1000);
}
