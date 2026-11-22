import crypto from 'node:crypto';
import type { RefreshToken } from '@prisma/client';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_CONFIG } from '../../../../src/config/auth.js';
import { hashPassword } from '../../../../src/lib/password.js';
import type { UserWithMemberProfile } from '../../../../src/modules/auth/auth.dto.js';
import type { RefreshTokenWithUser } from '../../../../src/modules/auth/auth.repository.js';

/**
 * Estado en memoria que simula las tablas `User` y `RefreshToken` para los tests
 * de integración HTTP con supertest, verificando el ciclo completo:
 * request → rate-limit → controller → DTO → service → repository → cookies/JWT.
 */
const usersStore = new Map<string, UserWithMemberProfile>();
const refreshTokensStore = new Map<string, RefreshToken>();

vi.mock('../../../../src/modules/auth/auth.repository.js', () => {
  return {
    authRepository: {
      findActiveUserByEmail: vi.fn(async (email: string) => {
        for (const u of usersStore.values()) {
          if (u.email === email && u.status === 'ACTIVE' && u.deletedAt === null) {
            return u;
          }
        }
        return null;
      }),
      findActiveUserById: vi.fn(async (id: string) => {
        const u = usersStore.get(id);
        if (!u || u.status !== 'ACTIVE' || u.deletedAt !== null) return null;
        return u;
      }),
      createRefreshToken: vi.fn(
        async (data: {
          userId: string;
          familyId: string;
          tokenHash: string;
          expiresAt: Date;
        }): Promise<RefreshToken> => {
          const record: RefreshToken = {
            id: crypto.randomUUID(),
            userId: data.userId,
            familyId: data.familyId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
            revokedAt: null,
            createdAt: new Date(),
          };
          refreshTokensStore.set(record.id, record);
          return record;
        },
      ),
      findRefreshTokenByHash: vi.fn(
        async (tokenHash: string): Promise<RefreshTokenWithUser | null> => {
          for (const rt of refreshTokensStore.values()) {
            if (rt.tokenHash === tokenHash) {
              const user = usersStore.get(rt.userId);
              if (!user) return null;
              return { ...rt, user };
            }
          }
          return null;
        },
      ),
      rotateRefreshToken: vi.fn(
        async (params: {
          currentTokenId: string;
          userId: string;
          familyId: string;
          newTokenHash: string;
          newExpiresAt: Date;
        }): Promise<RefreshToken | null> => {
          const current = refreshTokensStore.get(params.currentTokenId);
          if (!current || current.revokedAt !== null) return null;
          current.revokedAt = new Date();
          const next: RefreshToken = {
            id: crypto.randomUUID(),
            userId: params.userId,
            familyId: params.familyId,
            tokenHash: params.newTokenHash,
            expiresAt: params.newExpiresAt,
            revokedAt: null,
            createdAt: new Date(),
          };
          refreshTokensStore.set(next.id, next);
          return next;
        },
      ),
      revokeRefreshTokenFamily: vi.fn(async (familyId: string) => {
        const now = new Date();
        for (const rt of refreshTokensStore.values()) {
          if (rt.familyId === familyId && rt.revokedAt === null) {
            rt.revokedAt = now;
          }
        }
      }),
      revokeRefreshTokenByHash: vi.fn(async (tokenHash: string) => {
        const now = new Date();
        for (const rt of refreshTokensStore.values()) {
          if (rt.tokenHash === tokenHash && rt.revokedAt === null) {
            rt.revokedAt = now;
          }
        }
      }),
    },
  };
});

import { createApp } from '../../../../src/app.js';

const SEED_ADMIN_EMAIL = 'admin@gymtonic.local';
const SEED_PASSWORD = 'Gymtonic123';

function extractCookieValue(setCookieHeader: string | string[] | undefined, name: string): string {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const target = cookies.find((c) => c.startsWith(`${name}=`));
  if (!target) throw new Error(`Cookie ${name} no encontrada en Set-Cookie`);
  const [pair] = target.split(';');
  return pair!.slice(name.length + 1);
}

describe('Auth endpoints (integración con supertest)', () => {
  const app = createApp();
  let passwordHash: string;
  let adminUser: UserWithMemberProfile;

  beforeAll(async () => {
    passwordHash = await hashPassword(SEED_PASSWORD);
  });

  beforeEach(() => {
    usersStore.clear();
    refreshTokensStore.clear();

    adminUser = {
      id: '11111111-1111-4111-8111-111111111111',
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Gym Tonic',
      phone: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      memberProfile: null,
    };
    usersStore.set(adminUser.id, adminUser);
  });

  it('POST /api/auth/login con credenciales del seed devuelve accessToken, usuario y setea cookie httpOnly', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '  ADMIN@gymtonic.local ', password: SEED_PASSWORD });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.user).toEqual({
      id: adminUser.id,
      email: SEED_ADMIN_EMAIL,
      firstName: 'Admin',
      lastName: 'Gym Tonic',
      fullName: 'Admin Gym Tonic',
      phone: null,
      role: 'ADMIN',
      onboardingCompleted: null,
    });
    expect(res.body.user.passwordHash).toBeUndefined();

    const setCookie = res.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie);
    expect(cookieStr).toContain(`${AUTH_CONFIG.REFRESH_COOKIE_NAME}=`);
    expect(cookieStr).toContain('HttpOnly');
    expect(cookieStr).toContain('SameSite=Lax');
    expect(cookieStr).toContain(`Path=${AUTH_CONFIG.REFRESH_COOKIE_PATH}`);
    expect(refreshTokensStore.size).toBe(1);
  });

  it('POST /api/auth/login rechaza contraseña incorrecta con 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.2')
      .send({ email: SEED_ADMIN_EMAIL, password: 'PasswordIncorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(refreshTokensStore.size).toBe(0);
  });

  it('POST /api/auth/login rechaza usuarios INACTIVE o eliminados (soft delete)', async () => {
    const inactive: UserWithMemberProfile = {
      ...adminUser,
      id: '22222222-2222-4222-8222-222222222222',
      email: 'inactivo@gymtonic.local',
      status: 'INACTIVE',
    };
    const deleted: UserWithMemberProfile = {
      ...adminUser,
      id: '33333333-3333-4333-8333-333333333333',
      email: 'eliminado@gymtonic.local',
      deletedAt: new Date(),
    };
    usersStore.set(inactive.id, inactive);
    usersStore.set(deleted.id, deleted);

    const resInactive = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.3')
      .send({ email: inactive.email, password: SEED_PASSWORD });
    expect(resInactive.status).toBe(401);

    const resDeleted = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.4')
      .send({ email: deleted.email, password: SEED_PASSWORD });
    expect(resDeleted.status).toBe(401);
  });

  it('POST /api/auth/refresh rota el refresh token; reusar el viejo devuelve 401 y revoca toda la familia', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: SEED_ADMIN_EMAIL, password: SEED_PASSWORD });
    const firstRefresh = extractCookieValue(
      loginRes.headers['set-cookie'],
      AUTH_CONFIG.REFRESH_COOKIE_NAME,
    );

    // 1) Rotación normal con el primer refresh token
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`${AUTH_CONFIG.REFRESH_COOKIE_NAME}=${firstRefresh}`]);

    expect(refreshRes.status).toBe(200);
    expect(typeof refreshRes.body.accessToken).toBe('string');
    const secondRefresh = extractCookieValue(
      refreshRes.headers['set-cookie'],
      AUTH_CONFIG.REFRESH_COOKIE_NAME,
    );
    expect(secondRefresh).not.toBe(firstRefresh);

    // 2) Reutilización del primer refresh token (ya rotado) → 401 y revoca toda la familia
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`${AUTH_CONFIG.REFRESH_COOKIE_NAME}=${firstRefresh}`]);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe('UNAUTHORIZED');

    // 3) El segundo refresh token (que era válido) también quedó revocado al caer la familia
    const afterReuseRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`${AUTH_CONFIG.REFRESH_COOKIE_NAME}=${secondRefresh}`]);

    expect(afterReuseRes.status).toBe(401);
    for (const rt of refreshTokensStore.values()) {
      expect(rt.revokedAt).not.toBeNull();
    }
  });

  it('POST /api/auth/logout revoca el refresh token y limpia la cookie', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: SEED_ADMIN_EMAIL, password: SEED_PASSWORD });
    const refreshCookie = extractCookieValue(
      loginRes.headers['set-cookie'],
      AUTH_CONFIG.REFRESH_COOKIE_NAME,
    );

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`${AUTH_CONFIG.REFRESH_COOKIE_NAME}=${refreshCookie}`]);

    expect(logoutRes.status).toBe(204);

    // Intentar refrescar con el token revocado devuelve 401
    const refreshAfterLogout = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [`${AUTH_CONFIG.REFRESH_COOKIE_NAME}=${refreshCookie}`]);

    expect(refreshAfterLogout.status).toBe(401);
  });

  it('GET /api/auth/me devuelve el perfil autenticado y 401 sin token o con token inválido', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: SEED_ADMIN_EMAIL, password: SEED_PASSWORD });
    const { accessToken } = loginRes.body as { accessToken: string };

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(SEED_ADMIN_EMAIL);
    expect(meRes.body.role).toBe('ADMIN');

    const unauthRes = await request(app).get('/api/auth/me');
    expect(unauthRes.status).toBe(401);

    const badTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.invalido.123');
    expect(badTokenRes.status).toBe(401);
  });

  it('POST /api/auth/login aplica rate limit tras superar los intentos fallidos permitidos', async () => {
    const ip = '203.0.113.99';
    for (let i = 0; i < AUTH_CONFIG.LOGIN_MAX_FAILED_ATTEMPTS; i++) {
      const attempt = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: SEED_ADMIN_EMAIL, password: 'wrong-password' });
      expect(attempt.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: SEED_ADMIN_EMAIL, password: 'wrong-password' });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});
