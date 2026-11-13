import { computeTargets, selectBmr, shouldSuggestUpdate, targetFor, type CalcInputs, type TargetRow, type TargetValues } from '../calc/targets';
import { emaTrend } from '../calc/trend';
import { localDate } from '../dates';
import { listTargets } from './entries';
import { activeGoal } from './goals';
import { getProfile } from './profile';
import { must, type DB } from './types';

async function latestScanRow(sb: DB) {
  return must(await sb.from('body_scans').select('*').order('scanned_at', { ascending: false }).limit(1).maybeSingle());
}

async function trendKg(sb: DB): Promise<number | null> {
  const rows = must(await sb.from('weight_entries').select('date, measured_at, weight_kg').order('date'));
  const t = emaTrend(rows.map((r) => ({ date: r.date, measuredAt: r.measured_at, weightKg: Number(r.weight_kg) })));
  return t.length ? t[t.length - 1].trendKg : null;
}

/** Menghitung target dari profil, goal aktif, scan terbaru, dan tren berat. Belum disimpan. */
export async function recalcTargets(sb: DB, today: string, override?: { bmrMethod?: CalcInputs['method'] | 'auto'; activityFactor?: number }) {
  const profile = await getProfile(sb);
  if (!profile) throw new Error('no_profile');
  const goal = await activeGoal(sb);
  const scan = await latestScanRow(sb);
  const weightKg = (await trendKg(sb)) ?? (scan ? Number(scan.weight_kg) : null);
  if (weightKg == null) throw new Error('no_weight');
  const tz = profile.timezone;
  const pick = selectBmr({
    method: override?.bmrMethod ?? profile.bmrMethod, sex: profile.sex, heightCm: profile.heightCm, birthDate: profile.birthDate,
    weightKg, today,
    latestScan: scan ? { date: localDate(scan.scanned_at, tz), bfPct: Number(scan.bf_pct), bmrKcal: scan.bmr_kcal == null ? null : Number(scan.bmr_kcal) } : null,
  });
  const activityFactor = override?.activityFactor ?? profile.activityFactor;
  const ratePctPerWeek = goal?.ratePctPerWeek ?? 0;
  const values = computeTargets({ bmr: pick.bmr, activityFactor, weightKg, ratePctPerWeek });
  const inputs: CalcInputs = { bmr: pick.bmr, method: pick.method, activityFactor, weightKg, ratePctPerWeek };
  return { values, inputs, leanMassKg: scan && pick.method === 'katch' ? weightKg * (1 - Number(scan.bf_pct) / 100) : null };
}

export async function saveTargets(sb: DB, row: TargetRow): Promise<void> {
  must(await sb.from('targets').upsert({ ...row, calc_inputs: row.calc_inputs as never }, { onConflict: 'user_id,effective_from' }));
}

export async function targetUpdateSuggestion(sb: DB, today: string): Promise<{ current: TargetRow; proposed: TargetValues } | null> {
  const current = targetFor(today, await listTargets(sb));
  if (!current?.calc_inputs) return null;
  const scan = await latestScanRow(sb);
  const profile = await getProfile(sb);
  const suggest = shouldSuggestUpdate({
    calcWeightKg: current.calc_inputs.weightKg, trendKg: await trendKg(sb), targetsEffectiveFrom: current.effective_from,
    latestScanDate: scan ? localDate(scan.scanned_at, profile?.timezone ?? 'Asia/Jakarta') : null,
  });
  if (!suggest) return null;
  return { current, proposed: (await recalcTargets(sb, today)).values };
}
