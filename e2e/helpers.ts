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
