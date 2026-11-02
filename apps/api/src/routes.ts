import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';

/** Router raíz de la API (montado en /api). Cada fase agrega aquí sus módulos. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
