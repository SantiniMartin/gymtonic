import { Role, UserStatus } from '@prisma/client';
import type { User } from '@prisma/client';
import { HttpError } from '../../lib/http-error.js';
import { PaginationDto } from '../../lib/pagination.js';
import { isEmail, isNonEmptyString, isOneOf, isUuid } from '../../lib/validators.js';

// ── Entrada ──

/** GET /api/admin/users?role=&status=&search=&page=&pageSize= */
export class ListUsersQueryDto {
  constructor(
    public readonly pagination: PaginationDto,
    public readonly role?: Role,
    public readonly status?: UserStatus,
    public readonly search?: string,
  ) {}

  static fromQuery(query: Record<string, unknown>): ListUsersQueryDto {
    const pagination = PaginationDto.fromQuery(query);
    const errors: string[] = [];

    const rawRole = query.role === '' ? undefined : query.role;
    const rawStatus = query.status === '' ? undefined : query.status;
    const rawSearch = query.search;

    const roles = Object.values(Role);
    const statuses = Object.values(UserStatus);

    if (rawRole !== undefined && !isOneOf(rawRole, roles)) {
      errors.push(`role: debe ser uno de ${roles.join(', ')}`);
    }
    if (rawStatus !== undefined && !isOneOf(rawStatus, statuses)) {
      errors.push(`status: debe ser uno de ${statuses.join(', ')}`);
    }
    if (rawSearch !== undefined && typeof rawSearch !== 'string') {
      errors.push('search: debe ser texto');
    }
    if (errors.length > 0) throw HttpError.validation(errors);

    const search = typeof rawSearch === 'string' && rawSearch.trim() ? rawSearch.trim() : undefined;
    return new ListUsersQueryDto(
      pagination,
      rawRole as Role | undefined,
      rawStatus as UserStatus | undefined,
      search,
    );
  }
}

/** Parámetro :id de las rutas /api/admin/users/:id */
export class UserIdParamsDto {
  constructor(public readonly id: string) {}

  static fromParams(params: Record<string, unknown>): UserIdParamsDto {
    if (!isUuid(params.id)) throw HttpError.validation(['id: debe ser un UUID válido']);
    return new UserIdParamsDto(params.id);
  }
}

/** POST /api/admin/users */
export class CreateUserDto {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly phone: string | null,
    public readonly role: Role,
  ) {}

  static fromBody(body: any): CreateUserDto {
    const errors: string[] = [];
    const roles = Object.values(Role);

    if (!isEmail(body?.email)) errors.push('email: debe ser un email válido');
    if (typeof body?.password !== 'string' || body.password.length < 8) {
      errors.push('password: debe tener al menos 8 caracteres');
    } else if (body.password.length > 128) {
      errors.push('password: no puede superar los 128 caracteres');
    }
    if (!isNonEmptyString(body?.firstName)) errors.push('firstName: es obligatorio');
    if (!isNonEmptyString(body?.lastName)) errors.push('lastName: es obligatorio');

    const hasPhone = body?.phone !== undefined && body?.phone !== null && body?.phone !== '';
    if (hasPhone && (!isNonEmptyString(body.phone) || body.phone.trim().length > 30)) {
      errors.push('phone: debe ser texto de hasta 30 caracteres');
    }

    const role = body?.role ?? Role.MEMBER;
    if (!isOneOf(role, roles)) errors.push(`role: debe ser uno de ${roles.join(', ')}`);

    if (errors.length > 0) throw HttpError.validation(errors);

    return new CreateUserDto(
      body.email.trim().toLowerCase(),
      body.password,
      body.firstName.trim(),
      body.lastName.trim(),
      hasPhone ? body.phone.trim() : null,
      role as Role,
    );
  }
}

/** PUT /api/admin/users/:id (el rol y el estado tienen sus propios endpoints) */
export class UpdateUserDto {
  constructor(
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly phone: string | null,
  ) {}

  static fromBody(body: any): UpdateUserDto {
    const errors: string[] = [];

    if (!isEmail(body?.email)) errors.push('email: debe ser un email válido');
    if (!isNonEmptyString(body?.firstName)) errors.push('firstName: es obligatorio');
    if (!isNonEmptyString(body?.lastName)) errors.push('lastName: es obligatorio');

    const hasPhone = body?.phone !== undefined && body?.phone !== null && body?.phone !== '';
    if (hasPhone && (!isNonEmptyString(body.phone) || body.phone.trim().length > 30)) {
      errors.push('phone: debe ser texto de hasta 30 caracteres');
    }

    if (errors.length > 0) throw HttpError.validation(errors);

    return new UpdateUserDto(
      body.email.trim().toLowerCase(),
      body.firstName.trim(),
      body.lastName.trim(),
      hasPhone ? body.phone.trim() : null,
    );
  }
}

// ── Salida ──

/** Nunca incluye passwordHash ni deletedAt. */
export class UserResponseDto {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly phone: string | null,
    public readonly role: Role,
    public readonly status: UserStatus,
    public readonly createdAt: string,
    public readonly updatedAt: string,
  ) {}

  static fromEntity(u: User): UserResponseDto {
    return new UserResponseDto(
      u.id,
      u.email,
      u.firstName,
      u.lastName,
      u.phone,
      u.role,
      u.status,
      u.createdAt.toISOString(),
      u.updatedAt.toISOString(),
    );
  }
}
