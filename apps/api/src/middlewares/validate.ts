import type { RequestHandler } from 'express';
import type { z } from 'zod';

type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

/**
 * Valida body / query / params con zod. Los valores parseados (con coerciones y defaults)
 * quedan en `req.body`, `res.locals.query` y `req.params`.
 * Si falla, el ZodError llega al errorHandler y se responde 400.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, res, next) => {
    if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
    // En Express 5 `req.query` es de solo lectura: guardamos la versión parseada en res.locals.
    if (schemas.query) res.locals.query = schemas.query.parse(req.query);
    if (schemas.body) req.body = schemas.body.parse(req.body);
    next();
  };
