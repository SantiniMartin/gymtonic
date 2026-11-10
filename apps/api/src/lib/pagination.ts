import { HttpError } from './http-error.js';
import { toInt } from './validators.js';

/** DTO de entrada para listados paginados: ?page=1&pageSize=20 */
export class PaginationDto {
  constructor(
    public readonly page: number,
    public readonly pageSize: number,
  ) {}

  /** Cuántos registros saltear (para Prisma `skip`). */
  get skip(): number {
    return (this.page - 1) * this.pageSize;
  }

  static fromQuery(query: Record<string, unknown>): PaginationDto {
    const errors: string[] = [];
    const page = toInt(query.page) ?? 1;
    const pageSize = toInt(query.pageSize) ?? 20;

    if (Number.isNaN(page) || page < 1) errors.push('page: debe ser un entero mayor o igual a 1');
    if (Number.isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      errors.push('pageSize: debe ser un entero entre 1 y 100');
    }
    if (errors.length > 0) throw HttpError.validation(errors);

    return new PaginationDto(page, pageSize);
  }
}

/** DTO de salida para listados paginados. */
export interface PaginatedResponseDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
