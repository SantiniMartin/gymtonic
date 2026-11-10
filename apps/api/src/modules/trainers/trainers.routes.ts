import { Router } from 'express';
import { trainerController } from './trainers.controller.js';

export const trainersRouter = Router();

// TODO (issue #4): proteger con requireAuth cuando exista la autenticación.
trainersRouter.get('/', trainerController.list);
trainersRouter.get('/:id', trainerController.getById);
