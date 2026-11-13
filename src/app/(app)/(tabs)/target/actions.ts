'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { CalcInputs, TargetValues } from '@/lib/calc/targets';
import { updateProfileSettings } from '@/lib/db/profile';
import { userClock } from '@/lib/db/session';
import { recalcTargets, saveTargets } from '@/lib/db/targets';
import { createServerSupabase } from '@/lib/supabase/server';

export async function previewTargetsAction(o: { bmrMethod: CalcInputs['method'] | 'auto'; activityFactor: number }) {
  const sb = await createServerSupabase();
  const { today } = await userClock(sb);
  return recalcTargets(sb, today, o);
}

/** Menyimpan target yang berlaku mulai hari ini. Hari-hari sebelumnya tetap memakai target lama. */
export async function saveTargetsAction(i: { values: TargetValues; inputs: CalcInputs; computed: TargetValues; activityFactor?: number; bmrMethod?: CalcInputs['method'] | 'auto' }) {
  const sb = await createServerSupabase();
  const { today } = await userClock(sb);
  const manual = (Object.keys(i.computed) as (keyof TargetValues)[]).some((k) => i.values[k] !== i.computed[k]);
  if (i.activityFactor || i.bmrMethod) {
    await updateProfileSettings(sb, { ...(i.activityFactor ? { activityFactor: i.activityFactor } : {}), ...(i.bmrMethod ? { bmrMethod: i.bmrMethod } : {}) });
  }
  await saveTargets(sb, { ...i.values, effective_from: today, is_manual_override: manual, calc_inputs: i.inputs });
  revalidatePath('/');
  redirect('/');
}
