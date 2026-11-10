import { describe, expect, it } from 'vitest';
import { HttpError } from '../src/lib/http-error.js';
import {
  ListTrainersQueryDto,
  TrainerIdParamsDto,
  TrainerResponseDto,
  type TrainerWithProfile,
} from '../src/modules/trainers/trainers.dto.js';

describe('ListTrainersQueryDto', () => {
  it('usa valores por defecto', () => {
    const dto = ListTrainersQueryDto.fromQuery({});
    expect(dto.search).toBeUndefined();
    expect(dto.pagination.page).toBe(1);
    expect(dto.pagination.pageSize).toBe(20);
    expect(dto.pagination.skip).toBe(0);
  });

  it('convierte los valores del query string', () => {
    const dto = ListTrainersQueryDto.fromQuery({ search: '  laura ', page: '3', pageSize: '10' });
    expect(dto.search).toBe('laura');
    expect(dto.pagination.skip).toBe(20);
  });

  it('lanza 400 con todos los errores juntos', () => {
    try {
      ListTrainersQueryDto.fromQuery({ page: 'abc', pageSize: '0' });
      expect.fail('debería lanzar');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(400);
      expect((err as HttpError).details).toHaveLength(2);
    }
  });
});

describe('TrainerIdParamsDto', () => {
  it('rechaza ids que no son UUID', () => {
    expect(() => TrainerIdParamsDto.fromParams({ id: '123' })).toThrow(HttpError);
  });
});

describe('TrainerResponseDto', () => {
  it('no expone email ni tarifas', () => {
    const entity = {
      id: '3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f',
      email: 'laura@gymtonic.local',
      passwordHash: 'secreto',
      firstName: 'Laura',
      lastName: 'Gómez',
      trainerProfile: {
        specialty: 'Fuerza',
        bio: null,
        hourlyRate: 8000,
        availability: [{ dayOfWeek: 1, startTime: '07:00', endTime: '13:00' }],
      },
    } as unknown as TrainerWithProfile;

    const dto = TrainerResponseDto.fromEntity(entity);

    expect(dto).toEqual({
      id: entity.id,
      fullName: 'Laura Gómez',
      specialty: 'Fuerza',
      bio: null,
      availability: [{ dayOfWeek: 1, startTime: '07:00', endTime: '13:00' }],
    });
  });
});
