import { describe, expect, it } from 'vitest';
import { UpdateUserDto } from '../../../../src/modules/users/users.dto.js';

function errorOf(fn: () => unknown): { status?: number; details?: string[] } | undefined {
  try {
    fn();
  } catch (error) {
    return error as { status?: number; details?: string[] };
  }
  return undefined;
}

const valid = {
  email: '  Ana.Perez@GymTonic.local ',
  firstName: '  Ana ',
  lastName: ' Pérez ',
};

describe('UpdateUserDto', () => {
  it('normaliza email y nombres, y usa teléfono null por defecto', () => {
    const dto = UpdateUserDto.fromBody(valid);

    expect(dto.email).toBe('ana.perez@gymtonic.local');
    expect(dto.firstName).toBe('Ana');
    expect(dto.lastName).toBe('Pérez');
    expect(dto.phone).toBeNull();
  });

  it('acepta un teléfono y lo limpia', () => {
    expect(UpdateUserDto.fromBody({ ...valid, phone: ' 3777-123456 ' }).phone).toBe('3777-123456');
  });

  it('trata un teléfono vacío como null', () => {
    expect(UpdateUserDto.fromBody({ ...valid, phone: '' }).phone).toBeNull();
  });

  it('ignora campos que no se editan por acá (rol, estado, contraseña)', () => {
    const dto = UpdateUserDto.fromBody({
      ...valid,
      role: 'ADMIN',
      status: 'SUSPENDED',
      password: 'otra-clave-123',
    });

    expect(dto).not.toHaveProperty('role');
    expect(dto).not.toHaveProperty('status');
    expect(dto).not.toHaveProperty('password');
  });

  it('rechaza un body vacío juntando todos los errores', () => {
    const error = errorOf(() => UpdateUserDto.fromBody({}));

    expect(error?.status).toBe(400);
    expect(error?.details).toHaveLength(3);
  });

  it('rechaza un email inválido', () => {
    expect(errorOf(() => UpdateUserDto.fromBody({ ...valid, email: 'no-es-email' }))?.status).toBe(
      400,
    );
  });

  it('rechaza un teléfono demasiado largo', () => {
    expect(errorOf(() => UpdateUserDto.fromBody({ ...valid, phone: '1'.repeat(31) }))?.status).toBe(
      400,
    );
  });

  it('rechaza un body que no es un objeto', () => {
    expect(errorOf(() => UpdateUserDto.fromBody(undefined))?.status).toBe(400);
  });
});
