import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';
import {
  CLOSED_STATUSES,
  computeStatus,
  minNextBid,
  placeBid,
} from '../services/auction.service.js';
import { broadcastAuction, broadcastInventoryChanged } from '../realtime/socket.js';
import { scheduleVehicle } from '../services/scheduler.service.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxPhotoBytes, files: config.maxPhotos },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, 'Solo se permiten imágenes JPG, PNG o WEBP'));
  },
});

const vehicleInclude = {
  itemType: true,
  make: true,
  model: true,
  transmission: true,
  fuelType: true,
  driveTrain: true,
  damageLevel: true,
  photos: { select: { id: true, url: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
};

const num = (d) => (d === null || d === undefined ? null : Number(d));
const photoUrl = (p) => p.url || `/api/photos/${p.id}`;

function serializeVehicle(v, viewerId = null) {
  return {
    id: v.id,
    year: v.year,
    engine: v.engine,
    cylinders: v.cylinders,
    vin: v.vin,
    mileage: v.mileage,
    color: v.color,
    description: v.description,
    itemType: v.itemType,
    make: v.make,
    model: v.model,
    transmission: v.transmission,
    fuelType: v.fuelType,
    driveTrain: v.driveTrain,
    damageLevel: v.damageLevel,
    basePrice: num(v.basePrice),
    currentBid: num(v.currentBid),
    bidCount: v.bidCount,
    minNextBid: minNextBid(v),
    startAt: v.startAt,
    endAt: v.endAt,
    status: computeStatus(v),
    photos: v.photos.map((p) => ({ id: p.id, url: photoUrl(p) })),
    isOwner: viewerId !== null && v.ownerId === viewerId,
    isLeader: viewerId !== null && v.currentBidderId === viewerId,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Filtros del inventario
// ---------------------------------------------------------------------------

const idList = (value) =>
  String(value ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

function statusWhere(status, now) {
  switch (status) {
    case 'ACTIVE':
      return { startAt: { lte: now }, endAt: { gt: now }, status: { notIn: CLOSED_STATUSES } };
    case 'SCHEDULED':
      return { startAt: { gt: now } };
    case 'CLOSED':
      return { OR: [{ endAt: { lte: now } }, { status: { in: CLOSED_STATUSES } }] };
    case 'ALL':
      return {};
    default: // OPEN: activas + próximas
      return { endAt: { gt: now }, status: { notIn: CLOSED_STATUSES } };
  }
}

function buildFilters(query) {
  const now = new Date();
  const and = [statusWhere(String(query.status || 'OPEN').toUpperCase(), now)];

  const inFilter = (field, key) => {
    const ids = idList(query[key]);
    if (ids.length) and.push({ [field]: { in: ids } });
  };
  inFilter('itemTypeId', 'itemTypeId');
  inFilter('makeId', 'makeId');
  inFilter('modelId', 'modelId');
  inFilter('transmissionId', 'transmissionId');
  inFilter('fuelTypeId', 'fuelTypeId');
  inFilter('driveTrainId', 'driveTrainId');
  inFilter('damageLevelId', 'damageLevelId');

  const cylinders = idList(query.cylinders);
  if (cylinders.length) and.push({ cylinders: { in: cylinders } });

  const yearFrom = Number(query.yearFrom);
  const yearTo = Number(query.yearTo);
  if (Number.isInteger(yearFrom) && yearFrom > 0) and.push({ year: { gte: yearFrom } });
  if (Number.isInteger(yearTo) && yearTo > 0) and.push({ year: { lte: yearTo } });

  const priceMin = Number(query.priceMin);
  const priceMax = Number(query.priceMax);
  const range = {};
  if (priceMin > 0) range.gte = priceMin;
  if (priceMax > 0) range.lte = priceMax;
  if (Object.keys(range).length) {
    and.push({ OR: [{ currentBid: range }, { currentBid: null, basePrice: range }] });
  }

  if (query.engine) and.push({ engine: { contains: String(query.engine).trim() } });

  const q = String(query.q || '').trim();
  if (q) {
    const or = [
      { make: { name: { contains: q } } },
      { model: { name: { contains: q } } },
      { vin: { contains: q } },
      { engine: { contains: q } },
      { color: { contains: q } },
    ];
    if (/^\d+$/.test(q)) or.push({ id: Number(q) }, { year: Number(q) });
    and.push({ OR: or });
  }

  return { AND: and };
}

const sorts = {
  endingSoon: [{ endAt: 'asc' }],
  newest: [{ createdAt: 'desc' }],
  priceAsc: [{ currentBid: 'asc' }, { basePrice: 'asc' }],
  priceDesc: [{ currentBid: 'desc' }, { basePrice: 'desc' }],
  yearDesc: [{ year: 'desc' }],
  yearAsc: [{ year: 'asc' }],
  mostBids: [{ bidCount: 'desc' }],
};

router.get('/', optionalAuth, async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(req.query.pageSize) || 12));
  const where = buildFilters(req.query);
  const orderBy = [...(sorts[req.query.sort] || sorts.endingSoon), { id: 'asc' }];

  const [total, rows] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: vehicleInclude,
    }),
  ]);

  res.json({
    items: rows.map((v) => serializeVehicle(v, req.user?.id ?? null)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    serverTime: new Date(),
  });
});

/** Publicaciones del usuario autenticado (búsqueda para editar). */
router.get('/mine', requireAuth, async (req, res) => {
  const where = { AND: [{ ownerId: req.user.id }, buildFilters({ ...req.query, status: req.query.status || 'ALL' })] };
  const rows = await prisma.vehicle.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    include: vehicleInclude,
  });
  res.json({ items: rows.map((v) => serializeVehicle(v, req.user.id)), serverTime: new Date() });
});

router.get('/:id', optionalAuth, async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: Number(req.params.id) || 0 },
    include: vehicleInclude,
  });
  if (!vehicle) throw new HttpError(404, 'Vehículo no encontrado');
  res.json({ vehicle: serializeVehicle(vehicle, req.user?.id ?? null), serverTime: new Date() });
});

// ---------------------------------------------------------------------------
// Publicación / edición
// ---------------------------------------------------------------------------

const emptyToUndefined = (v) => (v === '' || v === null || v === 'null' ? undefined : v);
const catalogId = (label) =>
  z.coerce.number({ invalid_type_error: `Selecciona ${label}` }).int().positive(`Selecciona ${label}`);

const vehicleSchema = z
  .object({
    year: z.coerce
      .number()
      .int('Año inválido')
      .min(1950, 'Año inválido')
      .max(new Date().getFullYear() + 1, 'Año inválido'),
    itemTypeId: catalogId('el tipo de artículo'),
    makeId: catalogId('la marca'),
    modelId: catalogId('el modelo'),
    engine: z.string().trim().min(2, 'Ingresa el motor').max(80),
    transmissionId: catalogId('la transmisión'),
    fuelTypeId: catalogId('el tipo de combustible'),
    driveTrainId: catalogId('el tren de manejo'),
    cylinders: z.coerce
      .number()
      .int('Número de cilindros inválido')
      .min(0, 'Número de cilindros inválido')
      .max(16, 'Número de cilindros inválido'),
    damageLevelId: catalogId('el estado de daño'),
    vin: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
    mileage: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    color: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
    description: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
    basePrice: z.coerce
      .number({ invalid_type_error: 'Ingresa el monto base' })
      .positive('El monto base debe ser mayor a 0')
      .max(99_999_999, 'Monto base demasiado alto'),
    startAt: z.coerce.date({ invalid_type_error: 'Fecha de inicio inválida' }),
    endAt: z.coerce.date({ invalid_type_error: 'Fecha de cierre inválida' }),
  })
  .refine((d) => d.endAt.getTime() - d.startAt.getTime() >= 5 * 60_000, {
    message: 'La fecha de cierre debe ser al menos 5 minutos posterior al inicio',
    path: ['endAt'],
  });

async function assertCatalogs(d) {
  const [itemType, model, transmission, fuelType, driveTrain, damageLevel] = await Promise.all([
    prisma.itemType.findUnique({ where: { id: d.itemTypeId } }),
    prisma.vehicleModel.findUnique({ where: { id: d.modelId } }),
    prisma.transmission.findUnique({ where: { id: d.transmissionId } }),
    prisma.fuelType.findUnique({ where: { id: d.fuelTypeId } }),
    prisma.driveTrain.findUnique({ where: { id: d.driveTrainId } }),
    prisma.damageLevel.findUnique({ where: { id: d.damageLevelId } }),
  ]);
  if (!itemType) throw new HttpError(400, 'Tipo de artículo inválido');
  if (!model || model.makeId !== d.makeId) throw new HttpError(400, 'El modelo no pertenece a la marca');
  if (!transmission) throw new HttpError(400, 'Transmisión inválida');
  if (!fuelType) throw new HttpError(400, 'Tipo de combustible inválido');
  if (!driveTrain) throw new HttpError(400, 'Tren de manejo inválido');
  if (!damageLevel) throw new HttpError(400, 'Estado de daño inválido');
}

const vehicleData = (d) => ({
  year: d.year,
  itemTypeId: d.itemTypeId,
  makeId: d.makeId,
  modelId: d.modelId,
  engine: d.engine,
  transmissionId: d.transmissionId,
  fuelTypeId: d.fuelTypeId,
  driveTrainId: d.driveTrainId,
  cylinders: d.cylinders,
  damageLevelId: d.damageLevelId,
  vin: d.vin ?? null,
  mileage: d.mileage ?? null,
  color: d.color ?? null,
  description: d.description ?? null,
});

const photoRows = (files, offset = 0) =>
  files.map((f, i) => ({ sortOrder: offset + i, mimeType: f.mimetype, data: f.buffer }));

router.post('/', requireAuth, upload.array('photos', config.maxPhotos), async (req, res) => {
  const d = vehicleSchema.parse(req.body);
  const files = req.files || [];
  if (files.length < config.minPhotos) {
    throw new HttpError(400, `Debes subir al menos ${config.minPhotos} fotografías del vehículo`);
  }
  const now = Date.now();
  if (d.startAt.getTime() < now - 10 * 60_000) {
    throw new HttpError(400, 'La fecha de inicio no puede estar en el pasado');
  }
  if (d.endAt.getTime() <= now) throw new HttpError(400, 'La fecha de cierre debe ser futura');
  await assertCatalogs(d);

  const vehicle = await prisma.vehicle.create({
    data: {
      ...vehicleData(d),
      ownerId: req.user.id,
      basePrice: d.basePrice,
      startAt: d.startAt,
      endAt: d.endAt,
      status: d.startAt.getTime() > now ? 'SCHEDULED' : 'ACTIVE',
      photos: { create: photoRows(files) },
    },
    include: vehicleInclude,
  });
  scheduleVehicle(vehicle);
  broadcastInventoryChanged(vehicle.id);
  res.status(201).json({ vehicle: serializeVehicle(vehicle, req.user.id) });
});

const sameMinute = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

router.put('/:id', requireAuth, upload.array('photos', config.maxPhotos), async (req, res) => {
  const id = Number(req.params.id) || 0;
  const current = await prisma.vehicle.findUnique({ where: { id }, include: { photos: { select: { id: true } } } });
  if (!current) throw new HttpError(404, 'Vehículo no encontrado');
  if (current.ownerId !== req.user.id) throw new HttpError(403, 'Solo puedes editar tus propias publicaciones');

  const d = vehicleSchema.parse(req.body);
  await assertCatalogs(d);

  // Fotos: se conservan las indicadas (en el orden recibido) y se agregan las nuevas.
  let keepIds;
  try {
    keepIds = JSON.parse(req.body.keepPhotoIds || '[]').map(Number);
  } catch {
    throw new HttpError(400, 'Listado de fotografías inválido');
  }
  const ownPhotoIds = new Set(current.photos.map((p) => p.id));
  keepIds = keepIds.filter((pid) => ownPhotoIds.has(pid));
  const files = req.files || [];
  if (keepIds.length + files.length < config.minPhotos) {
    throw new HttpError(400, `El vehículo debe tener al menos ${config.minPhotos} fotografías`);
  }
  if (keepIds.length + files.length > config.maxPhotos) {
    throw new HttpError(400, `El vehículo puede tener como máximo ${config.maxPhotos} fotografías`);
  }

  // Parámetros de la subasta
  const status = computeStatus(current);
  const startUnchanged = sameMinute(d.startAt, current.startAt);
  const endUnchanged = sameMinute(d.endAt, current.endAt);
  const baseUnchanged = Number(current.basePrice) === d.basePrice;
  const auctionUnchanged = startUnchanged && endUnchanged && baseUnchanged;
  const auction = {};

  if (!auctionUnchanged) {
    if (current.bidCount > 0) {
      throw new HttpError(
        409,
        'La subasta ya tiene ofertas: no puedes cambiar el monto base ni las fechas',
      );
    }
    const startAt = startUnchanged ? current.startAt : d.startAt;
    const endAt = endUnchanged ? current.endAt : d.endAt;
    const now = Date.now();
    if (!startUnchanged && status !== 'ACTIVE' && startAt.getTime() < now - 10 * 60_000) {
      throw new HttpError(400, 'La fecha de inicio no puede estar en el pasado');
    }
    if (endAt.getTime() <= now) throw new HttpError(400, 'La fecha de cierre debe ser futura');
    Object.assign(auction, {
      basePrice: d.basePrice,
      startAt,
      endAt,
      status: startAt.getTime() > now ? 'SCHEDULED' : 'ACTIVE',
      closedAt: null,
    });
  }

  // Orden final de la galería: ["e:<idExistente>", "n:<índiceArchivoNuevo>", ...]
  const order = new Map();
  try {
    JSON.parse(req.body.photoOrder || '[]').forEach((token, index) => order.set(String(token), index));
  } catch {
    throw new HttpError(400, 'Orden de fotografías inválido');
  }
  const position = (token, fallback) => (order.has(token) ? order.get(token) : fallback);

  const vehicle = await prisma.$transaction(async (tx) => {
    await tx.vehiclePhoto.deleteMany({ where: { vehicleId: id, id: { notIn: keepIds.length ? keepIds : [0] } } });
    for (const [index, pid] of keepIds.entries()) {
      await tx.vehiclePhoto.update({ where: { id: pid }, data: { sortOrder: position(`e:${pid}`, index) } });
    }
    if (files.length) {
      await tx.vehiclePhoto.createMany({
        data: photoRows(files, keepIds.length).map((p, i) => ({
          ...p,
          sortOrder: position(`n:${i}`, p.sortOrder),
          vehicleId: id,
        })),
      });
    }
    return tx.vehicle.update({
      where: { id },
      data: { ...vehicleData(d), ...auction },
      include: vehicleInclude,
    });
  });

  scheduleVehicle(vehicle);
  await broadcastAuction(vehicle);
  broadcastInventoryChanged(vehicle.id);
  res.json({ vehicle: serializeVehicle(vehicle, req.user.id) });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id) || 0;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw new HttpError(404, 'Vehículo no encontrado');
  if (vehicle.ownerId !== req.user.id) throw new HttpError(403, 'Solo puedes eliminar tus propias publicaciones');
  if (vehicle.bidCount > 0) throw new HttpError(409, 'No puedes eliminar una subasta que ya tiene ofertas');
  await prisma.vehicle.delete({ where: { id } });
  broadcastInventoryChanged(id);
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Pujas
// ---------------------------------------------------------------------------

const bidSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: 'Ingresa un monto válido' }).positive('Ingresa un monto válido'),
});

router.post('/:id/bids', requireAuth, async (req, res) => {
  const { amount } = bidSchema.parse(req.body);
  const { vehicle } = await placeBid({
    vehicleId: Number(req.params.id) || 0,
    userId: req.user.id,
    amount,
  });
  await broadcastAuction(vehicle);
  res.status(201).json({
    message: '¡Oferta registrada! Vas ganando esta subasta',
    currentBid: Number(vehicle.currentBid),
    bidCount: vehicle.bidCount,
    minNextBid: minNextBid(vehicle),
  });
});

/** Historial de ofertas propias del usuario en un vehículo (nunca las de otros). */
router.get('/:id/my-bids', requireAuth, async (req, res) => {
  const bids = await prisma.bid.findMany({
    where: { vehicleId: Number(req.params.id) || 0, userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, amount: true, createdAt: true },
  });
  res.json(bids.map((b) => ({ ...b, amount: Number(b.amount) })));
});

export default router;
