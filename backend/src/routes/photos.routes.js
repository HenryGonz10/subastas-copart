import { Router } from 'express';
import { prisma } from '../db.js';
import { HttpError } from '../utils/errors.js';

const router = Router();

router.get('/:id', async (req, res) => {
  const photo = await prisma.vehiclePhoto.findUnique({ where: { id: Number(req.params.id) || 0 } });
  if (!photo) throw new HttpError(404, 'Fotografía no encontrada');
  if (photo.url) return res.redirect(photo.url);
  // Las fotos son inmutables (al editar se crean nuevas), por eso se cachean indefinidamente.
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.type(photo.mimeType || 'image/jpeg').send(Buffer.from(photo.data));
});

export default router;
