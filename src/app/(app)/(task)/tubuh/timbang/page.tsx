import { BackLink } from '@/components/shell/BackLink';
import { emaTrend } from '@/lib/calc/trend';
import { latestScan } from '@/lib/db/body';
import { getProfile } from '@/lib/db/profile';
import { userClock } from '@/lib/db/session';
import { must } from '@/lib/db/types';
import { createServerSupabase } from '@/lib/supabase/server';
import { WeighScreen } from './WeighScreen';

export default async function TimbangPage() {
  const sb = await createServerSupabase();
  const [{ today }, profile, scan] = await Promise.all([userClock(sb), getProfile(sb), latestScan(sb)]);
  const rows = must(await sb.from('weight_entries').select('date, measured_at, weight_kg').order('date'));
  const trend = emaTrend(rows.map((r) => ({ date: r.date, measuredAt: r.measured_at, weightKg: Number(r.weight_kg) })));
  const last = trend.at(-1);
  const initial = last?.rawKg ?? scan?.weightKg ?? 60;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackLink />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Timbang badan</h1>
      </header>
      <WeighScreen initialKg={Math.round(initial * 10) / 10} trendKg={last ? Math.round(last.trendKg * 10) / 10 : null} today={today} hapticsEnabled={profile?.hapticsEnabled ?? null} />
    </div>
  );
}
