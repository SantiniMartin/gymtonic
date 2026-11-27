import { Router } from 'express';
import { requireAuth } from '../../middlewares/require-auth.js';
import { requireRole } from '../../middlewares/require-role.js';
import { userController } from './users.controller.js';

export const usersRouter = Router();

// Todo lo de /api/admin/users es solo para administradores.
usersRouter.use(requireAuth, requireRole('ADMIN'));

usersRouter.get('/', userController.list);
usersRouter.get('/:id', userController.getById);
usersRouter.post('/', userController.create);
