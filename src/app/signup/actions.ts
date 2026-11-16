'use server';

import { redirect } from 'next/navigation';
import { isAllowedEmail } from '@/lib/auth/allowlist';
import { validateSignup } from '@/lib/auth/credentials';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import type { AuthState } from '../login/actions';

/**
 * Pendaftaran publik di Supabase tetap dimatikan. Akun dibuat di server lewat admin API,
 * hanya untuk email di ALLOWED_EMAIL, dan langsung terkonfirmasi (tanpa link email).
 */
export async function signUpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  const invalid = validateSignup(email, password, confirm);
  if (invalid) return { error: invalid };
  if (!isAllowedEmail(email, process.env.ALLOWED_EMAIL ?? '')) {
    return { error: 'Email ini tidak bisa didaftarkan.' };
  }

  const admin = createAdminSupabase();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) {
    if (created.error.code === 'email_exists' || /already/i.test(created.error.message)) {
      return { error: 'Email ini sudah terdaftar. Silakan masuk.' };
    }
    return { error: 'Pendaftaran gagal. Coba lagi.' };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Akun dibuat, tapi gagal masuk otomatis. Silakan masuk.' };
  redirect('/');
}
