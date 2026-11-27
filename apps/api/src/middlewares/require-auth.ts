import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { verifyAccessToken } from '../lib/jwt.js';

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
Extrae y valida el Bearer token del header Authorization.
Si es válido, deja `{ id, role }` en `req.user`; si no, lanza 401.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw HttpError.unauthorized('Token de acceso requerido');
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw HttpError.unauthorized('Token de acceso requerido');
  }

  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, role: payload.role };
  next();
};
