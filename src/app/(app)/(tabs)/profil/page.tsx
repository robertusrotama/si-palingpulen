import { goalHistory } from '@/lib/db/goals';
import { getProfile } from '@/lib/db/profile';
import { createServerSupabase } from '@/lib/supabase/server';
import { ProfileSettings } from './ProfileSettings';

export default async function ProfilPage() {
  const sb = await createServerSupabase();
  const [profile, goals] = await Promise.all([getProfile(sb), goalHistory(sb)]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Profil</h1>
      <ProfileSettings profile={profile!} goals={goals} />
    </div>
  );
}
