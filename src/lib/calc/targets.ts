import { daysBetween } from '../dates';

export type BmrMethod = 'auto' | 'katch' | 'mifflin' | 'scan';
export type Sex = 'male' | 'female';

export interface TargetValues {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
  added_sugar_max_g: number;
  sodium_max_mg: number;
  satfat_max_g: number;
}

export interface CalcInputs {
  bmr: number;
  method: 'katch' | 'mifflin' | 'scan';
  activityFactor: number;
  weightKg: number;
  ratePctPerWeek: number;
}

export interface TargetRow extends TargetValues {
  effective_from: string;
  is_manual_override: boolean;
  calc_inputs: CalcInputs | null;
}

const KCAL_PER_KG = 7700;
const SCAN_MAX_AGE_DAYS = 60;

export function mifflin(p: { sex: Sex; weightKg: number; heightCm: number; ageYears: number }): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.ageYears;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function katch(weightKg: number, bfPct: number): number {
  return 370 + 21.6 * weightKg * (1 - bfPct / 100);
}

export function ageOn(birthDate: string, onDate: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = onDate.split('-').map(Number);
  let age = y - by;
  if (m < bm || (m === bm && d < bd)) age--;
  return age;
}

export function selectBmr(i: {
  method: BmrMethod;
  sex: Sex;
  heightCm: number;
  birthDate: string;
  weightKg: number;
  today: string;
  latestScan: { date: string; bfPct: number | null; bmrKcal: number | null } | null;
}): { bmr: number; method: 'katch' | 'mifflin' | 'scan' } {
  const fallback = {
    bmr: mifflin({ sex: i.sex, weightKg: i.weightKg, heightCm: i.heightCm, ageYears: ageOn(i.birthDate, i.today) }),
    method: 'mifflin' as const,
  };
  const scan = i.latestScan;
  if (i.method === 'mifflin' || !scan) return fallback;
  if (i.method === 'scan') return scan.bmrKcal != null ? { bmr: scan.bmrKcal, method: 'scan' } : fallback;
  if (scan.bfPct == null) return fallback;
  if (i.method === 'auto' && daysBetween(scan.date, i.today) > SCAN_MAX_AGE_DAYS) return fallback;
  return { bmr: katch(i.weightKg, scan.bfPct), method: 'katch' };
}

const round10 = (x: number) => Math.round(x / 10) * 10;
const round50 = (x: number) => Math.round(x / 50) * 50;

export function computeTargets(i: {
  bmr: number;
  activityFactor: number;
  weightKg: number;
  ratePctPerWeek: number;
  proteinGPerKg?: number;
}): TargetValues {
  const tdee = i.bmr * i.activityFactor;
  const surplus = ((i.ratePctPerWeek / 100) * i.weightKg * KCAL_PER_KG) / 7;
  const kcal = round10(tdee + surplus);
  const protein = (i.proteinGPerKg ?? 1.8) * i.weightKg;
  const fat = Math.max((0.25 * kcal) / 9, 0.6 * i.weightKg);
  const carb = (kcal - 4 * protein - 9 * fat) / 4;
  return {
    kcal,
    protein_g: Math.round(protein),
    fat_g: Math.round(fat),
    carb_g: Math.round(carb),
    fiber_g: Math.round(Math.max(25, (14 * kcal) / 1000)),
    water_ml: round50(35 * i.weightKg),
    added_sugar_max_g: Math.round((0.1 * kcal) / 4),
    sodium_max_mg: 2000,
    satfat_max_g: Math.round((0.1 * kcal) / 9),
  };
}

/** Target yang berlaku pada `date`: baris dengan effective_from terbesar yang ≤ date. */
export function targetFor(date: string, rows: TargetRow[]): TargetRow | null {
  let best: TargetRow | null = null;
  for (const r of rows) {
    if (r.effective_from > date) continue;
    if (!best || r.effective_from > best.effective_from) best = r;
  }
  return best;
}

export function shouldSuggestUpdate(i: {
  calcWeightKg: number;
  trendKg: number | null;
  targetsEffectiveFrom: string;
  latestScanDate: string | null;
}): boolean {
  if (i.latestScanDate && i.latestScanDate > i.targetsEffectiveFrom) return true;
  if (i.trendKg == null) return false;
  return Math.abs(i.trendKg - i.calcWeightKg) / i.calcWeightKg > 0.02;
}
