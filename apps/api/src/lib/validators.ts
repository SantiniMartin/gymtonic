/**
 * Funciones simples para validar datos dentro de los DTOs.
 * Cada una devuelve true/false; el DTO arma la lista de errores.
 */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

/** Hora en formato HH:mm (24 h), por ejemplo "08:30". */
export function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Día de la semana: 0 = domingo ... 6 = sábado. */
export function isDayOfWeek(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;
}

/** Valida que el valor sea uno de los permitidos (útil para enums como Role). */
export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * Convierte un valor de query string ("2", "10") a entero.
 * Devuelve `undefined` si no viene, o `NaN` si no es un entero válido.
 */
export function toInt(value: unknown): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
}
