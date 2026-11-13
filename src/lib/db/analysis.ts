import { buildScanPeriods, type DayLog } from '../calc/periods';
import { targetFor } from '../calc/targets';
import { actualTdee, bfRate, emaTrend, isCompleteDay, persistentWarning, projectDate, rateStatus, weightRate, type Projection } from '../calc/trend';
import { addDays, daysBetween, localDate, localTime } from '../dates';
import { listScans } from './body';
import { listTargets } from './entries';
import { activeGoal, goalHistory } from './goals';
import { getProfile } from './profile';
import { must, type DB } from './types';

export type ProjectionView = Projection | { kind: 'needs'; text: string } | { kind: 'no_target' };

/** Semua data halaman Progres (spec F8, §8.5, §8.6). */
export async function progressData(sb: DB, today: string) {
  const [profile, goal, history, scans, targets] = await Promise.all([getProfile(sb), activeGoal(sb), goalHistory(sb), listScans(sb), listTargets(sb)]);
  const tz = profile?.timezone ?? 'Asia/Jakarta';
  const weights = must(await sb.from('weight_entries').select('date, measured_at, weight_kg').order('date'));
  const trend = emaTrend(weights.map((w) => ({ date: w.date, measuredAt: w.measured_at, weightKg: Number(w.weight_kg) })));
  const totals = must(await sb.from('daily_totals').select('date, kcal, protein_g, fiber_g, slots_logged').order('date'));
  const days: DayLog[] = totals.map((t) => ({
    date: t.date!, kcal: Number(t.kcal ?? 0), protein_g: Number(t.protein_g ?? 0), fiber_g: t.fiber_g == null ? null : Number(t.fiber_g),
    slotsLogged: t.slots_logged ?? 0, targetKcal: targetFor(t.date!, targets)?.kcal ?? null,
  }));

  const rate = weightRate(trend, today);
  const lastTrend = trend.at(-1)?.trendKg ?? null;
  const status = rate && goal && lastTrend ? rateStatus(rate.kgPerWeek, goal, lastTrend) : null;
  const hist = [];
  for (let i = 0; i < 14 && goal && lastTrend; i++) {
    const asOf = addDays(today, -i);
    const r = weightRate(trend, asOf);
    if (r) hist.push({ date: asOf, kgPerWeek: r.kgPerWeek, status: rateStatus(r.kgPerWeek, goal, lastTrend) });
  }
  const warning = goal ? persistentWarning(hist, goal.type) : null;

  let weightProjection: ProjectionView = { kind: 'no_target' };
  if (goal?.targetWeightKg != null && lastTrend != null) {
    if (rate) weightProjection = projectDate({ current: lastTrend, target: goal.targetWeightKg, ratePerWeek: rate.kgPerWeek, sePerWeek: rate.seKgPerWeek, asOf: today });
    else {
      const first = trend.find((t) => t.date >= addDays(today, -20));
      const span = first ? daysBetween(first.date, trend.at(-1)!.date) : 0;
      const need = Math.max(14 - span, 10 - trend.filter((t) => t.date >= addDays(today, -20)).length, 1);
      weightProjection = { kind: 'needs', text: `Butuh ${need} hari timbangan lagi` };
    }
  }
  const scanPoints = scans.map((s) => ({ date: localDate(s.scannedAt, tz), bfPct: s.bfPct }));
  let bfProjection: ProjectionView = { kind: 'no_target' };
  if (goal?.targetBfPct != null) {
    const br = bfRate(scanPoints);
    bfProjection = br && scans.length
      ? projectDate({ current: scans.at(-1)!.bfPct, target: goal.targetBfPct, ratePerWeek: br.ratePerWeek, sePerWeek: br.sePerWeek, asOf: today })
      : { kind: 'needs', text: `Butuh ${Math.max(1, 3 - scans.length)} scan lagi` };
  }

  const periods = buildScanPeriods({
    scans: scans.map((s) => ({
      date: localDate(s.scannedAt, tz), hour: Number(localTime(s.scannedAt, tz).slice(0, 2)), condition: s.condition,
      weightKg: s.weightKg, fatMassKg: s.fatMassKg, bfPct: s.bfPct,
    })),
    days, trend, leanErrorKg: profile?.leanErrorKg ?? 1,
  });

  const tdee = rate && days.length
    ? actualTdee({
        days: days.map((d) => ({ date: d.date, kcal: d.kcal, complete: d.targetKcal != null && isCompleteDay({ slotsLogged: d.slotsLogged, kcal: d.kcal, targetKcal: d.targetKcal }) })),
        slopeKgPerDay: rate.kgPerWeek / 7, firstLogDate: days[0].date, asOf: today,
      })
    : null;
  const formulaTdee = targetFor(today, targets)?.calc_inputs;

  return {
    trend: trend.filter((t) => t.date >= addDays(today, -29)), rate, status, warning, goal, history,
    weightProjection, bfProjection, periods, scans, tdee,
    formulaTdee: formulaTdee ? formulaTdee.bmr * formulaTdee.activityFactor : null,
    latestBf: scans.at(-1)?.bfPct ?? null, lastTrend,
  };
}
