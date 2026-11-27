import { Role } from '@prisma/client';
import type { Prisma, User, UserStatus } from '@prisma/client';
import { prisma } from '../../db/prisma.js';

export interface FindUsersParams {
  role?: Role;
  status?: UserStatus;
  search?: string;
  skip: number;
  take: number;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
}

export interface UpdateUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
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

  /**
   * Busca por email incluyendo eliminados: el email es único en toda la tabla,
   * así que el de un usuario eliminado también cuenta como ocupado.
   */
  findByEmail(email: string): Promise<{ id: string } | null> {
    return prisma.user.findUnique({ where: { email }, select: { id: true } });
  }

  /**
   * Crea el usuario, el perfil que corresponde a su rol y el registro de auditoría
   * en una sola transacción: si algo falla, no se guarda nada.
   */
  create(data: CreateUserData, actorId: string): Promise<User> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
          ...(data.role === Role.MEMBER && { memberProfile: { create: {} } }),
          ...(data.role === Role.TRAINER && { trainerProfile: { create: {} } }),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'USER_CREATED',
          entity: 'User',
          entityId: user.id,
          diff: { email: user.email, role: user.role },
        },
      });

      return user;
    });
  }

  /**
   * Actualiza los datos básicos y registra en la auditoría qué campos cambiaron
   * (valor anterior y nuevo), todo en una transacción. Si no cambió nada, no escribe.
   * Devuelve null si el usuario no existe o fue eliminado.
   */
  update(id: string, data: UpdateUserData, actorId: string): Promise<User | null> {
    return prisma.$transaction(async (tx) => {
      const current = await tx.user.findFirst({ where: { id, deletedAt: null } });
      if (!current) return null;

      const fields = ['email', 'firstName', 'lastName', 'phone'] as const;
      const changes: Record<string, { from: string | null; to: string | null }> = {};
      for (const field of fields) {
        if (current[field] !== data[field]) {
          changes[field] = { from: current[field], to: data[field] };
        }
      }
      if (Object.keys(changes).length === 0) return current;

      const user = await tx.user.update({ where: { id }, data });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'USER_UPDATED',
          entity: 'User',
          entityId: id,
          diff: changes,
        },
      });

      return user;
    });
  }
}

export const userRepository = new UserRepository();
