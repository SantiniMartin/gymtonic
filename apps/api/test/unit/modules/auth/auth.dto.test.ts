import { describe, expect, it } from 'vitest';
import { AUTH_CONFIG } from '../../../../src/config/auth.js';
import { HttpError } from '../../../../src/lib/http-error.js';
import {
  AuthResponseDto,
  AuthUserResponseDto,
  LoginDto,
  type UserWithMemberProfile,
} from '../../../../src/modules/auth/auth.dto.js';

describe('LoginDto', () => {
  it('normaliza el email y conserva la contraseña', () => {
    const dto = LoginDto.fromBody({
      email: '  Admin@GymTonic.Local  ',
      password: '  Gymtonic123 ',
    });
    expect(dto.email).toBe('admin@gymtonic.local');
    expect(dto.password).toBe('  Gymtonic123 ');
  });

  it('acumula todos los errores cuando email y password son inválidos', () => {
    try {
      LoginDto.fromBody({ email: 'no-es-email', password: '   ' });
      expect.fail('debería lanzar');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
      expect((err as HttpError).details).toEqual([
        'email: debe ser un email válido',
        'password: es obligatoria',
      ]);
    }
  });

  it('rechaza contraseñas que superan el largo máximo', () => {
    const tooLong = 'a'.repeat(AUTH_CONFIG.PASSWORD_MAX_LENGTH + 1);
    expect(() => LoginDto.fromBody({ email: 'admin@gymtonic.local', password: tooLong })).toThrow(
      HttpError,
    );
  });
});

describe('AuthUserResponseDto y AuthResponseDto', () => {
  const baseUser: UserWithMemberProfile = {
    id: '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
    email: 'alumno@gymtonic.local',
    passwordHash: '$argon2id$v=19$secreto',
    firstName: 'Martín',
    lastName: 'Santini',
    phone: '+5491112345678',
    role: 'MEMBER',
    status: 'ACTIVE',
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
    deletedAt: null,
    memberProfile: { onboardingCompleted: true },
  };

  it('no expone passwordHash ni deletedAt y calcula onboardingCompleted para MEMBER', () => {
    const dto = AuthResponseDto.fromEntity('jwt.token.aqui', baseUser);
    expect(dto).toEqual({
      accessToken: 'jwt.token.aqui',
      user: {
        id: baseUser.id,
        email: 'alumno@gymtonic.local',
        firstName: 'Martín',
        lastName: 'Santini',
        fullName: 'Martín Santini',
        phone: '+5491112345678',
        role: 'MEMBER',
        onboardingCompleted: true,
      },
    });
    expect('passwordHash' in dto.user).toBe(false);
    expect('deletedAt' in dto.user).toBe(false);
  });

  it('devuelve onboardingCompleted = null para roles que no son MEMBER', () => {
    const adminUser: UserWithMemberProfile = {
      ...baseUser,
      role: 'ADMIN',
      memberProfile: null,
    };
    const dto = AuthUserResponseDto.fromEntity(adminUser);
    expect(dto.onboardingCompleted).toBeNull();
  });
});
