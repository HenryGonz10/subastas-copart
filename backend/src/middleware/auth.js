import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, name: user.firstName }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return { id: Number(payload.sub) };
  } catch {
    return null;
  }
}

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export function requireAuth(req, _res, next) {
  const token = readBearer(req);
  const user = token && verifyToken(token);
  if (!user) return next(new HttpError(401, 'Debes iniciar sesión para realizar esta acción'));
  req.user = user;
  next();
}

export function optionalAuth(req, _res, next) {
  const token = readBearer(req);
  req.user = (token && verifyToken(token)) || null;
  next();
}
