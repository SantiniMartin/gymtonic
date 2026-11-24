import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import './auth.types.js';

/**
 * Valida el access token (header `Authorization: Bearer <token>`)
 * y carga `req.user` con el id y el rol. Sin token válido → 401.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw HttpError.unauthorized();

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
  } catch {
    throw HttpError.unauthorized('Token inválido o vencido');
  }

  const role = typeof payload === 'string' ? undefined : payload.role;
  if (typeof payload === 'string' || !payload.sub || !Object.values(Role).includes(role)) {
    throw HttpError.unauthorized('Token inválido');
  }

  req.user = { id: payload.sub, role };
  next();
}
