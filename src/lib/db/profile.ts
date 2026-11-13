import { z } from 'zod';
import type { BmrMethod, Sex } from '../calc/targets';
import { must, type DB } from './types';

export const REMINDER_IDS = ['weigh_in', 'lunch_missing', 'water_low', 'fiber_low', 'target_update'] as const;
export type ReminderId = (typeof REMINDER_IDS)[number];

export interface Profile {
  sex: Sex; birthDate: string; heightCm: number; activityFactor: number; bmrMethod: BmrMethod; timezone: string;
  displayName: string | null; leanErrorKg: number; hapticsEnabled: boolean | null; remindersDisabled: ReminderId[];
}

const input = z.object({
  sex: z.enum(['male', 'female']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heightCm: z.number().min(100).max(250),
  activityFactor: z.union([z.literal(1.2), z.literal(1.375), z.literal(1.55), z.literal(1.725), z.literal(1.9)]),
  bmrMethod: z.enum(['auto', 'katch', 'mifflin', 'scan']).default('auto'),
  timezone: z.string().optional(),
  displayName: z.string().trim().min(1).max(60).nullish(),
  leanErrorKg: z.number().min(0.1).max(5).optional(),
  hapticsEnabled: z.boolean().nullish(),
  remindersDisabled: z.array(z.enum(REMINDER_IDS)).optional(),
});

export async function getProfile(sb: DB): Promise<Profile | null> {
  const p = must(await sb.from('profile').select('*').maybeSingle());
  if (!p) return null;
  return {
    sex: p.sex as Sex, birthDate: p.birth_date, heightCm: Number(p.height_cm), activityFactor: Number(p.activity_factor),
    bmrMethod: p.bmr_method as BmrMethod, timezone: p.timezone, displayName: p.display_name,
    leanErrorKg: Number(p.lean_error_kg), hapticsEnabled: p.haptics_enabled, remindersDisabled: p.reminders_disabled as ReminderId[],
  };
}

export async function saveProfile(sb: DB, p: z.input<typeof input>): Promise<void> {
  const v = input.parse(p);
  const { data } = await sb.auth.getUser();
  const row: Record<string, unknown> = {
    user_id: data.user!.id, sex: v.sex, birth_date: v.birthDate, height_cm: v.heightCm,
    activity_factor: v.activityFactor, bmr_method: v.bmrMethod,
  };
  if (v.timezone) row.timezone = v.timezone;
  if (v.displayName !== undefined) row.display_name = v.displayName;
  if (v.leanErrorKg !== undefined) row.lean_error_kg = v.leanErrorKg;
  if (v.hapticsEnabled !== undefined) row.haptics_enabled = v.hapticsEnabled;
  if (v.remindersDisabled !== undefined) row.reminders_disabled = v.remindersDisabled;
  must(await sb.from('profile').upsert(row as never, { onConflict: 'user_id' }));
}

/** Mengubah sebagian pengaturan profil tanpa mengirim ulang semua kolom. */
export async function updateProfileSettings(
  sb: DB,
  patch: Partial<Pick<Profile, 'bmrMethod' | 'displayName' | 'leanErrorKg' | 'hapticsEnabled' | 'remindersDisabled' | 'activityFactor'>>,
) {
  const cur = await getProfile(sb);
  if (!cur) throw new Error('no_profile');
  await saveProfile(sb, { ...cur, ...patch } as z.input<typeof input>);
}
