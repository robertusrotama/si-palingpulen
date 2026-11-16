import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { OnboardingWizard } from './OnboardingWizard';

export default async function OnboardingPage() {
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect('/login');
  return (
    <main>
      <OnboardingWizard />
    </main>
  );
}
