import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalogs.routes.js';
import vehicleRoutes from './routes/vehicles.routes.js';
import photoRoutes from './routes/photos.routes.js';
import { errorHandler, notFound } from './utils/errors.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => res.json({ name: 'Subastas Copart API', status: 'ok' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', serverTime: new Date() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/catalogs', catalogRoutes);
  app.use('/api/vehicles', vehicleRoutes);
  app.use('/api/photos', photoRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
