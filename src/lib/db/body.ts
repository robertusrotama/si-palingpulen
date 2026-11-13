import { z } from 'zod';
import { validateScan, type ScanInput } from '../validation/body';
import { must, type DB, type Tables } from './types';

type ScanRow = Tables['body_scans']['Row'];
export type Scan = ScanInput & { id: string; scannedAt: string; condition: 'fasted' | 'fed'; postWorkout: boolean; device: string };

const COLS: [keyof ScanInput, keyof ScanRow][] = [
  ['weightKg', 'weight_kg'], ['bmi', 'bmi'], ['fatMassKg', 'fat_mass_kg'], ['bfPct', 'bf_pct'], ['musclePct', 'muscle_pct'],
  ['otherPct', 'other_pct'], ['visceralFat', 'visceral_fat'], ['whr', 'whr'], ['bmrKcal', 'bmr_kcal'], ['bodyAge', 'body_age'],
  ['bcmScore', 'bcm_score'], ['armRMuscleKg', 'arm_r_muscle_kg'], ['armRFatKg', 'arm_r_fat_kg'], ['armLMuscleKg', 'arm_l_muscle_kg'],
  ['armLFatKg', 'arm_l_fat_kg'], ['torsoMuscleKg', 'torso_muscle_kg'], ['torsoFatKg', 'torso_fat_kg'], ['legRMuscleKg', 'leg_r_muscle_kg'],
  ['legRFatKg', 'leg_r_fat_kg'], ['legLMuscleKg', 'leg_l_muscle_kg'], ['legLFatKg', 'leg_l_fat_kg'],
];

function toScan(r: ScanRow): Scan {
  const out: Record<string, unknown> = { id: r.id, scannedAt: r.scanned_at, condition: r.condition, postWorkout: r.post_workout, device: r.device };
  for (const [k, c] of COLS) out[k] = r[c] == null ? null : Number(r[c]);
  return out as unknown as Scan;
}

const weightInput = z.object({
  clientId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), measuredAt: z.string(),
  weightKg: z.number().min(30).max(200), condition: z.enum(['fasted', 'fed']).default('fasted'),
});

export async function addWeight(sb: DB, i: z.input<typeof weightInput>) {
  const v = weightInput.parse(i);
  must(await sb.from('weight_entries').upsert(
    { client_id: v.clientId, date: v.date, measured_at: v.measuredAt, weight_kg: v.weightKg, condition: v.condition },
    { onConflict: 'user_id,client_id', ignoreDuplicates: true },
  ));
}

export async function listWeights(sb: DB, from: string, to: string) {
  const rows = must(await sb.from('weight_entries').select('date, measured_at, weight_kg, condition').gte('date', from).lte('date', to).order('date'));
  return rows.map((r) => ({ date: r.date, measuredAt: r.measured_at, weightKg: Number(r.weight_kg), condition: r.condition }));
}

export async function addScan(sb: DB, s: ScanInput & { scannedAt: string; condition: 'fasted' | 'fed'; postWorkout: boolean }) {
  const prev = await latestScan(sb);
  const { errors } = validateScan(s, prev);
  if (errors.length) throw new Error(`invalid_scan:${errors.join(',')}`);
  const row: Record<string, unknown> = { scanned_at: s.scannedAt, condition: s.condition, post_workout: s.postWorkout };
  for (const [k, c] of COLS) row[c] = s[k];
  must(await sb.from('body_scans').insert(row as never));
}

export async function listScans(sb: DB): Promise<Scan[]> {
  return must(await sb.from('body_scans').select('*').order('scanned_at')).map(toScan);
}

export async function latestScan(sb: DB): Promise<Scan | null> {
  const r = must(await sb.from('body_scans').select('*').order('scanned_at', { ascending: false }).limit(1).maybeSingle());
  return r ? toScan(r) : null;
}
