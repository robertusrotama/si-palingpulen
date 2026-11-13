import { describe, expect, test } from 'vitest';
import { ageOn, computeTargets, katch, mifflin, selectBmr, shouldSuggestUpdate, targetFor } from './targets';
import type { TargetRow } from './targets';

describe('BMR formulas', () => {
  test('Mifflin-St Jeor', () => {
    expect(mifflin({ sex: 'male', weightKg: 61.8, heightCm: 165, ageYears: 26 })).toBeCloseTo(1524.25);
    expect(mifflin({ sex: 'female', weightKg: 61.8, heightCm: 165, ageYears: 26 })).toBeCloseTo(1358.25);
  });
  test('Katch-McArdle', () => {
    expect(katch(61.8, 14.9)).toBeCloseTo(1505.98, 1);
  });
  test('ageOn counts completed years', () => {
    expect(ageOn('2000-05-01', '2026-11-12')).toBe(26);
    expect(ageOn('2000-11-13', '2026-11-12')).toBe(25);
    expect(ageOn('2000-11-12', '2026-11-12')).toBe(26);
  });
});

describe('selectBmr', () => {
  const base = { sex: 'male' as const, heightCm: 165, birthDate: '2000-05-01', weightKg: 61.8, today: '2026-11-12' };
  const scan = (date: string) => ({ date, bfPct: 14.9, bmrKcal: 1465 });
  test('auto uses Katch with a scan up to 60 days old', () => {
    expect(selectBmr({ ...base, method: 'auto', latestScan: scan('2026-10-13') }).method).toBe('katch');
  });
  test('auto falls back to Mifflin with an older scan or none', () => {
    expect(selectBmr({ ...base, method: 'auto', latestScan: scan('2026-09-12') }).method).toBe('mifflin');
    expect(selectBmr({ ...base, method: 'auto', latestScan: null }).method).toBe('mifflin');
  });
  test("'scan' uses the device BMR, else Mifflin", () => {
    expect(selectBmr({ ...base, method: 'scan', latestScan: scan('2026-11-07') })).toEqual({ bmr: 1465, method: 'scan' });
    expect(selectBmr({ ...base, method: 'scan', latestScan: { date: '2026-11-07', bfPct: 14.9, bmrKcal: null } }).method).toBe('mifflin');
  });
  test("'mifflin' ignores the scan", () => {
    expect(selectBmr({ ...base, method: 'mifflin', latestScan: scan('2026-11-07') }).bmr).toBeCloseTo(1524.25);
  });
});

describe('computeTargets', () => {
  test('bulking example from the spec', () => {
    expect(computeTargets({ bmr: 1505.98, activityFactor: 1.55, weightKg: 61.8, ratePctPerWeek: 0.3 })).toEqual({
      kcal: 2540, protein_g: 111, fat_g: 71, carb_g: 365, fiber_g: 36, water_ml: 2150,
      added_sugar_max_g: 64, sodium_max_mg: 2000, satfat_max_g: 28,
    });
  });
  test('cutting uses a deficit', () => {
    expect(computeTargets({ bmr: 1505.98, activityFactor: 1.55, weightKg: 61.8, ratePctPerWeek: -0.5 }).kcal).toBe(1990);
  });
  test('fiber has a floor of 25 g', () => {
    expect(computeTargets({ bmr: 1000, activityFactor: 1.5, weightKg: 50, ratePctPerWeek: 0 }).fiber_g).toBe(25);
  });
  test('protein per kg is adjustable', () => {
    expect(computeTargets({ bmr: 1505.98, activityFactor: 1.55, weightKg: 61.8, ratePctPerWeek: 0.3, proteinGPerKg: 2 }).protein_g).toBe(124);
  });
});

describe('targetFor', () => {
  const row = (d: string): TargetRow => ({
    effective_from: d, is_manual_override: false, calc_inputs: null,
    kcal: 2000, protein_g: 100, carb_g: 250, fat_g: 60, fiber_g: 30, water_ml: 2000,
    added_sugar_max_g: 50, sodium_max_mg: 2000, satfat_max_g: 22,
  });
  test('picks the latest row on or before the date', () => {
    expect(targetFor('2026-11-10', [row('2026-11-11'), row('2026-11-01')])!.effective_from).toBe('2026-11-01');
    expect(targetFor('2026-11-11', [row('2026-11-01'), row('2026-11-11')])!.effective_from).toBe('2026-11-11');
  });
  test('null before the first row', () => {
    expect(targetFor('2026-10-31', [row('2026-11-01')])).toBeNull();
  });
});

describe('shouldSuggestUpdate', () => {
  test('trend moved more than 2%', () => {
    expect(shouldSuggestUpdate({ calcWeightKg: 61.8, trendKg: 63.2, targetsEffectiveFrom: '2026-11-12', latestScanDate: null })).toBe(true);
    expect(shouldSuggestUpdate({ calcWeightKg: 61.8, trendKg: 63.0, targetsEffectiveFrom: '2026-11-12', latestScanDate: null })).toBe(false);
  });
  test('a scan newer than the targets', () => {
    expect(shouldSuggestUpdate({ calcWeightKg: 61.8, trendKg: 61.8, targetsEffectiveFrom: '2026-11-12', latestScanDate: '2026-11-20' })).toBe(true);
    expect(shouldSuggestUpdate({ calcWeightKg: 61.8, trendKg: null, targetsEffectiveFrom: '2026-11-12', latestScanDate: '2026-11-07' })).toBe(false);
  });
});
