import { addDays, daysBetween } from '../dates';

export interface TrendPoint {
  date: string;
  trendKg: number;
  rawKg: number;
}

export type RateStatus = 'in_range' | 'above' | 'below' | 'wrong_direction' | 'n/a';
export type GoalType = 'bulk' | 'cut' | 'maintain';

export type Projection =
  | { kind: 'range'; earliest: string; expected: string; latest: string }
  | { kind: 'earliest_only'; earliest: string }
  | { kind: 'none' };

const KCAL_PER_KG = 7700;
const RATE_WINDOW_DAYS = 21;
const MIN_SPAN_DAYS = 14;
const MIN_WEIGHINS = 10;
const WARNING_DAYS = 14;

/** Rata-rata bergerak eksponensial dari timbangan pertama tiap hari. */
export function emaTrend(
  weights: { date: string; measuredAt: string; weightKg: number }[],
  alpha = 0.1,
): TrendPoint[] {
  const firstOfDay = new Map<string, { measuredAt: string; weightKg: number }>();
  for (const w of weights) {
    const cur = firstOfDay.get(w.date);
    if (!cur || w.measuredAt < cur.measuredAt) firstOfDay.set(w.date, w);
  }
  const dates = [...firstOfDay.keys()].sort();
  const out: TrendPoint[] = [];
  let trend: number | null = null;
  for (const date of dates) {
    const raw = firstOfDay.get(date)!.weightKg;
    trend = trend == null ? raw : trend + alpha * (raw - trend);
    out.push({ date, trendKg: Math.round(trend * 1e6) / 1e6, rawKg: raw });
  }
  return out;
}

/** Regresi linier kuadrat terkecil dengan standard error kemiringan. */
export function linearSlope(points: { x: number; y: number }[]): { slope: number; se: number } | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let sse = 0;
  for (const p of points) sse += (p.y - (intercept + slope * p.x)) ** 2;
  const se = Math.sqrt(sse / (n - 2) / sxx);
  return { slope, se };
}

export function weightRate(
  trend: TrendPoint[],
  asOf: string,
): { kgPerWeek: number; pctPerWeek: number; seKgPerWeek: number } | null {
  const from = addDays(asOf, -(RATE_WINDOW_DAYS - 1));
  const pts = trend.filter((p) => p.date >= from && p.date <= asOf).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (pts.length < MIN_WEIGHINS) return null;
  if (daysBetween(pts[0].date, pts[pts.length - 1].date) < MIN_SPAN_DAYS) return null;
  const fit = linearSlope(pts.map((p) => ({ x: daysBetween(pts[0].date, p.date), y: p.trendKg })));
  if (!fit) return null;
  const kgPerWeek = fit.slope * 7;
  return {
    kgPerWeek,
    pctPerWeek: (kgPerWeek / pts[pts.length - 1].trendKg) * 100,
    seKgPerWeek: fit.se * 7,
  };
}

export function rateStatus(
  kgPerWeek: number,
  goal: { type: GoalType; ratePctPerWeek: number },
  weightKg: number,
): RateStatus {
  if (goal.type === 'maintain') return 'n/a';
  const target = (goal.ratePctPerWeek / 100) * weightKg;
  const dir = Math.sign(target) || 1;
  const v = kgPerWeek * dir;
  const t = Math.abs(target);
  if (v <= 0) return 'wrong_direction';
  if (v < 0.5 * t) return 'below';
  if (v > 1.5 * t) return 'above';
  return 'in_range';
}

/** Peringatan bulking jika kondisi bertahan ≥ 14 hari berturut-turut sampai hari terakhir. */
export function persistentWarning(
  history: { date: string; status: RateStatus; kgPerWeek: number }[],
  goalType: GoalType,
): 'fast_gain' | 'no_gain' | null {
  if (goalType !== 'bulk' || history.length === 0) return null;
  const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : 1));
  const streak = (ok: (h: (typeof sorted)[number]) => boolean) => {
    let count = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (!ok(sorted[i])) break;
      if (i < sorted.length - 1 && daysBetween(sorted[i].date, sorted[i + 1].date) !== 1) break;
      count++;
    }
    return count;
  };
  if (streak((h) => h.status === 'above') >= WARNING_DAYS) return 'fast_gain';
  if (streak((h) => h.kgPerWeek <= 0) >= WARNING_DAYS) return 'no_gain';
  return null;
}

export function roundToHalfMonth(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  if (d <= 15) return `${y}-${mm}-15`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${mm}-${String(last).padStart(2, '0')}`;
}

export function projectDate(i: {
  current: number;
  target: number;
  ratePerWeek: number;
  sePerWeek: number;
  asOf: string;
}): Projection {
  const remaining = i.target - i.current;
  const dir = Math.sign(remaining);
  if (dir === 0 || i.ratePerWeek * dir <= 0) return { kind: 'none' };
  const at = (rate: number) => roundToHalfMonth(addDays(i.asOf, Math.round((remaining / rate) * 7)));
  const fast = i.ratePerWeek + dir * i.sePerWeek;
  const slow = i.ratePerWeek - dir * i.sePerWeek;
  if (slow * dir <= 0) return { kind: 'earliest_only', earliest: at(fast) };
  return { kind: 'range', earliest: at(fast), expected: at(i.ratePerWeek), latest: at(slow) };
}

export function bfRate(scans: { date: string; bfPct: number }[]): { ratePerWeek: number; sePerWeek: number } | null {
  if (scans.length < 3) return null;
  const sorted = [...scans].sort((a, b) => (a.date < b.date ? -1 : 1));
  const fit = linearSlope(sorted.map((s) => ({ x: daysBetween(sorted[0].date, s.date) / 7, y: s.bfPct })));
  return fit ? { ratePerWeek: fit.slope, sePerWeek: fit.se } : null;
}

export function isCompleteDay(i: { slotsLogged: number; kcal: number; targetKcal: number }): boolean {
  return i.slotsLogged >= 2 && i.kcal >= 0.6 * i.targetKcal;
}

export function actualTdee(i: {
  days: { date: string; kcal: number; complete: boolean }[];
  slopeKgPerDay: number;
  firstLogDate: string;
  asOf: string;
}): number | null {
  const window = Math.min(28, daysBetween(i.firstLogDate, i.asOf) + 1);
  if (window < 21) return null;
  const from = addDays(i.asOf, -(window - 1));
  const complete = i.days.filter((d) => d.complete && d.date >= from && d.date <= i.asOf);
  if (complete.length / window < 0.8) return null;
  const avg = complete.reduce((s, d) => s + d.kcal, 0) / complete.length;
  return avg - i.slopeKgPerDay * KCAL_PER_KG;
}
