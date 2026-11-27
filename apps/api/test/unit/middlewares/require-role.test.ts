import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { requireRole } from '../../../src/middlewares/require-role.js';

const res = {} as Response;
const next = vi.fn() as unknown as NextFunction;

function reqWithRole(role?: string): Request {
  return { user: role ? { id: 'user-1', role } : undefined } as unknown as Request;
}

function statusOf(fn: () => void): number | undefined {
  try {
    fn();
  } catch (error) {
    return (error as { status?: number }).status;
  }
  return undefined;
}

describe('requireRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin usuario autenticado responde 401', () => {
    expect(statusOf(() => requireRole('ADMIN')(reqWithRole(), res, next))).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rol incorrecto responde 403', () => {
    expect(statusOf(() => requireRole('ADMIN')(reqWithRole('MEMBER'), res, next))).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rol permitido sigue al próximo middleware', () => {
    requireRole('ADMIN')(reqWithRole('ADMIN'), res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('acepta varios roles', () => {
    requireRole('TRAINER', 'ADMIN')(reqWithRole('TRAINER'), res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('un rol que no está en la lista responde 403 aunque exista otro permitido', () => {
    expect(statusOf(() => requireRole('TRAINER', 'ADMIN')(reqWithRole('MEMBER'), res, next))).toBe(
      403,
    );
  });
});