'use server';

import { redirect } from 'next/navigation';
import { validateSignup } from '@/lib/auth/credentials';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import type { AuthState } from '../login/actions';

/**
 * Pendaftaran terbuka untuk siapa saja. Akun dibuat di server lewat admin API dan langsung
 * terkonfirmasi (tanpa link email); pendaftaran publik Supabase sendiri tetap dimatikan.
 */
export async function signUpAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');
  const invalid = validateSignup(email, password, confirm);
  if (invalid) return { error: invalid };

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
