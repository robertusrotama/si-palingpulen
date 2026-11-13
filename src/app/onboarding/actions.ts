'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { startGoal } from '@/lib/db/goals';
import { saveProfile } from '@/lib/db/profile';
import { userClock } from '@/lib/db/session';
import { recalcTargets } from '@/lib/db/targets';
import { must } from '@/lib/db/types';
import { createServerSupabase } from '@/lib/supabase/server';

const form = z.object({
  sex: z.enum(['male', 'female']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.number().min(100).max(250),
  activityFactor: z.number(),
  weightKg: z.number().min(30).max(200),
  bfPct: z.number().min(3).max(60).nullable(),
  goal: z.enum(['bulk', 'cut', 'maintain']),
  targetWeightKg: z.number().min(30).max(200).nullable(),
});

/** Menyimpan profil, berat awal, (opsional) % lemak dari scan, dan goal; lalu menghitung target. */
export async function onboardAction(input: z.input<typeof form>) {
  const v = form.parse(input);
  const sb = await createServerSupabase();
  await saveProfile(sb, { sex: v.sex, birthDate: v.birthDate, heightCm: v.heightCm, activityFactor: v.activityFactor as 1.55, bmrMethod: 'auto' });
  const clock = await userClock(sb);
  must(await sb.from('weight_entries').insert({ client_id: randomUUID(), date: clock.today, measured_at: clock.nowIso, weight_kg: v.weightKg }));
  if (v.bfPct != null) {
    must(await sb.from('body_scans').insert({
      scanned_at: clock.nowIso, device: 'Input onboarding', weight_kg: v.weightKg, bf_pct: v.bfPct,
      fat_mass_kg: Math.round(v.weightKg * v.bfPct) / 100,
    }));
  }
  await startGoal(sb, { type: v.goal, startDate: clock.today, targetWeightKg: v.targetWeightKg });
  return recalcTargets(sb, clock.today);
}
