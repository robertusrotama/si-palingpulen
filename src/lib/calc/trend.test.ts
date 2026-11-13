import { describe, expect, test } from 'vitest';
import { addDays } from '../dates';
import {
  actualTdee, bfRate, emaTrend, isCompleteDay, linearSlope, persistentWarning, projectDate,
  rateStatus, roundToHalfMonth, weightRate,
} from './trend';
import type { RateStatus, TrendPoint } from './trend';

const w = (date: string, kg: number, time = '07:00') => ({ date, measuredAt: `${date}T${time}:00+07:00`, weightKg: kg });
function linearTrend(n: number, perDay: number, start = '2026-11-01', base = 60): TrendPoint[] {
  return Array.from({ length: n }, (_, i) => ({ date: addDays(start, i), trendKg: base + perDay * i, rawKg: base + perDay * i }));
}
function sparseTrend(n: number, start = '2026-11-01'): TrendPoint[] {
  return Array.from({ length: n }, (_, i) => ({ date: addDays(start, i * 2), trendKg: 60 + 0.08 * i, rawKg: 60 }));
}
const bulk = { type: 'bulk' as const, ratePctPerWeek: 0.3 };

describe('emaTrend', () => {
  test('alpha 0.1, days without a weigh-in do not update', () => {
    expect(emaTrend([w('2026-11-01', 60), w('2026-11-03', 61)]).map((p) => p.trendKg)).toEqual([60, 60.1]);
  });
  test('uses the first weigh-in of a day', () => {
    const t = emaTrend([w('2026-11-01', 62, '20:00'), w('2026-11-01', 60, '07:00')]);
    expect(t).toHaveLength(1);
    expect(t[0].rawKg).toBe(60);
  });
  test('sorts by date', () => {
    expect(emaTrend([w('2026-11-03', 61), w('2026-11-01', 60)]).map((p) => p.date)).toEqual(['2026-11-01', '2026-11-03']);
  });
});

describe('linearSlope', () => {
  test('exact line has zero standard error', () => {
    const r = linearSlope([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])!;
    expect(r.slope).toBeCloseTo(2);
    expect(r.se).toBeCloseTo(0);
  });
  test('needs at least 3 points', () => {
    expect(linearSlope([{ x: 0, y: 1 }, { x: 1, y: 2 }])).toBeNull();
  });
});

describe('weightRate', () => {
  test('0.04 kg/day over 21 days is 0.28 kg/week', () => {
    const r = weightRate(linearTrend(21, 0.04), '2026-11-21')!;
    expect(r.kgPerWeek).toBeCloseTo(0.28, 3);
    expect(r.pctPerWeek).toBeCloseTo((0.28 / 60.8) * 100, 3);
  });
  test('null when the span is under 14 days', () => {
    expect(weightRate(linearTrend(13, 0.04), '2026-11-13')).toBeNull();
  });
  test('null with fewer than 10 weigh-ins', () => {
    expect(weightRate(sparseTrend(9), '2026-11-21')).toBeNull();
  });
  test('only the last 21 days count', () => {
    const old = linearTrend(10, -0.5, '2026-10-01', 70);
    const r = weightRate([...old, ...linearTrend(21, 0.04)], '2026-11-21')!;
    expect(r.kgPerWeek).toBeCloseTo(0.28, 3);
  });
});

describe('rateStatus', () => {
  test('bulk 0.3%/week at 61.8 kg is 0.0927..0.2781 kg/week', () => {
    expect(rateStatus(0.2, bulk, 61.8)).toBe('in_range');
    expect(rateStatus(0.3, bulk, 61.8)).toBe('above');
    expect(rateStatus(0.05, bulk, 61.8)).toBe('below');
    expect(rateStatus(-0.1, bulk, 61.8)).toBe('wrong_direction');
  });
  test('cut mirrors bulk', () => {
    const cut = { type: 'cut' as const, ratePctPerWeek: -0.5 };
    expect(rateStatus(-0.3, cut, 61.8)).toBe('in_range');
    expect(rateStatus(0.1, cut, 61.8)).toBe('wrong_direction');
  });
  test('maintain has no status', () => {
    expect(rateStatus(0.1, { type: 'maintain', ratePctPerWeek: 0 }, 61.8)).toBe('n/a');
  });
});

describe('persistentWarning', () => {
  const hist = (days: number, status: RateStatus, kg: number) =>
    Array.from({ length: days }, (_, i) => ({ date: addDays('2026-11-01', i), status, kgPerWeek: kg }));
  test('14 consecutive days above range warns of fast gain', () => {
    expect(persistentWarning(hist(14, 'above', 0.4), 'bulk')).toBe('fast_gain');
    expect(persistentWarning(hist(13, 'above', 0.4), 'bulk')).toBeNull();
  });
  test('14 consecutive days without gain', () => {
    expect(persistentWarning(hist(14, 'wrong_direction', -0.05), 'bulk')).toBe('no_gain');
  });
  test('a day back in range resets the count', () => {
    const h = [...hist(10, 'above', 0.4), { date: '2026-11-11', status: 'in_range' as const, kgPerWeek: 0.2 }];
    expect(persistentWarning(h, 'bulk')).toBeNull();
  });
});

describe('projectDate', () => {
  test('range from rate ± SE', () => {
    expect(projectDate({ current: 62, target: 65, ratePerWeek: 0.25, sePerWeek: 0.05, asOf: '2026-11-12' }))
      .toEqual({ kind: 'range', earliest: '2027-01-31', expected: '2027-02-15', latest: '2027-02-28' });
  });
  test('only the earliest date when the slow bound is not moving toward the goal', () => {
    expect(projectDate({ current: 62, target: 65, ratePerWeek: 0.04, sePerWeek: 0.05, asOf: '2026-11-12' }).kind).toBe('earliest_only');
  });
  test('no projection when the trend moves away from the goal', () => {
    expect(projectDate({ current: 62, target: 65, ratePerWeek: -0.1, sePerWeek: 0.05, asOf: '2026-11-12' }).kind).toBe('none');
    expect(projectDate({ current: 62, target: 65, ratePerWeek: 0, sePerWeek: 0.05, asOf: '2026-11-12' }).kind).toBe('none');
  });
  test('works downward for a cut', () => {
    expect(projectDate({ current: 65, target: 62, ratePerWeek: -0.25, sePerWeek: 0.05, asOf: '2026-11-12' }).kind).toBe('range');
  });
});

describe('roundToHalfMonth', () => {
  test('mid or end of month', () => {
    expect(roundToHalfMonth('2027-02-04')).toBe('2027-02-15');
    expect(roundToHalfMonth('2027-02-15')).toBe('2027-02-15');
    expect(roundToHalfMonth('2027-02-16')).toBe('2027-02-28');
    expect(roundToHalfMonth('2028-02-20')).toBe('2028-02-29');
  });
});

describe('bfRate', () => {
  test('needs 3 scans', () => {
    expect(bfRate([{ date: '2026-11-07', bfPct: 14.9 }, { date: '2026-12-05', bfPct: 15.1 }])).toBeNull();
  });
  test('slope per week', () => {
    const r = bfRate([{ date: '2026-11-07', bfPct: 14.9 }, { date: '2026-11-21', bfPct: 15.1 }, { date: '2026-12-05', bfPct: 15.3 }])!;
    expect(r.ratePerWeek).toBeCloseTo(0.1);
  });
});

describe('isCompleteDay', () => {
  test('two meals and at least 60% of the target', () => {
    expect(isCompleteDay({ slotsLogged: 2, kcal: 1524, targetKcal: 2540 })).toBe(true);
    expect(isCompleteDay({ slotsLogged: 2, kcal: 1523, targetKcal: 2540 })).toBe(false);
    expect(isCompleteDay({ slotsLogged: 1, kcal: 3000, targetKcal: 2540 })).toBe(false);
  });
});

describe('actualTdee', () => {
  const days = (n: number, complete: number, kcal = 2600) =>
    Array.from({ length: n }, (_, i) => ({ date: addDays('2026-10-16', i), kcal: i < complete ? kcal : 500, complete: i < complete }));
  test('average intake of complete days minus the trend energy', () => {
    expect(actualTdee({ days: days(28, 25), slopeKgPerDay: 0.03, firstLogDate: '2026-10-01', asOf: '2026-11-12' })).toBeCloseTo(2369);
  });
  test('needs at least 21 days of data', () => {
    expect(actualTdee({ days: days(20, 20), slopeKgPerDay: 0.03, firstLogDate: '2026-10-24', asOf: '2026-11-12' })).toBeNull();
  });
  test('needs 80% complete days', () => {
    expect(actualTdee({ days: days(28, 20), slopeKgPerDay: 0.03, firstLogDate: '2026-10-01', asOf: '2026-11-12' })).toBeNull();
  });
});
