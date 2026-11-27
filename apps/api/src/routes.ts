import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { trainersRouter } from './modules/trainers/trainers.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

/** Router raíz de la API (montado en /api). Cada módulo nuevo se registra acá. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/trainers', trainersRouter);
apiRouter.use('/admin/users', usersRouter);
