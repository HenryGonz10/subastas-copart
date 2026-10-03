import { Server } from 'socket.io';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { verifyToken } from '../middleware/auth.js';
import { publicAuctionState } from '../services/auction.service.js';

let io = null;

const roomOf = (vehicleId) => `vehicle:${vehicleId}`;

async function biddersOf(vehicleId) {
  const rows = await prisma.bid.findMany({
    where: { vehicleId },
    select: { userId: true },
    distinct: ['userId'],
  });
  return new Set(rows.map((r) => r.userId));
}

function viewerStatus(vehicle, userId, bidders) {
  return {
    vehicleId: vehicle.id,
    authenticated: Boolean(userId),
    isOwner: Boolean(userId) && vehicle.ownerId === userId,
    isLeader: Boolean(userId) && vehicle.currentBidderId === userId,
    hasBid: Boolean(userId) && bidders.has(userId),
  };
}

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
  });

  // El token es opcional: los anónimos pueden ver la subasta pero no ofertar.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = token ? verifyToken(token) : null;
    socket.data.userId = user?.id ?? null;
    next();
  });

  io.on('connection', (socket) => {
    socket.on('auction:join', async (vehicleId, ack) => {
      const id = Number(vehicleId);
      if (!Number.isInteger(id)) return ack?.({ ok: false });
      const vehicle = await prisma.vehicle.findUnique({ where: { id } });
      if (!vehicle) return ack?.({ ok: false, message: 'Vehículo no encontrado' });
      socket.join(roomOf(id));
      const bidders = await biddersOf(id);
      ack?.({
        ok: true,
        state: publicAuctionState(vehicle),
        viewer: viewerStatus(vehicle, socket.data.userId, bidders),
      });
    });

    socket.on('auction:leave', (vehicleId) => {
      socket.leave(roomOf(Number(vehicleId)));
    });

    socket.on('time:sync', (ack) => ack?.({ serverTime: Date.now() }));
  });

  return io;
}

/**
 * Difunde el nuevo estado de una subasta:
 *  - a todos en la sala del vehículo: monto actual (sin identidad del postor)
 *  - a cada socket: su indicador personal (ganando / superado)
 *  - a todo el inventario: precio actualizado para las tarjetas del Home
 */
export async function broadcastAuction(vehicle, event = 'auction:update') {
  if (!io) return;
  const state = publicAuctionState(vehicle);
  const room = roomOf(vehicle.id);
  io.to(room).emit(event, state);
  io.emit('inventory:update', state);

  const sockets = await io.in(room).fetchSockets();
  if (sockets.length === 0) return;
  const bidders = await biddersOf(vehicle.id);
  for (const s of sockets) {
    s.emit('auction:viewer', viewerStatus(vehicle, s.data.userId, bidders));
  }
}

export function broadcastInventoryChanged(vehicleId) {
  io?.emit('inventory:changed', { vehicleId });
}
