import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { HttpError } from '../utils/errors.js';

const router = Router();

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña es demasiado larga')
  .regex(/[a-z]/, 'La contraseña debe incluir una letra minúscula')
  .regex(/[A-Z]/, 'La contraseña debe incluir una letra mayúscula')
  .regex(/\d/, 'La contraseña debe incluir un número')
  .regex(/[^A-Za-z0-9]/, 'La contraseña debe incluir un carácter especial');

const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'Ingresa tu nombre').max(80),
  lastName: z.string().trim().min(2, 'Ingresa tu apellido').max(80),
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido').max(160),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,20}$/, 'Teléfono inválido (mínimo 8 dígitos)'),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

const publicUser = (u) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
});

router.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw new HttpError(409, 'Ya existe una cuenta con ese correo electrónico');

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'Correo o contraseña incorrectos');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new HttpError(401, 'Sesión inválida');
  res.json({ user: publicUser(user) });
});

export default router;
