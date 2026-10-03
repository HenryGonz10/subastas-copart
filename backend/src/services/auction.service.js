import { prisma } from '../db.js';
import { config } from '../config.js';
import { HttpError } from '../utils/errors.js';

export const CLOSED_STATUSES = ['SOLD', 'UNSOLD'];

const toNumber = (d) => (d === null || d === undefined ? null : Number(d));
const toCents = (n) => Math.round(Number(n) * 100);

/** Estado real de la subasta según el reloj del servidor. */
export function computeStatus(v, now = new Date()) {
  if (CLOSED_STATUSES.includes(v.status)) return v.status;
  if (now < v.startAt) return 'SCHEDULED';
  if (now >= v.endAt) return v.bidCount > 0 ? 'SOLD' : 'UNSOLD';
  return 'ACTIVE';
}

/** Monto mínimo aceptado para la siguiente puja (base o +10% sobre la actual). */
export function minNextBid(v) {
  if (v.currentBid === null || v.currentBid === undefined) return toNumber(v.basePrice);
  const cents = toCents(v.currentBid);
  const rate = Math.round(config.minIncrementRate * 100);
  return Math.ceil((cents * (100 + rate)) / 100) / 100;
}

/** Estado público de la subasta: nunca incluye la identidad de los postores. */
export function publicAuctionState(v) {
  return {
    vehicleId: v.id,
    status: computeStatus(v),
    basePrice: toNumber(v.basePrice),
    currentBid: toNumber(v.currentBid),
    bidCount: v.bidCount,
    minNextBid: minNextBid(v),
    startAt: v.startAt,
    endAt: v.endAt,
    serverTime: new Date(),
  };
}

// Cola de exclusión mutua por vehículo: serializa pujas concurrentes en esta instancia.
const locks = new Map();
export function withVehicleLock(vehicleId, fn) {
  const previous = locks.get(vehicleId) || Promise.resolve();
  const run = previous.catch(() => {}).then(fn);
  const tail = run.catch(() => {});
  locks.set(vehicleId, tail);
  tail.then(() => {
    if (locks.get(vehicleId) === tail) locks.delete(vehicleId);
  });
  return run;
}

/**
 * Registra una puja validando TODAS las reglas de negocio en el servidor.
 * Devuelve el vehículo actualizado y el postor que fue superado (si lo hay).
 */
export function placeBid({ vehicleId, userId, amount }) {
  return withVehicleLock(vehicleId, async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      throw new HttpError(400, 'El monto de la oferta no es válido');
    }
    if (Math.abs(value * 100 - toCents(value)) > 1e-6) {
      throw new HttpError(400, 'El monto admite como máximo 2 decimales');
    }

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new HttpError(404, 'Vehículo no encontrado');

    const status = computeStatus(vehicle);
    if (status === 'SCHEDULED') throw new HttpError(409, 'La subasta aún no ha iniciado');
    if (status !== 'ACTIVE') throw new HttpError(409, 'Oferta cerrada: la subasta ya finalizó');
    if (vehicle.ownerId === userId) {
      throw new HttpError(403, 'No puedes ofertar por un vehículo que tú publicaste');
    }
    if (vehicle.currentBidderId === userId) {
      throw new HttpError(409, 'Ya tienes la oferta más alta de esta subasta');
    }

    const base = toNumber(vehicle.basePrice);
    const current = toNumber(vehicle.currentBid);
    const minimum = minNextBid(vehicle);

    if (toCents(value) < toCents(base)) {
      throw new HttpError(400, `La oferta no puede ser menor al monto base de Q ${formatQ(base)}`);
    }
    if (current !== null && toCents(value) <= toCents(current)) {
      throw new HttpError(400, `La oferta debe ser mayor a la oferta actual de Q ${formatQ(current)}`);
    }
    if (toCents(value) < toCents(minimum)) {
      throw new HttpError(
        400,
        `La oferta debe superar la actual en al menos 10%: mínimo Q ${formatQ(minimum)}`,
      );
    }

    const previousLeaderId = vehicle.currentBidderId;
    const updated = await prisma.$transaction(async (tx) => {
      // Control optimista: si otro proceso modificó la subasta, se rechaza.
      const result = await tx.vehicle.updateMany({
        where: { id: vehicleId, bidCount: vehicle.bidCount, endAt: { gt: new Date() } },
        data: {
          currentBid: value,
          currentBidderId: userId,
          bidCount: { increment: 1 },
          status: 'ACTIVE',
        },
      });
      if (result.count === 0) {
        throw new HttpError(409, 'La subasta cambió mientras ofertabas, intenta de nuevo');
      }
      await tx.bid.create({ data: { vehicleId, userId, amount: value } });
      return tx.vehicle.findUnique({ where: { id: vehicleId } });
    });

    return { vehicle: updated, previousLeaderId };
  });
}

/**
 * Persiste la transición de estado de un vehículo según el reloj:
 * SCHEDULED -> ACTIVE al llegar el inicio; -> SOLD / UNSOLD al llegar el cierre.
 * Devuelve { event, vehicle } si hubo cambio.
 */
export function applyClockTransition(vehicleId) {
  return withVehicleLock(vehicleId, async () => {
    const v = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!v || CLOSED_STATUSES.includes(v.status)) return null;
    const now = new Date();
    if (v.endAt <= now) {
      const vehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: v.bidCount > 0 ? 'SOLD' : 'UNSOLD', closedAt: now },
      });
      return { event: 'closed', vehicle };
    }
    if (v.status === 'SCHEDULED' && v.startAt <= now) {
      const vehicle = await prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'ACTIVE' } });
      return { event: 'started', vehicle };
    }
    return null;
  });
}

export function formatQ(n) {
  return Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
