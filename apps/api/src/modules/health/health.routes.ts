import { Router } from 'express';
import { prisma } from '../../db/prisma.js';

export const healthRouter = Router();

/** Liveness: el proceso responde. */
healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

/** Readiness: la base de datos responde. */
healthRouter.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});
