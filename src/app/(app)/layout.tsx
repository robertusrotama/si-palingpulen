import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

/** Semua halaman aplikasi wajib sesi dan profil. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');
  const { data: profile } = await supabase.from('profile').select('user_id').maybeSingle();
  if (!profile) redirect('/onboarding');
  return children;
}
