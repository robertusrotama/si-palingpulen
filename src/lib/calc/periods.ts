import { daysBetween } from '../dates';
import { isCompleteDay, type TrendPoint } from './trend';

export interface DayLog { date: string; kcal: number; protein_g: number; fiber_g: number | null; slotsLogged: number; targetKcal: number | null }
export interface PeriodScan { date: string; hour: number; condition: 'fasted' | 'fed'; weightKg: number; fatMassKg: number; bfPct: number }
export type PeriodFlag = 'incomplete_log' | 'lean_below_error' | 'scan_not_equivalent';
export interface ScanPeriod {
  from: string; to: string; days: number; avgKcal: number | null; proteinGPerKg: number | null; avgFiberG: number | null;
  completeness: number; dTrendKg: number | null; dFatMassKg: number; dLeanKg: number; dBfPct: number; flags: PeriodFlag[];
}

function trendAt(trend: TrendPoint[], date: string): number | null {
  let v: number | null = null;
  for (const t of trend) if (t.date <= date) v = t.trendKg;
  return v;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Ringkasan asupan dan perubahan komposisi untuk tiap pasangan scan berurutan (spec F8). */
export function buildScanPeriods(i: { scans: PeriodScan[]; days: DayLog[]; trend: TrendPoint[]; leanErrorKg: number }): ScanPeriod[] {
  const scans = [...i.scans].sort((a, b) => (a.date < b.date ? -1 : 1));
  const out: ScanPeriod[] = [];
  for (let k = 1; k < scans.length; k++) {
    const a = scans[k - 1];
    const b = scans[k];
    const n = Math.max(1, daysBetween(a.date, b.date));
    const inRange = i.days.filter((d) => d.date >= a.date && d.date < b.date);
    const complete = inRange.filter((d) => d.targetKcal != null && isCompleteDay({ slotsLogged: d.slotsLogged, kcal: d.kcal, targetKcal: d.targetKcal }));
    const trendInRange = i.trend.filter((t) => t.date >= a.date && t.date < b.date).map((t) => t.trendKg);
    const avgProtein = mean(complete.map((d) => d.protein_g));
    const avgTrend = mean(trendInRange);
    const fibers = complete.map((d) => d.fiber_g).filter((f): f is number => f != null);
    const ta = trendAt(i.trend, a.date);
    const tb = trendAt(i.trend, b.date);
    const dLeanKg = (b.weightKg - b.fatMassKg) - (a.weightKg - a.fatMassKg);
    const completeness = complete.length / n;
    const flags: PeriodFlag[] = [];
    if (completeness < 0.8) flags.push('incomplete_log');
    if (Math.abs(dLeanKg) < i.leanErrorKg) flags.push('lean_below_error');
    if (a.condition !== b.condition || Math.abs(a.hour - b.hour) > 3) flags.push('scan_not_equivalent');
    out.push({
      from: a.date, to: b.date, days: n, avgKcal: mean(complete.map((d) => d.kcal)),
      proteinGPerKg: avgProtein != null && avgTrend ? avgProtein / avgTrend : null, avgFiberG: mean(fibers),
      completeness, dTrendKg: ta != null && tb != null ? tb - ta : null,
      dFatMassKg: b.fatMassKg - a.fatMassKg, dLeanKg, dBfPct: b.bfPct - a.bfPct, flags,
    });
  }
  return out;
}
