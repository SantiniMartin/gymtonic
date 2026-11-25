import { Router } from 'express';
import { userController } from './users.controller.js';

export const usersRouter = Router();

// TODO: proteger con requireAuth + requireRole('ADMIN') cuando el PR #40 esté en develop.
usersRouter.get('/', userController.list);
usersRouter.get('/:id', userController.getById);
