import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { OnboardingForm } from './OnboardingForm';

export default async function OnboardingPage() {
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect('/login');
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header>
        <span className="muted" style={{ fontSize: 13 }}>Langkah awal</span>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Mulai</h1>
      </header>
      <OnboardingForm />
    </main>
  );
}
