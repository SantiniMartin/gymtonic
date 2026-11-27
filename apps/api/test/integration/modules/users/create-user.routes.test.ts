import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Role } from '@prisma/client';
import { createApp } from '../../../../src/app.js';
import { signAccessToken } from '../../../../src/lib/jwt.js';
import { userRepository } from '../../../../src/modules/users/users.repository.js';

// Reemplazamos el repository y el hasheo: estos tests prueban HTTP, no la base ni argon2.
vi.mock('../../../../src/modules/users/users.repository.js', () => ({
  userRepository: { findMany: vi.fn(), findById: vi.fn(), findByEmail: vi.fn(), create: vi.fn() },
}));
vi.mock('../../../../src/lib/password.js', () => ({ hashPassword: vi.fn() }));

const created = {
  id: '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
  email: 'nuevo.alumno@gymtonic.local',
  passwordHash: 'hash-mock',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: null,
  role: 'MEMBER',
  status: 'ACTIVE',
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
  updatedAt: new Date('2026-11-01T10:00:00.000Z'),
  deletedAt: null,
};

const validBody = {
  email: 'nuevo.alumno@gymtonic.local',
  password: 'Gymtonic123',
  firstName: 'Ana',
  lastName: 'Pérez',
};

function bearer(role: Role): string {
  return `Bearer ${signAccessToken({ id: 'actor-1', role })}`;
}

describe('POST /api/admin/users', () => {
  const app = createApp();

  beforeEach(() => vi.clearAllMocks());

  it('sin token responde 401', async () => {
    const res = await request(app).post('/api/admin/users').send(validBody);
    expect(res.status).toBe(401);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('con rol MEMBER responde 403', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', bearer('MEMBER'))
      .send(validBody);
    expect(res.status).toBe(403);
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('con datos inválidos responde 400', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', bearer('ADMIN'))
      .send({ email: 'no-es-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('con un email que ya existe responde 409', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: 'otro-usuario' });

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', bearer('ADMIN'))
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('ADMIN crea un usuario: responde 201 sin datos sensibles y registra al actor', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.create).mockResolvedValue(created as never);

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', bearer('ADMIN'))
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('nuevo.alumno@gymtonic.local');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('deletedAt');
    expect(userRepository.create).toHaveBeenCalledWith(expect.anything(), 'actor-1');
  });
});
