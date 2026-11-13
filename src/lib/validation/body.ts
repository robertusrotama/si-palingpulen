export interface ScanInput {
  weightKg: number; bmi: number | null; fatMassKg: number; bfPct: number; musclePct: number | null; otherPct: number | null;
  visceralFat: number | null; whr: number | null; bmrKcal: number | null; bodyAge: number | null; bcmScore: number | null;
  armRMuscleKg: number | null; armRFatKg: number | null; armLMuscleKg: number | null; armLFatKg: number | null;
  torsoMuscleKg: number | null; torsoFatKg: number | null; legRMuscleKg: number | null; legRFatKg: number | null;
  legLMuscleKg: number | null; legLFatKg: number | null;
}
export type ScanError = 'bf_out_of_range' | 'composition_sum' | 'fat_mass_mismatch' | 'weight_out_of_range';
export type ScanWarning = 'bf_jump' | 'weight_jump';

/** Validasi hasil scan (spec F7): error memblokir simpan, warning bisa dilewati. */
export function validateScan(s: ScanInput, prev: ScanInput | null): { errors: ScanError[]; warnings: ScanWarning[] } {
  const errors: ScanError[] = [];
  const warnings: ScanWarning[] = [];
  if (s.weightKg < 30 || s.weightKg > 200) errors.push('weight_out_of_range');
  if (s.bfPct < 3 || s.bfPct > 60) errors.push('bf_out_of_range');
  if (s.musclePct != null && s.otherPct != null && Math.abs(s.musclePct + s.bfPct + s.otherPct - 100) > 1) errors.push('composition_sum');
  if (Math.abs(s.fatMassKg - (s.weightKg * s.bfPct) / 100) > 0.5) errors.push('fat_mass_mismatch');
  if (prev) {
    if (Math.abs(s.bfPct - prev.bfPct) > 3) warnings.push('bf_jump');
    if (Math.abs(s.weightKg - prev.weightKg) > 3) warnings.push('weight_jump');
  }
  return { errors, warnings };
}

export function validateWeight(kg: number, trendKg: number | null): { errors: 'weight_out_of_range'[]; warnings: 'weight_far_from_trend'[] } {
  const errors: 'weight_out_of_range'[] = kg < 30 || kg > 200 ? ['weight_out_of_range'] : [];
  const warnings: 'weight_far_from_trend'[] = trendKg != null && Math.abs(kg - trendKg) / trendKg > 0.03 ? ['weight_far_from_trend'] : [];
  return { errors, warnings };
}
