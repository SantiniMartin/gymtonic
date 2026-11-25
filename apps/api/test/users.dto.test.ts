import { describe, expect, it } from 'vitest';
import { ListUsersQueryDto, UserIdParamsDto } from '../src/modules/users/users.dto.js';

function errorOf(fn: () => unknown): { status?: number; details?: string[] } | undefined {
  try {
    fn();
  } catch (error) {
    return error as { status?: number; details?: string[] };
  }
  return undefined;
}

describe('ListUsersQueryDto', () => {
  it('usa valores por defecto si no hay query', () => {
    const dto = ListUsersQueryDto.fromQuery({});

    expect(dto.pagination.page).toBe(1);
    expect(dto.pagination.pageSize).toBe(20);
    expect(dto.role).toBeUndefined();
    expect(dto.status).toBeUndefined();
    expect(dto.search).toBeUndefined();
  });

  it('acepta un rol válido, pagina y limpia el texto de búsqueda', () => {
    const dto = ListUsersQueryDto.fromQuery({ role: 'TRAINER', search: '  laura ', page: '2' });

    expect(dto.role).toBe('TRAINER');
    expect(dto.search).toBe('laura');
    expect(dto.pagination.page).toBe(2);
    expect(dto.pagination.skip).toBe(20);
  });

  it('ignora filtros vacíos', () => {
    const dto = ListUsersQueryDto.fromQuery({ role: '', status: '', search: '   ' });

    expect(dto.role).toBeUndefined();
    expect(dto.status).toBeUndefined();
    expect(dto.search).toBeUndefined();
  });

  it('rechaza rol y estado inválidos juntando todos los errores', () => {
    const error = errorOf(() => ListUsersQueryDto.fromQuery({ role: 'X', status: 'Y' }));

    expect(error?.status).toBe(400);
    expect(error?.details).toHaveLength(2);
  });

  it('rechaza una página inválida', () => {
    expect(errorOf(() => ListUsersQueryDto.fromQuery({ page: '0' }))?.status).toBe(400);
  });
});

describe('UserIdParamsDto', () => {
  it('acepta un UUID válido', () => {
    const id = '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f';
    expect(UserIdParamsDto.fromParams({ id }).id).toBe(id);
  });

  it('rechaza un id que no es UUID', () => {
    expect(errorOf(() => UserIdParamsDto.fromParams({ id: '123' }))?.status).toBe(400);
  });
});
