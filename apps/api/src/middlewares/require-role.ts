import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';

/**
 * Permite el paso solo si el rol del usuario autenticado está en la lista.
 * Se usa después de `requireAuth` (que carga `req.user`). Rol incorrecto → 403.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw HttpError.unauthorized();
    if (!roles.includes(req.user.role)) throw HttpError.forbidden();
    next();
  };
}
