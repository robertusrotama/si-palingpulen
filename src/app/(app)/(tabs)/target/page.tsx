import Link from 'next/link';
import { targetFor } from '@/lib/calc/targets';
import { listTargets } from '@/lib/db/entries';
import { getProfile } from '@/lib/db/profile';
import { userClock } from '@/lib/db/session';
import { recalcTargets, targetUpdateSuggestion } from '@/lib/db/targets';
import { fmt } from '@/lib/format';
import { createServerSupabase } from '@/lib/supabase/server';
import { TargetScreen } from './TargetScreen';

export default async function TargetPage() {
  const sb = await createServerSupabase();
  const { today } = await userClock(sb);
  const profile = (await getProfile(sb))!;
  const current = targetFor(today, await listTargets(sb));
  const calc = await recalcTargets(sb, today).catch((e: Error) => e);
  const suggestion = await targetUpdateSuggestion(sb, today).catch(() => null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
      <header>
        <span className="muted" style={{ fontSize: 13 }}>Berlaku mulai hari ini saat disimpan</span>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Target harian</h1>
      </header>
      {suggestion && (
        <div className="raised hatch" role="status" style={{ padding: '10px 14px', fontWeight: 600 }}>
          Target bisa diperbarui: usulan {fmt(suggestion.proposed.kcal)} kkal (sekarang {fmt(suggestion.current.kcal)} kkal).
        </div>
      )}
      {calc instanceof Error ? (
        <section className="panel" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Belum bisa menghitung target</b>
          <span className="muted">Catat berat badan atau hasil scan dulu.</span>
          <Link href="/tubuh/timbang" className="btn navy" style={{ alignSelf: 'flex-start' }}>Timbang badan</Link>
        </section>
      ) : (
        <TargetScreen calc={calc} current={current} method={profile.bmrMethod} activity={profile.activityFactor} />
      )}
    </div>
  );
}
