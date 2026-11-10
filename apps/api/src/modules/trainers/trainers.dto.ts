import type { TrainerSchedule, User, TrainerProfile } from '@prisma/client';
import { HttpError } from '../../lib/http-error.js';
import { PaginationDto } from '../../lib/pagination.js';
import { isUuid } from '../../lib/validators.js';

// ───────────────────────── DTOs de entrada ─────────────────────────

/** GET /api/trainers?search=&page=&pageSize= */
export class ListTrainersQueryDto {
  constructor(
    public readonly search: string | undefined,
    public readonly pagination: PaginationDto,
  ) {}

  static fromQuery(query: Record<string, unknown>): ListTrainersQueryDto {
    const search = typeof query.search === 'string' ? query.search.trim() : undefined;
    // PaginationDto valida page y pageSize (lanza 400 si son inválidos)
    const pagination = PaginationDto.fromQuery(query);
    return new ListTrainersQueryDto(search || undefined, pagination);
  }
}

/** Parámetro :id de la URL. */
export class TrainerIdParamsDto {
  constructor(public readonly id: string) {}

  static fromParams(params: Record<string, unknown>): TrainerIdParamsDto {
    if (!isUuid(params.id)) throw HttpError.validation(['id: debe ser un UUID válido']);
    return new TrainerIdParamsDto(params.id);
  }
}

// ───────────────────────── DTOs de salida ─────────────────────────

/** Lo que devuelve el repositorio: usuario + perfil + disponibilidad. */
export type TrainerWithProfile = User & {
  trainerProfile: (TrainerProfile & { availability: TrainerSchedule[] }) | null;
};

export interface AvailabilityDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Datos públicos de un entrenador (los ve el alumno al elegir).
 * No incluye email, tarifas ni datos internos.
 */
export class TrainerResponseDto {
  constructor(
    public readonly id: string,
    public readonly fullName: string,
    public readonly specialty: string | null,
    public readonly bio: string | null,
    public readonly availability: AvailabilityDto[],
  ) {}

  /** Convierte la entidad de la base de datos en el DTO de respuesta. */
  static fromEntity(trainer: TrainerWithProfile): TrainerResponseDto {
    return new TrainerResponseDto(
      trainer.id,
      `${trainer.firstName} ${trainer.lastName}`,
      trainer.trainerProfile?.specialty ?? null,
      trainer.trainerProfile?.bio ?? null,
      (trainer.trainerProfile?.availability ?? []).map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    );
  }
}
