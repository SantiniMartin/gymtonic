import { Prisma, Role, UserStatus } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type { TrainerWithProfile } from './trainers.dto.js';

/**
 * Repository de entrenadores: único lugar donde se consulta la base de datos
 * para este módulo. Los métodos hablan el idioma del negocio ("entrenadores activos"),
 * no el de la base ("users where role = TRAINER").
 */
export class TrainerRepository {
  /** Filtro base: solo entrenadores activos y no eliminados. */
  private activeTrainersWhere(search?: string): Prisma.UserWhereInput {
    return {
      role: Role.TRAINER,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { trainerProfile: { specialty: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
  }

  private readonly include = {
    trainerProfile: { include: { availability: { orderBy: { dayOfWeek: 'asc' } } } },
  } satisfies Prisma.UserInclude;

  async findActive(options: {
    search?: string;
    skip: number;
    take: number;
  }): Promise<{ items: TrainerWithProfile[]; total: number }> {
    const where = this.activeTrainersWhere(options.search);
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        include: this.include,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        skip: options.skip,
        take: options.take,
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  findActiveById(id: string): Promise<TrainerWithProfile | null> {
    return prisma.user.findFirst({
      where: { id, ...this.activeTrainersWhere() },
      include: this.include,
    });
  }
}

export const trainerRepository = new TrainerRepository();
