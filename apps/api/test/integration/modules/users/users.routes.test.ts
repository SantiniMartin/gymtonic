import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Role } from '@prisma/client';
import { createApp } from '../../../../src/app.js';
import { signAccessToken } from '../../../../src/lib/jwt.js';
import { userRepository } from '../../../../src/modules/users/users.repository.js';

// Reemplazamos el repository: estos tests prueban la protección de las rutas, no la base.
vi.mock('../../../../src/modules/users/users.repository.js', () => ({
  userRepository: { findMany: vi.fn(), findById: vi.fn() },
}));

const USER_ID = '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';

const laura = {
  id: USER_ID,
  email: 'laura.gomez@gymtonic.local',
  passwordHash: 'hash-secreto',
  firstName: 'Laura',
  lastName: 'Gómez',
  phone: null,
  role: 'TRAINER',
  status: 'ACTIVE',
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
  updatedAt: new Date('2026-11-02T10:00:00.000Z'),
  deletedAt: null,
};

function bearer(role: Role): string {
  return `Bearer ${signAccessToken({ id: 'actor-1', role })}`;
}

describe('/api/admin/users (protección y listado)', () => {
  const app = createApp();

  beforeEach(() => vi.clearAllMocks());

  it('sin token responde 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
    expect(userRepository.findMany).not.toHaveBeenCalled();
  });

  it('con rol MEMBER responde 403', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', bearer('MEMBER'));
    expect(res.status).toBe(403);
    expect(userRepository.findMany).not.toHaveBeenCalled();
  });

  it('con rol TRAINER responde 403', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', bearer('TRAINER'));
    expect(res.status).toBe(403);
  });

  it('el detalle sin token también responde 401', async () => {
    const res = await request(app).get(`/api/admin/users/${USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('ADMIN lista usuarios sin exponer passwordHash ni deletedAt', async () => {
    vi.mocked(userRepository.findMany).mockResolvedValue({ items: [laura as never], total: 1 });

    const res = await request(app).get('/api/admin/users').set('Authorization', bearer('ADMIN'));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].email).toBe('laura.gomez@gymtonic.local');
    expect(res.body.items[0]).not.toHaveProperty('passwordHash');
    expect(res.body.items[0]).not.toHaveProperty('deletedAt');
  });

  it('ADMIN con filtros inválidos recibe 400', async () => {
    const res = await request(app)
      .get('/api/admin/users?role=INVALIDO')
      .set('Authorization', bearer('ADMIN'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('ADMIN pide un usuario que no existe y recibe 404', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/admin/users/${USER_ID}`)
      .set('Authorization', bearer('ADMIN'));

    expect(res.status).toBe(404);
  });

  it('ADMIN con un id que no es UUID recibe 400', async () => {
    const res = await request(app)
      .get('/api/admin/users/123')
      .set('Authorization', bearer('ADMIN'));
    expect(res.status).toBe(400);
  });
});
