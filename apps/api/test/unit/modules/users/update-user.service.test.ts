import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateUserDto } from '../../../../src/modules/users/users.dto.js';
import { userRepository } from '../../../../src/modules/users/users.repository.js';
import { userService } from '../../../../src/modules/users/users.service.js';

// Reemplazamos el repository: el servicio se prueba sin base de datos.
vi.mock('../../../../src/modules/users/users.repository.js', () => ({
  userRepository: { findById: vi.fn(), findByEmail: vi.fn(), update: vi.fn() },
}));

const USER_ID = '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';
const ACTOR_ID = '9a8b7c6d-1d2a-4c3b-9e8f-0a1b2c3d4e5f';

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

const dto = UpdateUserDto.fromBody({
  email: 'ana.perez@gymtonic.local',
  firstName: 'Anita',
  lastName: 'Pérez',
  phone: '3777-123456',
});

describe('UserService.update', () => {
  beforeEach(() => vi.clearAllMocks());

  it('actualiza los datos y no expone passwordHash ni deletedAt', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(current as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: USER_ID });
    vi.mocked(userRepository.update).mockResolvedValue(updated as never);

    const result = await userService.update(USER_ID, dto, ACTOR_ID);

    expect(userRepository.update).toHaveBeenCalledWith(
      USER_ID,
      {
        email: 'ana.perez@gymtonic.local',
        firstName: 'Anita',
        lastName: 'Pérez',
        phone: '3777-123456',
      },
      ACTOR_ID,
    );
    expect(result.firstName).toBe('Anita');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('permite guardar el mismo email que ya tiene el usuario', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(current as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: USER_ID });
    vi.mocked(userRepository.update).mockResolvedValue(updated as never);

    await expect(userService.update(USER_ID, dto, ACTOR_ID)).resolves.toBeDefined();
  });

  it('permite cambiar a un email que nadie usa', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(current as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.update).mockResolvedValue(updated as never);

    await expect(userService.update(USER_ID, dto, ACTOR_ID)).resolves.toBeDefined();
  });

  it('lanza 404 si el usuario no existe o fue eliminado y no escribe nada', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    await expect(userService.update(USER_ID, dto, ACTOR_ID)).rejects.toMatchObject({
      status: 404,
    });
    expect(userRepository.findByEmail).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('lanza 409 si el email pertenece a otro usuario y no escribe nada', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(current as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: 'otro-usuario' });

    await expect(userService.update(USER_ID, dto, ACTOR_ID)).rejects.toMatchObject({
      status: 409,
    });
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('lanza 404 si el usuario desaparece justo antes de guardar', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(current as never);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.update).mockResolvedValue(null);

    await expect(userService.update(USER_ID, dto, ACTOR_ID)).rejects.toMatchObject({
      status: 404,
    });
  });
});
