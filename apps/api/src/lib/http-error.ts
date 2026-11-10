/**
 * Error HTTP controlado. Lanzalo desde un servicio o un DTO y el errorHandler
 * lo convierte en una respuesta JSON con el código de estado correspondiente.
 *
 *   throw HttpError.notFound('Entrenador no encontrado');
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'HttpError';
  }

  /** 400 — los datos del request no pasaron la validación del DTO. */
  static validation(details: string[]) {
    return new HttpError(400, 'Datos inválidos', 'VALIDATION_ERROR', details);
  }
  static badRequest(message = 'Solicitud inválida') {
    return new HttpError(400, message, 'BAD_REQUEST');
  }
  static unauthorized(message = 'No autenticado') {
    return new HttpError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'No tenés permisos para esta acción') {
    return new HttpError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Recurso no encontrado') {
    return new HttpError(404, message, 'NOT_FOUND');
  }
  static conflict(message = 'Conflicto con el estado actual del recurso') {
    return new HttpError(409, message, 'CONFLICT');
  }
}
