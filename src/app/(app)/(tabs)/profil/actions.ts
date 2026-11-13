'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { startGoal } from '@/lib/db/goals';
import { saveProfile, updateProfileSettings, type Profile } from '@/lib/db/profile';
import { userClock } from '@/lib/db/session';
import { createServerSupabase } from '@/lib/supabase/server';

export async function updateSettingsAction(patch: Parameters<typeof updateProfileSettings>[1]) {
  await updateProfileSettings(await createServerSupabase(), patch);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function saveBodyProfileAction(p: Pick<Profile, 'sex' | 'birthDate' | 'heightCm' | 'activityFactor' | 'bmrMethod'>) {
  await saveProfile(await createServerSupabase(), { ...p, activityFactor: p.activityFactor as 1.55 });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function startGoalAction(g: { type: 'bulk' | 'cut' | 'maintain'; targetWeightKg: number | null; targetBfPct: number | null; targetDate: string | null }) {
  const sb = await createServerSupabase();
  const { today } = await userClock(sb);
  await startGoal(sb, { ...g, startDate: today });
  revalidatePath('/', 'layout');
  redirect('/target');
}

export async function signOutAction() {
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  redirect('/login');
}
