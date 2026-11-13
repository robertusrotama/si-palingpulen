import { describe, expect, test } from 'vitest';
import { addDays, daysBetween, localDate, localTime, mealSlotFor } from './dates';

describe('localDate', () => {
  test('23.30 WIB stays on the same local day', () => {
    expect(localDate('2026-11-12T16:30:00Z', 'Asia/Jakarta')).toBe('2026-11-12');
  });
  test('00.30 WIB is the next local day', () => {
    expect(localDate('2026-11-12T17:30:00Z', 'Asia/Jakarta')).toBe('2026-11-13');
  });
});

describe('localTime', () => {
  test('formats HH:mm in the zone', () => {
    expect(localTime('2026-11-12T05:40:00Z', 'Asia/Jakarta')).toBe('12:40');
    expect(localTime('2026-11-12T17:05:00Z', 'Asia/Jakarta')).toBe('00:05');
  });
});

describe('mealSlotFor', () => {
  test('boundaries', () => {
    expect(mealSlotFor('09:59')).toBe('breakfast');
    expect(mealSlotFor('10:00')).toBe('lunch');
    expect(mealSlotFor('14:59')).toBe('lunch');
    expect(mealSlotFor('15:00')).toBe('snack');
    expect(mealSlotFor('17:59')).toBe('snack');
    expect(mealSlotFor('18:00')).toBe('dinner');
  });
  test("never picks 'other' automatically", () => {
    expect(mealSlotFor('23:59')).toBe('dinner');
    expect(mealSlotFor('00:00')).toBe('breakfast');
  });
});

describe('addDays / daysBetween', () => {
  test('across months and years', () => {
    expect(addDays('2026-11-12', 70)).toBe('2027-01-21');
    expect(daysBetween('2026-11-12', '2027-01-21')).toBe(70);
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2027-01-21', '2026-11-12')).toBe(-70);
  });
});

import { zonedToUtc } from './dates';

describe('zonedToUtc', () => {
  test('local WIB time to an UTC instant', () => {
    expect(zonedToUtc('2026-11-07', '07:30', 'Asia/Jakarta')).toBe('2026-11-07T00:30:00.000Z');
    expect(zonedToUtc('2026-11-07', '00:30', 'Asia/Jakarta')).toBe('2026-11-06T17:30:00.000Z');
    expect(zonedToUtc('2026-11-07', '07:30', 'Asia/Makassar')).toBe('2026-11-06T23:30:00.000Z');
  });
});
