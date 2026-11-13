import { expect, test } from 'vitest';
import { validateScan, validateWeight, type ScanInput } from './body';

// Data scan asli 7 Nov 2026 sebagai fixture valid.
const scan: ScanInput = {
  weightKg: 61.8, bmi: 22.7, fatMassKg: 9.2, bfPct: 14.9, musclePct: 80.6, otherPct: 4.5, visceralFat: 4, whr: 0.95,
  bmrKcal: 1465, bodyAge: 28, bcmScore: 5012,
  armRMuscleKg: 3.0, armRFatKg: 0.4, armLMuscleKg: 2.9, armLFatKg: 0.4, torsoMuscleKg: 24.1, torsoFatKg: 4.7,
  legRMuscleKg: 7.6, legRFatKg: 1.4, legLMuscleKg: 7.7, legLFatKg: 1.5,
};

test('the real scan is valid', () => {
  expect(validateScan(scan, null)).toEqual({ errors: [], warnings: [] });
});
test('impossible body fat', () => {
  expect(validateScan({ ...scan, bfPct: 92 }, null).errors).toContain('bf_out_of_range');
});
test('composition must add up to about 100%', () => {
  expect(validateScan({ ...scan, otherPct: 6.5 }, null).errors).toContain('composition_sum');
});
test('fat mass must match weight × body fat', () => {
  expect(validateScan({ ...scan, fatMassKg: 9.8 }, null).errors).toContain('fat_mass_mismatch');
});
test('big jumps from the previous scan are warnings', () => {
  expect(validateScan({ ...scan, bfPct: 18.0, fatMassKg: 11.1 }, scan).warnings).toContain('bf_jump');
  expect(validateScan({ ...scan, weightKg: 65.0, fatMassKg: 9.7 }, scan).warnings).toContain('weight_jump');
});
test('composition check is skipped when a part is missing', () => {
  expect(validateScan({ ...scan, otherPct: null }, null).errors).toEqual([]);
});
test('weight range and distance from trend', () => {
  expect(validateWeight(29, null).errors).toContain('weight_out_of_range');
  expect(validateWeight(64, 61.8).warnings).toContain('weight_far_from_trend');
  expect(validateWeight(63.6, 61.8).warnings).toEqual([]);
  expect(validateWeight(61.9, null)).toEqual({ errors: [], warnings: [] });
});
