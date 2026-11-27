import { UserStatus } from '@prisma/client';
import { HttpError } from '../../lib/http-error.js';
import {
  hashRefreshToken,
  issueRefreshToken,
  signAccessToken,
  verifyRefreshToken,
} from '../../lib/jwt.js';
import { getDummyPasswordHash, verifyPassword } from '../../lib/password.js';
import { AuthResponseDto, AuthUserResponseDto, LoginDto } from './auth.dto.js';
import { authRepository, type AuthRepository } from './auth.repository.js';

export interface AuthTokensResult {
  response: AuthResponseDto;
  refreshToken: string;
}

/**
 * Lógica de negocio de autenticación:
 * - Login con verificación en tiempo constante y rechazo de usuarios inactivos o eliminados.
 * - Rotación de refresh token con detección de reutilización (revoca toda la familia).
 * - Logout idempotente y consulta del perfil propio (`/auth/me`).
 */
export class AuthService {
  constructor(private readonly repo: AuthRepository = authRepository) {}

  async login(dto: LoginDto): Promise<AuthTokensResult> {
    const user = await this.repo.findActiveUserByEmail(dto.email);

    if (!user) {
      // Ejecutamos argon2 igual para no revelar por tiempo si el email existe o está inactivo.
      const dummyHash = await getDummyPasswordHash();
      await verifyPassword(dummyHash, dto.password);
      throw HttpError.unauthorized('Credenciales inválidas');
    }

    const validPassword = await verifyPassword(user.passwordHash, dto.password);
    if (!validPassword) {
      throw HttpError.unauthorized('Credenciales inválidas');
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role });
    const refresh = issueRefreshToken({ userId: user.id });

    await this.repo.createRefreshToken({
      userId: user.id,
      familyId: refresh.familyId,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    });

    return {
      response: AuthResponseDto.fromEntity(accessToken, user),
      refreshToken: refresh.token,
    };
  }

  async refresh(rawRefreshToken: string | undefined): Promise<AuthTokensResult> {
    if (!rawRefreshToken) {
      throw HttpError.unauthorized('Refresh token requerido');
    }

    const payload = verifyRefreshToken(rawRefreshToken);
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await this.repo.findRefreshTokenByHash(tokenHash);

    if (!stored) {
      // El JWT tiene firma válida pero no existe en la base: revocamos la familia del payload por seguridad.
      await this.repo.revokeRefreshTokenFamily(payload.familyId);
      throw HttpError.unauthorized('Sesión inválida');
    }

    // Reutilización de un refresh token ya rotado o revocado → posible robo de sesión.
    if (stored.revokedAt !== null) {
      await this.repo.revokeRefreshTokenFamily(stored.familyId);
      throw HttpError.unauthorized('Sesión revocada por reutilización de token');
    }

    if (stored.expiresAt <= new Date()) {
      await this.repo.revokeRefreshTokenByHash(tokenHash);
      throw HttpError.unauthorized('Refresh token expirado');
    }

    const { user } = stored;
    if (user.status !== UserStatus.ACTIVE || user.deletedAt !== null) {
      await this.repo.revokeRefreshTokenFamily(stored.familyId);
      throw HttpError.unauthorized('Usuario inactivo o eliminado');
    }

    const nextRefresh = issueRefreshToken({
      userId: user.id,
      familyId: stored.familyId,
    });

    const rotated = await this.repo.rotateRefreshToken({
      currentTokenId: stored.id,
      userId: user.id,
      familyId: stored.familyId,
      newTokenHash: nextRefresh.tokenHash,
      newExpiresAt: nextRefresh.expiresAt,
    });

    if (!rotated) {
      await this.repo.revokeRefreshTokenFamily(stored.familyId);
      throw HttpError.unauthorized('Sesión revocada por reutilización de token');
    }

    const accessToken = signAccessToken({ id: user.id, role: user.role });

    return {
      response: AuthResponseDto.fromEntity(accessToken, user),
      refreshToken: nextRefresh.token,
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await this.repo.revokeRefreshTokenByHash(tokenHash);
  }

  async me(userId: string): Promise<AuthUserResponseDto> {
    const user = await this.repo.findActiveUserById(userId);
    if (!user) {
      throw HttpError.unauthorized('Usuario no encontrado o inactivo');
    }
    return AuthUserResponseDto.fromEntity(user);
  }
}

export const authService = new AuthService();
