import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { AUTH_CONFIG } from '../config/auth.js';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  familyId: string;
  jti: string;
  type: 'refresh';
}

/** Firma un access token corto (15 min) para enviar en el header Authorization. */
export function signAccessToken(user: { id: string; role: Role }): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    type: 'access',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_TTL_SECONDS,
  });
}

/** Verifica y decodifica un access token; lanza 401 si es inválido o venció. */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    });
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      decoded.type !== 'access' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.role !== 'string'
    ) {
      throw HttpError.unauthorized('Token de acceso inválido');
    }
    return {
      sub: decoded.sub,
      role: decoded.role as Role,
      type: 'access',
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw HttpError.unauthorized('Token de acceso inválido o expirado');
  }
}

/**
Firma un refresh token con un `jti` aleatorio único dentro de la familia `familyId`.
Devuelve también la fecha de expiración y el hash SHA-256 para persistir en la base.
 */
export function issueRefreshToken(params: { userId: string; familyId?: string }): {
  token: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
} {
  const familyId = params.familyId ?? crypto.randomUUID();
  const jti = crypto.randomUUID();
  const payload: RefreshTokenPayload = {
    sub: params.userId,
    familyId,
    jti,
    type: 'refresh',
  };
  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: AUTH_CONFIG.REFRESH_TOKEN_TTL_SECONDS,
  });
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_TTL_SECONDS * 1000);
  return {
    token,
    tokenHash: hashRefreshToken(token),
    familyId,
    expiresAt,
  };
}

/** Verifica la firma y vigencia de un refresh token; lanza 401 si no es válido. */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    });
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      decoded.type !== 'refresh' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.familyId !== 'string' ||
      typeof decoded.jti !== 'string'
    ) {
      throw HttpError.unauthorized('Refresh token inválido');
    }
    return {
      sub: decoded.sub,
      familyId: decoded.familyId,
      jti: decoded.jti,
      type: 'refresh',
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw HttpError.unauthorized('Refresh token inválido o expirado');
  }
}

/** Hash determinístico (SHA-256 hex) del refresh token para guardar/buscar en la base. */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
