'use server';

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export type AuthState = { error: string | null };

export async function signInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Isi email dan kata sandi.' };
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Pesan sama untuk email tak dikenal dan kata sandi salah, supaya tidak membocorkan akun mana yang ada.
  if (error) return { error: 'Email atau kata sandi salah.' };
  redirect('/');
}
