import { Router } from 'express';
import { loginRateLimiter } from '../../middlewares/rate-limit.js';
import { requireAuth } from '../../middlewares/require-auth.js';
import { authController } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', requireAuth, authController.me);
