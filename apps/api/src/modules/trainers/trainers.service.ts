import { HttpError } from '../../lib/http-error.js';
import type { PaginatedResponseDto } from '../../lib/pagination.js';
import { ListTrainersQueryDto, TrainerResponseDto } from './trainers.dto.js';
import { trainerRepository } from './trainers.repository.js';

/**
 * Lógica de negocio de entrenadores.
 * Recibe DTOs de entrada, usa el repository y devuelve DTOs de salida.
 * No sabe nada de Express (req/res) ni de Prisma.
 */
export class TrainerService {
  async list(query: ListTrainersQueryDto): Promise<PaginatedResponseDto<TrainerResponseDto>> {
    const { items, total } = await trainerRepository.findActive({
      search: query.search,
      skip: query.pagination.skip,
      take: query.pagination.pageSize,
    });

    return {
      items: items.map(TrainerResponseDto.fromEntity),
      total,
      page: query.pagination.page,
      pageSize: query.pagination.pageSize,
    };
  }

  async getById(id: string): Promise<TrainerResponseDto> {
    const trainer = await trainerRepository.findActiveById(id);
    if (!trainer) throw HttpError.notFound('Entrenador no encontrado');
    return TrainerResponseDto.fromEntity(trainer);
  }
}

export const trainerService = new TrainerService();
