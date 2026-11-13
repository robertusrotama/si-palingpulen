import { describe, expect, test } from 'vitest';
import { addDays } from '../dates';
import { buildScanPeriods, type DayLog, type PeriodScan } from './periods';
import type { TrendPoint } from './trend';

const s1: PeriodScan = { date: '2026-11-07', hour: 7, condition: 'fasted', weightKg: 61.8, fatMassKg: 9.2, bfPct: 14.9 };
const s2: PeriodScan = { date: '2026-12-05', hour: 7, condition: 'fasted', weightKg: 62.6, fatMassKg: 9.4, bfPct: 15.0 };

function days(complete: number, total = 28): DayLog[] {
  return Array.from({ length: total }, (_, i) => ({
    date: addDays('2026-11-07', i), kcal: i < complete ? 2500 : 900, protein_g: i < complete ? 110 : 30,
    fiber_g: 20, slotsLogged: i < complete ? 3 : 1, targetKcal: 2540,
  }));
}
const trend: TrendPoint[] = Array.from({ length: 29 }, (_, i) => ({ date: addDays('2026-11-07', i), trendKg: 61.8 + 0.03 * i, rawKg: 61.8 }));

describe('buildScanPeriods', () => {
  test('one period between two scans', () => {
    const [p] = buildScanPeriods({ scans: [s1, s2], days: days(25), trend, leanErrorKg: 1 });
    expect(p.from).toBe('2026-11-07');
    expect(p.to).toBe('2026-12-05');
    expect(p.days).toBe(28);
    expect(p.completeness).toBeCloseTo(0.893, 3);
    expect(p.flags).not.toContain('incomplete_log');
  });
  test('averages use complete days only', () => {
    const [p] = buildScanPeriods({ scans: [s1, s2], days: days(25), trend, leanErrorKg: 1 });
    expect(p.avgKcal).toBe(2500);
    const avgTrend = trend.slice(0, 28).reduce((s, t) => s + t.trendKg, 0) / 28;
    expect(p.proteinGPerKg).toBeCloseTo(110 / avgTrend, 3);
    expect(p.avgFiberG).toBe(20);
  });
  test('deltas and lean mass under the device error', () => {
    const [p] = buildScanPeriods({ scans: [s1, s2], days: days(25), trend, leanErrorKg: 1 });
    expect(p.dFatMassKg).toBeCloseTo(0.2);
    expect(p.dLeanKg).toBeCloseTo((62.6 - 9.4) - (61.8 - 9.2));
    expect(p.dBfPct).toBeCloseTo(0.1);
    expect(p.dTrendKg).toBeCloseTo(0.84);
    expect(p.flags).toContain('lean_below_error');
  });
  test('too few complete days', () => {
    expect(buildScanPeriods({ scans: [s1, s2], days: days(20), trend, leanErrorKg: 1 })[0].flags).toContain('incomplete_log');
  });
  test('scans in different conditions are not comparable', () => {
    expect(buildScanPeriods({ scans: [s1, { ...s2, condition: 'fed' }], days: days(25), trend, leanErrorKg: 1 })[0].flags).toContain('scan_not_equivalent');
    expect(buildScanPeriods({ scans: [s1, { ...s2, hour: 11 }], days: days(25), trend, leanErrorKg: 1 })[0].flags).toContain('scan_not_equivalent');
    expect(buildScanPeriods({ scans: [s1, { ...s2, hour: 10 }], days: days(25), trend, leanErrorKg: 1 })[0].flags).not.toContain('scan_not_equivalent');
  });
  test('a single scan has no periods', () => {
    expect(buildScanPeriods({ scans: [s1], days: days(25), trend, leanErrorKg: 1 })).toEqual([]);
  });
  test('no complete days gives null averages', () => {
    const [p] = buildScanPeriods({ scans: [s1, s2], days: days(0), trend, leanErrorKg: 1 });
    expect(p.avgKcal).toBeNull();
    expect(p.proteinGPerKg).toBeNull();
  });
});
