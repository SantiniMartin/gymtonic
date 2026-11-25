import type { Prisma, Role, User, UserStatus } from '@prisma/client';
import { prisma } from '../../db/prisma.js';

export interface FindUsersParams {
  role?: Role;
  status?: UserStatus;
  search?: string;
  skip: number;
  take: number;
}

export class UserRepository {
  /** Lista usuarios no eliminados, con filtros opcionales y búsqueda por nombre o email. */
  async findMany(params: FindUsersParams): Promise<{ items: User[]; total: number }> {
    const { role, status, search, skip, take } = params;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  /** Devuelve el usuario si existe y no fue eliminado; si no, null. */
  findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  }
}

export const userRepository = new UserRepository();
