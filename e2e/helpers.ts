import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

export const E2E_EMAIL = 'e2e-owner@test.local';

export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Login sebagai user tes lewat route khusus E2E. `withProfile` membuat baris profile agar tidak diarahkan ke onboarding. */
export async function loginAsTestUser(page: Page, opts: { withProfile?: boolean } = { withProfile: true }) {
  const res = await page.request.post('/api/test/login', { data: { email: E2E_EMAIL } });
  if (!res.ok()) throw new Error(`test login failed: ${res.status()}`);
  const { userId } = (await res.json()) as { userId: string };
  const admin = adminClient();
  if (opts.withProfile) {
    await admin.from('profile').upsert({
      user_id: userId, sex: 'male', birth_date: '2000-05-01', height_cm: 165, activity_factor: 1.55,
    });
  } else {
    await admin.from('profile').delete().eq('user_id', userId);
  }
  return userId;
}

export function todayWib(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
}

/** Menghapus semua catatan harian user tes agar tiap tes mulai bersih. */
export async function resetDailyData(userId: string) {
  const admin = adminClient();
  for (const t of ['food_entries', 'water_entries', 'weight_entries', 'targets'] as const) {
    await admin.from(t).delete().eq('user_id', userId);
  }
}

export async function seedFood(
  userId: string, name: string,
  per100: { kcal: number; protein_g: number; carb_g: number; fat_g: number; fiber_g?: number },
  opts: { portions?: { label: string; grams: number }[]; favorite?: boolean } = {},
) {
  const admin = adminClient();
  const { data, error } = await admin.from('foods')
    .insert({ user_id: userId, name, source: 'estimate', is_estimate: true, is_favorite: !!opts.favorite, ...per100 })
    .select('id').single();
  if (error) throw error;
  for (const p of opts.portions ?? []) await admin.from('food_portions').insert({ user_id: userId, food_id: data.id, ...p });
  return data.id as string;
}

/** Menghapus profil, goal, target, scan, dan berat user tes (untuk alur onboarding). */
export async function resetAllData(userId: string) {
  const admin = adminClient();
  await resetDailyData(userId);
  for (const t of ['body_scans', 'goals', 'profile'] as const) await admin.from(t).delete().eq('user_id', userId);
}
