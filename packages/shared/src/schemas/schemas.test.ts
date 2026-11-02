import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema } from './auth.js';
import { dateRangeQuerySchema, periodSchema } from './common.js';
import { scheduleSchema } from './schedule.js';

describe('schemas compartidos', () => {
  it('normaliza el email en login', () => {
    const r = loginSchema.parse({ email: '  Admin@GymTonic.com ', password: 'x' });
    expect(r.email).toBe('admin@gymtonic.com');
  });

  it('valida contraseñas', () => {
    expect(passwordSchema.safeParse('abc').success).toBe(false);
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false);
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true);
  });

  it('valida horarios', () => {
    expect(
      scheduleSchema.safeParse({ dayOfWeek: 1, startTime: '08:00', endTime: '09:30' }).success,
    ).toBe(true);
    expect(
      scheduleSchema.safeParse({ dayOfWeek: 1, startTime: '10:00', endTime: '09:00' }).success,
    ).toBe(false);
    expect(
      scheduleSchema.safeParse({ dayOfWeek: 7, startTime: '08:00', endTime: '09:00' }).success,
    ).toBe(false);
    expect(
      scheduleSchema.safeParse({ dayOfWeek: 1, startTime: '25:00', endTime: '26:00' }).success,
    ).toBe(false);
  });

  it('valida períodos y rangos', () => {
    expect(periodSchema.safeParse('2026-11').success).toBe(true);
    expect(periodSchema.safeParse('2026-13').success).toBe(false);
    expect(dateRangeQuerySchema.safeParse({ from: '2026-01-01', to: '2025-01-01' }).success).toBe(
      false,
    );
  });
});
