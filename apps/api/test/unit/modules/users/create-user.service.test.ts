import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../../../../src/lib/password.js';
import { CreateUserDto } from '../../../../src/modules/users/users.dto.js';
import { userRepository } from '../../../../src/modules/users/users.repository.js';
import { userService } from '../../../../src/modules/users/users.service.js';

// Reemplazamos el repository y el hasheo: el servicio se prueba sin base de datos ni argon2.
vi.mock('../../../../src/modules/users/users.repository.js', () => ({
  userRepository: { findByEmail: vi.fn(), create: vi.fn() },
}));
vi.mock('../../../../src/lib/password.js', () => ({ hashPassword: vi.fn() }));

const ACTOR_ID = '9a8b7c6d-1d2a-4c3b-9e8f-0a1b2c3d4e5f';

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

const dto = CreateUserDto.fromBody({
  email: 'nuevo.alumno@gymtonic.local',
  password: 'Gymtonic123',
  firstName: 'Ana',
  lastName: 'Pérez',
});

describe('UserService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hashPassword).mockResolvedValue('hash-mock');
  });

  it('hashea la contraseña, crea el usuario y no expone datos sensibles', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.create).mockResolvedValue(created as never);

    const result = await userService.create(dto, ACTOR_ID);

    expect(hashPassword).toHaveBeenCalledWith('Gymtonic123');
    expect(userRepository.create).toHaveBeenCalledWith(
      {
        email: 'nuevo.alumno@gymtonic.local',
        passwordHash: 'hash-mock',
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: null,
        role: 'MEMBER',
      },
      ACTOR_ID,
    );
    expect(result.email).toBe('nuevo.alumno@gymtonic.local');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('la contraseña en texto plano nunca llega al repository', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.create).mockResolvedValue(created as never);

    await userService.create(dto, ACTOR_ID);

    const [data] = vi.mocked(userRepository.create).mock.calls[0]!;
    expect(JSON.stringify(data)).not.toContain('Gymtonic123');
  });

  it('lanza 409 si el email ya existe y no guarda nada', async () => {
    vi.mocked(userRepository.findByEmail).mockResolvedValue({ id: 'otro-usuario' });

    await expect(userService.create(dto, ACTOR_ID)).rejects.toMatchObject({ status: 409 });
    expect(hashPassword).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
