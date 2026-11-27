import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`Ruta no encontrada: ${req.method} ${req.path}`));
};

/**
 * Manejador central de errores. Express 5 le pasa automáticamente
 * los errores lanzados en controllers async, así que no hace falta try/catch.
 *
 * Formato de respuesta: { error: { code, message, details? } }
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'El registro ya existe' } });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } });
      return;
    }
  }

  // JSON mal formado en el body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'JSON inválido' } });
    return;
  }

  // Otros errores expuestos por body-parser (ej. 413 Payload Too Large, 415 Unsupported Media Type)
  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number' &&
    'expose' in err &&
    (err as { expose: unknown }).expose === true
  ) {
    const status = (err as { status: number }).status;
    if (status >= 400 && status < 500) {
      const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST';
      const message =
        status === 413 ? 'El cuerpo de la solicitud supera el tamaño máximo' : 'Solicitud inválida';
      res.status(status).json({ error: { code, message } });
      return;
    }
  }

  logger.error({ err, path: req.path }, 'Error no controlado');
  res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
};
