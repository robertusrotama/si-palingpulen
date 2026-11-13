'use server';

import { headers } from 'next/headers';
import { isAllowedEmail } from '@/lib/auth/allowlist';
import { createServerSupabase } from '@/lib/supabase/server';

export type LoginState = { sent: boolean };

export async function requestMagicLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '');
  if (isAllowedEmail(email, process.env.ALLOWED_EMAIL ?? '')) {
    const origin = (await headers()).get('origin') ?? '';
    const supabase = await createServerSupabase();
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/callback` },
    });
  }
  // Jawaban selalu sama, supaya tidak membocorkan email mana yang diizinkan.
  return { sent: true };
}
