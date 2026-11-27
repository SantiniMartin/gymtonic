import { Prisma, type RefreshToken, UserStatus } from '@prisma/client';
import { prisma } from '../../db/prisma.js';
import type { UserWithMemberProfile } from './auth.dto.js';

export type RefreshTokenWithUser = RefreshToken & {
  user: UserWithMemberProfile;
};

/**
 * Repository de autenticación: consultas de usuarios activos y gestión de
 * refresh tokens (creación, rotación atómica y revocación por token o por familia).
 */
export class AuthRepository {
  private readonly userInclude = {
    memberProfile: { select: { onboardingCompleted: true } },
  } satisfies Prisma.UserInclude;

  findActiveUserByEmail(email: string): Promise<UserWithMemberProfile | null> {
    return prisma.user.findFirst({
      where: {
        email,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      include: this.userInclude,
    });
  }

  findActiveUserById(id: string): Promise<UserWithMemberProfile | null> {
    return prisma.user.findFirst({
      where: {
        id,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      include: this.userInclude,
    });
  }

  createRefreshToken(data: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenWithUser | null> {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: this.userInclude },
      },
    });
  }

  /**
   * Rota un refresh token de manera atómica:
   * - Marca `revokedAt` en el token anterior solo si seguía activo (`revokedAt: null`).
   * - Si otro request ya lo había consumido en paralelo, devuelve `null` para que
   *   el servicio trate la carrera como reutilización y revoque la familia.
   * - Inserta el nuevo refresh token dentro de la misma `familyId`.
   */
  async rotateRefreshToken(params: {
    currentTokenId: string;
    userId: string;
    familyId: string;
    newTokenHash: string;
    newExpiresAt: Date;
  }): Promise<RefreshToken | null> {
    return prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: params.currentTokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (revoked.count === 0) {
        return null;
      }

      return tx.refreshToken.create({
        data: {
          userId: params.userId,
          familyId: params.familyId,
          tokenHash: params.newTokenHash,
          expiresAt: params.newExpiresAt,
        },
      });
    });
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeRefreshTokenByHash(tokenHash: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
