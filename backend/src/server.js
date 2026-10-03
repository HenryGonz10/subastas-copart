import http from 'node:http';
import { config } from './config.js';
import { prisma } from './db.js';
import { createApp } from './app.js';
import { initSocket } from './realtime/socket.js';
import { startScheduler } from './services/scheduler.service.js';

const app = createApp();
const server = http.createServer(app);
initSocket(server);
startScheduler();

server.listen(config.port, () => {
  console.log(`API de subastas escuchando en http://localhost:${config.port}`);
});

const shutdown = async () => {
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
