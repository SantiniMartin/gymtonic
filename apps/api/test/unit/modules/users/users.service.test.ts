import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userRepository } from '../../../../src/modules/users/users.repository.js';
import { userService } from '../../../../src/modules/users/users.service.js';
import { ListUsersQueryDto } from '../../../../src/modules/users/users.dto.js';

// Reemplazamos el repository por funciones simuladas: el servicio se prueba sin base de datos.
vi.mock('../../../../src/modules/users/users.repository.js', () => ({
  userRepository: { findMany: vi.fn(), findById: vi.fn() },
}));

const laura = {
  id: '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
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

describe('UserService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list pagina, pasa los filtros al repository y convierte a DTO', async () => {
    vi.mocked(userRepository.findMany).mockResolvedValue({
      items: [laura as never],
      total: 1,
    });

    const result = await userService.list(
      ListUsersQueryDto.fromQuery({ role: 'TRAINER', search: 'laura', page: '2', pageSize: '5' }),
    );

    expect(userRepository.findMany).toHaveBeenCalledWith({
      role: 'TRAINER',
      status: undefined,
      search: 'laura',
      skip: 5,
      take: 5,
    });
    expect(result.total).toBe(1);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(5);
    expect(result.items[0]?.email).toBe('laura.gomez@gymtonic.local');
  });

  it('la respuesta no expone passwordHash ni deletedAt', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(laura as never);

    const result = await userService.getById(laura.id);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('deletedAt');
    expect(result.createdAt).toBe('2026-11-01T10:00:00.000Z');
  });

  it('getById lanza 404 si no existe o fue eliminado', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);
    await expect(userService.getById(laura.id)).rejects.toMatchObject({ status: 404 });
  });
});
