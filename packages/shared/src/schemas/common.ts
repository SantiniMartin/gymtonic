import { z } from 'zod';
import { DAYS_OF_WEEK } from '../enums.js';

export const idSchema = z.string().uuid();

export const idParamsSchema = z.object({ id: idSchema });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Hora en formato HH:mm (24 h). */
export const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora inválido (HH:mm)');

export const dayOfWeekSchema = z.coerce
  .number()
  .int()
  .refine(
    (d): d is (typeof DAYS_OF_WEEK)[number] => (DAYS_OF_WEEK as readonly number[]).includes(d),
    {
      message: 'Día de la semana inválido (0-6)',
    },
  );

/** Período de facturación en formato YYYY-MM. */
export const periodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Período inválido (YYYY-MM)');

export const dateRangeQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((r) => r.from <= r.to, {
    message: '"from" debe ser anterior o igual a "to"',
    path: ['to'],
  });
