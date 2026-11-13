import { z } from 'zod';
import type { GoalType } from '../calc/trend';
import { must, type DB } from './types';

export interface Goal {
  id: string; type: GoalType; startDate: string; endDate: string | null; targetWeightKg: number | null;
  targetBfPct: number | null; targetDate: string | null; ratePctPerWeek: number;
}

export const DEFAULT_RATE: Record<GoalType, number> = { bulk: 0.3, cut: -0.5, maintain: 0 };

function toGoal(r: Record<string, unknown>): Goal {
  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: r.id as string, type: r.type as GoalType, startDate: r.start_date as string, endDate: (r.end_date as string) ?? null,
    targetWeightKg: n(r.target_weight_kg), targetBfPct: n(r.target_bf_pct), targetDate: (r.target_date as string) ?? null,
    ratePctPerWeek: Number(r.rate_pct_per_week),
  };
}

export async function activeGoal(sb: DB): Promise<Goal | null> {
  const r = must(await sb.from('goals').select('*').is('end_date', null).maybeSingle());
  return r ? toGoal(r) : null;
}

export async function goalHistory(sb: DB): Promise<Goal[]> {
  return must(await sb.from('goals').select('*').order('start_date', { ascending: false })).map(toGoal);
}

const goalInput = z.object({
  type: z.enum(['bulk', 'cut', 'maintain']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetWeightKg: z.number().min(30).max(200).nullish(),
  targetBfPct: z.number().min(3).max(60).nullish(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  ratePctPerWeek: z.number().min(-2).max(2).nullish(),
});

/** Menutup goal aktif (end_date = startDate − 1) lalu membuat goal baru, dalam satu transaksi. */
export async function startGoal(sb: DB, g: z.input<typeof goalInput>): Promise<Goal> {
  const v = goalInput.parse(g);
  const r = must(await sb.rpc('start_goal', {
    p_type: v.type, p_start_date: v.startDate, p_rate_pct_per_week: v.ratePctPerWeek ?? DEFAULT_RATE[v.type],
    p_target_weight_kg: v.targetWeightKg ?? undefined, p_target_bf_pct: v.targetBfPct ?? undefined, p_target_date: v.targetDate ?? undefined,
  }));
  return toGoal(r as unknown as Record<string, unknown>);
}
