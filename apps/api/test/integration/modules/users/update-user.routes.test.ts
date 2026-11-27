import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Role } from '@prisma/client';
import { createApp } from '../../../../src/app.js';
import { signAccessToken } from '../../../../src/lib/jwt.js';
import { userRepository } from '../../../../src/modules/users/users.repository.js';

// Reemplazamos el repository: estos tests prueban HTTP, no la base.
vi.mock('../../../../src/modules/users/users.repository.js', () => ({
  userRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const USER_ID = '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';

const current = {
  id: USER_ID,
  email: 'ana.perez@gymtonic.local',
  passwordHash: 'hash-secreto',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: null,
  role: 'MEMBER',
  status: 'ACTIVE',
  createdAt: new Date('2026-11-01T10:00:00.000Z'),
  updatedAt: new Date('2026-11-01T10:00:00.000Z'),
  deletedAt: null,
};

const updated = { ...current, firstName: 'Anita', phone: '3777-123456' };

const validBody = {
  email: 'ana.perez@gymtonic.local',
  firstName: 'Anita',
  lastName: 'Pérez',
  phone: '3777-123456',
};

function bearer(role: Role): string {
  return `Bearer ${signAccessToken({ id: 'actor-1', role })}`;
}

describe('PUT /api/admin/users/:id', () => {
  const app = createApp();

  beforeEach(() => vi.clearAllMocks());

  it('sin token responde 401', async () => {
    const res = await request(app).put(`/api/admin/users/${USER_ID}`).send(validBody);
    expect(res.status).toBe(401);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('con rol TRAINER responde 403', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${USER_ID}`)
      .set('Authorization', bearer('TRAINER'))
      .send(validBody);
    expect(res.status).toBe(403);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('con un id que no es UUID responde 400', async () => {
    const res = await request(app)
      .put('/api/admin/users/123')
      .set('Authorization', bearer('ADMIN'))
      .send(validBody);
    expect(res.status).toBe(400);
  });

  it('con datos inválidos responde 400', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${USER_ID}`)
      .set('Authorization', bearer('ADMIN'))
      .send({ email: 'no-es-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('si el usuario no existe responde 404', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/admin/users/${USER_ID}`)
      .set('Authorization', bearer('ADMIN'))
      .send(validBody);

    expect(res.status).toBe(404);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('si el email es de otro usuario responde 409', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(current as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: 'otro-usuario' });

    const res = await request(app)
      .put(`/api/admin/users/${USER_ID}`)
      .set('Authorization', bearer('ADMIN'))
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('ADMIN edita: responde 200 sin datos sensibles y registra al actor', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(current as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: USER_ID });
    vi.mocked(userRepository.update).mockResolvedValue(updated as never);

    const res = await request(app)
      .put(`/api/admin/users/${USER_ID}`)
      .set('Authorization', bearer('ADMIN'))
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Anita');
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).not.toHaveProperty('deletedAt');
    expect(userRepository.update).toHaveBeenCalledWith(USER_ID, validBody, 'actor-1');
  });

  it('ignora role y password si vienen en el body', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(current as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.update).mockResolvedValue(updated as never);

    await request(app)
      .put(`/api/admin/users/${USER_ID}`)
      .set('Authorization', bearer('ADMIN'))
      .send({ ...validBody, role: 'ADMIN', password: 'otra-clave-123' });

    const [, data] = vi.mocked(userRepository.update).mock.calls[0]!;
    expect(data).toEqual(validBody);
    expect(data).not.toHaveProperty('role');
    expect(data).not.toHaveProperty('password');
  });
});
