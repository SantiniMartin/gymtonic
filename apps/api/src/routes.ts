import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { trainersRouter } from './modules/trainers/trainers.routes.js';

/** Router raíz de la API (montado en /api). Cada módulo nuevo se registra acá. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/trainers', trainersRouter);
