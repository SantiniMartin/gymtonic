import rateLimit from 'express-rate-limit';
import { AUTH_CONFIG } from '../config/auth.js';
import { HttpError } from '../lib/http-error.js';

/**
Rate limiter para `POST /api/auth/login`.
Cuenta solo intentos fallidos (`skipSuccessfulRequests: true`) dentro de la ventana.
 */
export const loginRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.LOGIN_WINDOW_MS,
  limit: AUTH_CONFIG.LOGIN_MAX_FAILED_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(HttpError.tooManyRequests('Demasiados intentos de inicio de sesión, intentá más tarde'));
  },
});
