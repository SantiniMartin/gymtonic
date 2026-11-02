import { z } from 'zod';
import { dayOfWeekSchema, timeSchema } from './common.js';

export const scheduleSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    startTime: timeSchema,
    endTime: timeSchema,
  })
  .refine((s) => s.startTime < s.endTime, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endTime'],
  });
export type ScheduleInput = z.infer<typeof scheduleSchema>;
