import { BackLink } from '@/components/shell/BackLink';
import { latestScan } from '@/lib/db/body';
import { userClock } from '@/lib/db/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { ScanForm } from './ScanForm';

export default async function ScanPage() {
  const sb = await createServerSupabase();
  const [{ today }, prev] = await Promise.all([userClock(sb), latestScan(sb)]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackLink href="/progres" />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Input hasil scan</h1>
      </header>
      <ScanForm today={today} prev={prev} />
    </div>
  );
}
