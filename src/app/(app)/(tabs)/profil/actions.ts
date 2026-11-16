'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validateNewPassword } from '@/lib/auth/credentials';
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

export type PasswordState = { error: string | null; saved: boolean };

export async function setPasswordAction(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const password = String(form.get('password') ?? '');
  const invalid = validateNewPassword(password, String(form.get('confirm') ?? ''));
  if (invalid) return { error: invalid, saved: false };
  const sb = await createServerSupabase();
  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    if (error.code === 'same_password') return { error: 'Kata sandi baru sama dengan yang lama.', saved: false };
    return { error: 'Gagal menyimpan kata sandi. Coba lagi.', saved: false };
  }
  return { error: null, saved: true };
}

export async function signOutAction() {
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  redirect('/login');
}
