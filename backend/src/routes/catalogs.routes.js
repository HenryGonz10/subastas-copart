import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';

const router = Router();
const byName = { orderBy: { name: 'asc' } };

/** Todos los catálogos en una sola llamada (formularios y filtros). */
router.get('/', async (_req, res) => {
  const [itemTypes, makes, models, transmissions, fuelTypes, driveTrains, damageLevels] =
    await Promise.all([
      prisma.itemType.findMany(byName),
      prisma.make.findMany(byName),
      prisma.vehicleModel.findMany(byName),
      prisma.transmission.findMany(byName),
      prisma.fuelType.findMany(byName),
      prisma.driveTrain.findMany({ orderBy: { code: 'asc' } }),
      prisma.damageLevel.findMany({ orderBy: { id: 'asc' } }),
    ]);
  res.json({ itemTypes, makes, models, transmissions, fuelTypes, driveTrains, damageLevels });
});

router.get('/item-types', async (_req, res) => res.json(await prisma.itemType.findMany(byName)));
router.get('/makes', async (_req, res) => res.json(await prisma.make.findMany(byName)));
router.get('/makes/:id/models', async (req, res) => {
  res.json(await prisma.vehicleModel.findMany({ where: { makeId: Number(req.params.id) }, ...byName }));
});
router.get('/transmissions', async (_req, res) =>
  res.json(await prisma.transmission.findMany(byName)),
);
router.get('/fuel-types', async (_req, res) => res.json(await prisma.fuelType.findMany(byName)));
router.get('/drive-trains', async (_req, res) =>
  res.json(await prisma.driveTrain.findMany({ orderBy: { code: 'asc' } })),
);
router.get('/damage-levels', async (_req, res) =>
  res.json(await prisma.damageLevel.findMany({ orderBy: { id: 'asc' } })),
);

const nameSchema = z.object({ name: z.string().trim().min(1, 'Ingresa un nombre').max(60) });

/** Permite al publicador agregar una marca que no exista en el catálogo. */
router.post('/makes', requireAuth, async (req, res) => {
  const { name } = nameSchema.parse(req.body);
  const make = await prisma.make.upsert({ where: { name }, update: {}, create: { name } });
  res.status(201).json(make);
});

/** Permite al publicador agregar un modelo a una marca existente. */
router.post('/makes/:id/models', requireAuth, async (req, res) => {
  const makeId = Number(req.params.id);
  const { name } = nameSchema.parse(req.body);
  const make = await prisma.make.findUnique({ where: { id: makeId } });
  if (!make) throw new HttpError(404, 'Marca no encontrada');
  const model = await prisma.vehicleModel.upsert({
    where: { makeId_name: { makeId, name } },
    update: {},
    create: { makeId, name },
  });
  res.status(201).json(model);
});

export default router;
