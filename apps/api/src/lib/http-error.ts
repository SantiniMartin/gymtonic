/** Error HTTP controlado: el errorHandler lo traduce a una respuesta JSON. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message = 'Solicitud inválida', details?: unknown) {
    return new HttpError(400, message, 'BAD_REQUEST', details);
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
