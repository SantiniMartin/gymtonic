import { describe, expect, it } from 'vitest';
import { CreateUserDto } from '../../../../src/modules/users/users.dto.js';

function errorOf(fn: () => unknown): { status?: number; details?: string[] } | undefined {
  try {
    fn();
  } catch (error) {
    return error as { status?: number; details?: string[] };
  }
  return undefined;
}

const valid = {
  email: '  Nuevo.Alumno@GymTonic.local ',
  password: 'Gymtonic123',
  firstName: '  Ana ',
  lastName: ' Pérez ',
};

describe('CreateUserDto', () => {
  it('normaliza email y nombres, y usa MEMBER y teléfono null por defecto', () => {
    const dto = CreateUserDto.fromBody(valid);

    expect(dto.email).toBe('nuevo.alumno@gymtonic.local');
    expect(dto.firstName).toBe('Ana');
    expect(dto.lastName).toBe('Pérez');
    expect(dto.phone).toBeNull();
    expect(dto.role).toBe('MEMBER');
  });

  it('acepta el rol TRAINER y un teléfono', () => {
    const dto = CreateUserDto.fromBody({ ...valid, role: 'TRAINER', phone: ' 3777-123456 ' });

    expect(dto.role).toBe('TRAINER');
    expect(dto.phone).toBe('3777-123456');
  });

  it('trata un teléfono vacío como null', () => {
    expect(CreateUserDto.fromBody({ ...valid, phone: '' }).phone).toBeNull();
  });

  it('rechaza un body vacío juntando todos los errores', () => {
    const error = errorOf(() => CreateUserDto.fromBody({}));

    expect(error?.status).toBe(400);
    expect(error?.details).toHaveLength(4);
  });

  it('rechaza un email inválido', () => {
    expect(errorOf(() => CreateUserDto.fromBody({ ...valid, email: 'no-es-email' }))?.status).toBe(
      400,
    );
  });

  it('rechaza una contraseña de menos de 8 caracteres', () => {
    expect(errorOf(() => CreateUserDto.fromBody({ ...valid, password: 'corta' }))?.status).toBe(
      400,
    );
  });

  it('rechaza un rol inválido', () => {
    expect(errorOf(() => CreateUserDto.fromBody({ ...valid, role: 'SUPERUSER' }))?.status).toBe(
      400,
    );
  });

  it('rechaza un body que no es un objeto', () => {
    expect(errorOf(() => CreateUserDto.fromBody(undefined))?.status).toBe(400);
  });
});
