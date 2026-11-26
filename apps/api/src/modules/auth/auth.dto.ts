import type { MemberProfile, Role, User } from '@prisma/client';
import { AUTH_CONFIG } from '../../config/auth.js';
import { HttpError } from '../../lib/http-error.js';
import { isEmail, isNonEmptyString } from '../../lib/validators.js';

// ───────────────────────── DTOs de entrada ─────────────────────────

/** POST /api/auth/login */
export class LoginDto {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}

  static fromBody(body: any): LoginDto {
    const errors: string[] = [];

    if (!isEmail(body?.email)) {
      errors.push('email: debe ser un email válido');
    }

    if (!isNonEmptyString(body?.password)) {
      errors.push('password: es obligatoria');
    } else if (body.password.length > AUTH_CONFIG.PASSWORD_MAX_LENGTH) {
      errors.push(`password: no puede superar ${AUTH_CONFIG.PASSWORD_MAX_LENGTH} caracteres`);
    }

    if (errors.length > 0) throw HttpError.validation(errors);

    return new LoginDto(body.email.trim().toLowerCase(), body.password);
  }
}

// ───────────────────────── DTOs de salida ──────────────────────────

export type UserWithMemberProfile = User & {
  memberProfile?: Pick<MemberProfile, 'onboardingCompleted'> | null;
};

/** Datos públicos del usuario autenticado (nunca expone passwordHash ni deletedAt). */
export class AuthUserResponseDto {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly fullName: string,
    public readonly phone: string | null,
    public readonly role: Role,
    public readonly onboardingCompleted: boolean | null,
  ) {}

  static fromEntity(user: UserWithMemberProfile): AuthUserResponseDto {
    const onboardingCompleted =
      user.role === 'MEMBER' ? (user.memberProfile?.onboardingCompleted ?? false) : null;

    return new AuthUserResponseDto(
      user.id,
      user.email,
      user.firstName,
      user.lastName,
      `${user.firstName} ${user.lastName}`,
      user.phone,
      user.role,
      onboardingCompleted,
    );
  }
}

/** Respuesta de POST /api/auth/login y POST /api/auth/refresh. */
export class AuthResponseDto {
  constructor(
    public readonly accessToken: string,
    public readonly user: AuthUserResponseDto,
  ) {}

  static fromEntity(accessToken: string, user: UserWithMemberProfile): AuthResponseDto {
    return new AuthResponseDto(accessToken, AuthUserResponseDto.fromEntity(user));
  }
}
