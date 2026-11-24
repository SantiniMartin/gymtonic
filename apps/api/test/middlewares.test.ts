import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { requireAuth } from '../src/middlewares/require-auth.js';
import { requireRole } from '../src/middlewares/require-role.js';
import '../src/middlewares/auth.types.js';

// Secreto fijo para los tests: así no dependen del archivo .env
vi.mock('../src/config/env.js', () => ({
  env: { JWT_ACCESS_SECRET: 'secreto-de-test' },
}));

const SECRET = 'secreto-de-test';
const res = {} as Response;
const next = vi.fn();

function reqWith(authorization?: string): Request {
  return { headers: { authorization } } as unknown as Request;
}

function statusOf(fn: () => void): number | undefined {
  try {
    fn();
  } catch (error) {
    return (error as { status?: number }).status;
  }
  return undefined;
}

describe('requireAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin token responde 401', () => {
    expect(statusOf(() => requireAuth(reqWith(), res, next as NextFunction))).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('header sin formato Bearer responde 401', () => {
    expect(statusOf(() => requireAuth(reqWith('abc123'), res, next as NextFunction))).toBe(401);
  });

  it('token firmado con otro secreto responde 401', () => {
    const token = jwt.sign({ role: 'MEMBER' }, 'otro-secreto', { subject: 'user-1' });
    expect(statusOf(() => requireAuth(reqWith(`Bearer ${token}`), res, next as NextFunction))).toBe(
      401,
    );
  });

  it('token vencido responde 401', () => {
    const token = jwt.sign({ role: 'MEMBER' }, SECRET, { subject: 'user-1', expiresIn: -10 });
    expect(statusOf(() => requireAuth(reqWith(`Bearer ${token}`), res, next as NextFunction))).toBe(
      401,
    );
  });

  it('token con rol inválido responde 401', () => {
    const token = jwt.sign({ role: 'SUPERUSER' }, SECRET, { subject: 'user-1' });
    expect(statusOf(() => requireAuth(reqWith(`Bearer ${token}`), res, next as NextFunction))).toBe(
      401,
    );
  });

  it('token válido carga req.user y sigue al próximo middleware', () => {
    const token = jwt.sign({ role: 'TRAINER' }, SECRET, { subject: 'user-1' });
    const req = reqWith(`Bearer ${token}`);

    requireAuth(req, res, next as NextFunction);

    expect(req.user).toEqual({ id: 'user-1', role: 'TRAINER' });
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('requireRole', () => {
  beforeEach(() => vi.clearAllMocks());

  function reqWithRole(role?: string): Request {
    return { user: role ? { id: 'user-1', role } : undefined } as unknown as Request;
  }

  it('sin usuario autenticado responde 401', () => {
    expect(statusOf(() => requireRole('ADMIN')(reqWithRole(), res, next as NextFunction))).toBe(
      401,
    );
  });

  it('rol incorrecto responde 403', () => {
    expect(
      statusOf(() => requireRole('ADMIN')(reqWithRole('MEMBER'), res, next as NextFunction)),
    ).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rol permitido sigue al próximo middleware', () => {
    requireRole('ADMIN')(reqWithRole('ADMIN'), res, next as NextFunction);
    expect(next).toHaveBeenCalledOnce();
  });

  it('acepta varios roles', () => {
    requireRole('TRAINER', 'ADMIN')(reqWithRole('TRAINER'), res, next as NextFunction);
    expect(next).toHaveBeenCalledOnce();
  });
});
