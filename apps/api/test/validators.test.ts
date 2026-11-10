import { describe, expect, it } from 'vitest';
import { isDayOfWeek, isEmail, isOneOf, isTime, isUuid, toInt } from '../src/lib/validators.js';

describe('validators', () => {
  it('isEmail', () => {
    expect(isEmail('juan@gymtonic.com')).toBe(true);
    expect(isEmail('juan@')).toBe(false);
    expect(isEmail(123)).toBe(false);
  });

  it('isUuid', () => {
    expect(isUuid('3f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f')).toBe(true);
    expect(isUuid('123')).toBe(false);
  });

  it('isTime', () => {
    expect(isTime('08:30')).toBe(true);
    expect(isTime('24:00')).toBe(false);
    expect(isTime('8:30')).toBe(false);
  });

  it('isDayOfWeek', () => {
    expect(isDayOfWeek(0)).toBe(true);
    expect(isDayOfWeek(6)).toBe(true);
    expect(isDayOfWeek(7)).toBe(false);
    expect(isDayOfWeek('1')).toBe(false);
  });

  it('isOneOf', () => {
    expect(isOneOf('ADMIN', ['MEMBER', 'TRAINER', 'ADMIN'])).toBe(true);
    expect(isOneOf('ROOT', ['MEMBER', 'TRAINER', 'ADMIN'])).toBe(false);
  });

  it('toInt', () => {
    expect(toInt(undefined)).toBeUndefined();
    expect(toInt('5')).toBe(5);
    expect(toInt('abc')).toBeNaN();
    expect(toInt('1.5')).toBeNaN();
  });
});
