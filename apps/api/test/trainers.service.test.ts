import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trainerRepository } from '../src/modules/trainers/trainers.repository.js';
import { trainerService } from '../src/modules/trainers/trainers.service.js';
import { ListTrainersQueryDto } from '../src/modules/trainers/trainers.dto.js';

// Reemplazamos el repository por funciones simuladas: el servicio se prueba sin base de datos.
vi.mock('../src/modules/trainers/trainers.repository.js', () => ({
  trainerRepository: { findActive: vi.fn(), findActiveById: vi.fn() },
}));

const laura = {
  id: '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
  firstName: 'Laura',
  lastName: 'Gómez',
  trainerProfile: { specialty: 'Fuerza', bio: null, availability: [] },
};

describe('TrainerService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('list pagina y convierte a DTO', async () => {
    vi.mocked(trainerRepository.findActive).mockResolvedValue({
      items: [laura as never],
      total: 1,
    });

    const result = await trainerService.list(
      ListTrainersQueryDto.fromQuery({ page: '2', pageSize: '5' }),
    );

    expect(trainerRepository.findActive).toHaveBeenCalledWith({
      search: undefined,
      skip: 5,
      take: 5,
    });
    expect(result.total).toBe(1);
    expect(result.items[0]?.fullName).toBe('Laura Gómez');
  });

  it('getById lanza 404 si no existe', async () => {
    vi.mocked(trainerRepository.findActiveById).mockResolvedValue(null);
    await expect(trainerService.getById(laura.id)).rejects.toMatchObject({ status: 404 });
  });
});
