import Link from 'next/link';
import { Dial } from '@/components/today/Dial';
import { MealList } from '@/components/today/MealList';
import { WaterButtons } from '@/components/today/WaterButtons';
import { Icon } from '@/components/shell/icons';
import { addDays } from '@/lib/dates';
import { daySummary } from '@/lib/db/entries';
import { userClock } from '@/lib/db/session';
import { fmt } from '@/lib/format';
import { createServerSupabase } from '@/lib/supabase/server';

function Bar({ label, value, target, unit }: { label: string; value: number; target: number | null; unit: string }) {
  const pct = target ? Math.min(1, value / target) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="label">{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{fmt(value)}{target ? ` / ${fmt(target)}` : ''} {unit}</span>
      </div>
      <div className="inset" style={{ height: 14, padding: 3, borderRadius: 7 }}>
        <div style={{ width: `${pct * 100}%`, height: 8, borderRadius: 4, background: 'linear-gradient(180deg, #3D4A60 0%, #141B2D 100%)' }} />
      </div>
    </div>
  );
}

function Limit({ label, value, max, unit, coverage }: { label: string; value: number | null; max: number | null; unit: string; coverage: number }) {
  return (
    <div className="inset" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700 }}>
        {value == null ? '?' : fmt(value)} <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{max != null ? `/ ${fmt(max)} ` : ''}{unit}</span>
      </span>
      {coverage < 100 && <span className="muted" style={{ fontSize: 11 }}>data dari {coverage}% makanan</span>}
    </div>
  );
}

const DATE_FMT = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sb = await createServerSupabase();
  const clock = await userClock(sb);
  const { d } = await searchParams;
  const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : clock.today;
  const day = await daySummary(sb, date);
  const t = day.target;
  const kcal = day.totals.kcal ?? 0;
  const protein = day.totals.protein_g ?? 0;
  const fiber = day.totals.fiber_g ?? 0;
  const hasEntries = day.groups.some((g) => g.entries.length > 0);
  const isToday = date === clock.today;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{DATE_FMT.format(new Date(`${date}T00:00:00Z`))}</span>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>{isToday ? 'Hari Ini' : 'Catatan harian'}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/?d=${addDays(date, -1)}`} className="btn" aria-label="Hari sebelumnya" style={{ width: 44, padding: 0 }}><Icon name="back" size={18} /></Link>
          <Link href={`/?d=${addDays(date, 1)}`} className="btn" aria-label="Hari berikutnya" style={{ width: 44, padding: 0 }}><Icon name="back" size={18} style={{ transform: 'scaleX(-1)' }} /></Link>
        </div>
      </header>

      {!t && (
        <div className="raised hatch" role="status" style={{ padding: '10px 10px 10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ flex: 1, fontWeight: 600 }}>Target untuk tanggal ini belum diatur</span>
          <Link href="/target" className="btn navy">Atur target</Link>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '3 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="panel" aria-label="Kalori" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
            <Dial size={168} accent pct={t ? kcal / t.kcal : 0} label={t ? `Kalori ${Math.round((kcal / t.kcal) * 100)} persen dari target` : 'Kalori'} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="label">Kalori</span>
              <span data-testid="today-kcal" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{fmt(kcal)}</span>
              {t && <span className="muted" style={{ fontSize: 14 }}>dari {fmt(t.kcal)} kkal</span>}
              {t && <span className="inset" style={{ alignSelf: 'flex-start', padding: '6px 10px', fontSize: 13, fontWeight: 600 }}>
                {kcal <= t.kcal ? `Sisa ${fmt(t.kcal - kcal)} kkal` : `Lebih ${fmt(kcal - t.kcal)} kkal`}
              </span>}
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {([['Protein', protein, t?.protein_g], ['Serat', fiber, t?.fiber_g]] as const).map(([label, v, target]) => (
              <section key={label} className="panel" aria-label={label} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 20 }}>
                <Dial size={84} pct={target ? v / target : 0} label={target ? `${label} ${Math.round((v / target) * 100)} persen dari target` : label} />
                <span className="label">{label}</span>
                <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{fmt(v)} g</span>
                {target != null && <span className="muted" style={{ fontSize: 13 }}>dari {fmt(target)} g, sisa {fmt(Math.max(0, target - v))} g</span>}
              </section>
            ))}
          </div>

          <section className="panel" aria-label="Makro dan air" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Bar label="Karbo" value={day.totals.carb_g ?? 0} target={t?.carb_g ?? null} unit="g" />
            <Bar label="Lemak" value={day.totals.fat_g ?? 0} target={t?.fat_g ?? null} unit="g" />
            <WaterButtons date={date} waterMl={day.waterMl} targetMl={t?.water_ml ?? null} />
          </section>

          <section className="panel" aria-label="Batas harian" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="label">Batas harian</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <Limit label="Gula tambahan" value={day.totals.added_sugar_g} max={t?.added_sugar_max_g ?? null} unit="g" coverage={day.coverage.added_sugar_g} />
              <Limit label="Natrium" value={day.totals.sodium_mg} max={t?.sodium_max_mg ?? null} unit="mg" coverage={day.coverage.sodium_mg} />
              <Limit label="Lemak jenuh" value={day.totals.satfat_g} max={t?.satfat_max_g ?? null} unit="g" coverage={day.coverage.satfat_g} />
            </div>
          </section>
        </div>

        <div style={{ flex: '2 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!hasEntries && (
            <section className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
              <span style={{ fontSize: 17, fontWeight: 700 }}>Belum ada makanan tercatat {isToday ? 'hari ini' : 'di tanggal ini'}</span>
              {t && <span className="muted" style={{ fontSize: 14 }}>Target: {fmt(t.kcal)} kkal, {fmt(t.protein_g)} g protein, {fmt(t.fiber_g)} g serat.</span>}
              <Link href="/catat" className="btn navy">Catat makanan</Link>
            </section>
          )}
          <MealList groups={day.groups} tz={clock.tz} />
        </div>
      </div>
    </div>
  );
}
