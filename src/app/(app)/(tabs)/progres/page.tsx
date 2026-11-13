import Link from 'next/link';
import { progressData, type ProjectionView } from '@/lib/db/analysis';
import { userClock } from '@/lib/db/session';
import { fmt } from '@/lib/format';
import { createServerSupabase } from '@/lib/supabase/server';

const MON = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const DAY = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const m = (d: string) => MON.format(new Date(`${d}T00:00:00Z`));
const dd = (d: string) => DAY.format(new Date(`${d}T00:00:00Z`));
const sign = (v: number, digits = 1) => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v), digits)}`;

function proj(p: ProjectionView) {
  if (p.kind === 'range') return `kemungkinan ${m(p.earliest)} sampai ${m(p.latest)}`;
  if (p.kind === 'earliest_only') return `paling cepat ${m(p.earliest)}`;
  if (p.kind === 'none') return 'Belum ada proyeksi: tren berat datar/berlawanan';
  if (p.kind === 'needs') return p.text;
  return 'Target belum diisi';
}

export default async function ProgresPage() {
  const sb = await createServerSupabase();
  const { today } = await userClock(sb);
  const d = await progressData(sb, today);
  const ys = d.trend.map((t) => t.rawKg).concat(d.trend.map((t) => t.trendKg));
  const lo = Math.min(...ys, Infinity) - 0.2;
  const hi = Math.max(...ys, -Infinity) + 0.2;
  const x = (i: number) => 40 + (i / Math.max(1, d.trend.length - 1)) * 270;
  const y = (v: number) => 150 - ((v - lo) / Math.max(0.1, hi - lo)) * 140;
  const range = d.goal && d.lastTrend ? [0.5, 1.5].map((k) => (k * d.goal!.ratePctPerWeek * d.lastTrend!) / 100) : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Progres</h1>
        <Link href="/tubuh/scan" className="btn navy">Input scan baru</Link>
      </header>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <section className="panel" aria-label="Goal aktif" style={{ flex: '1 1 300px', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          <div className="inset" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 12 }}>Tren berat</div><b style={{ fontSize: 24 }}>{d.lastTrend ? `${fmt(d.lastTrend, 1)} kg` : '?'}</b><div className="muted" style={{ fontSize: 12 }}>{d.goal?.targetWeightKg ? `target ${fmt(d.goal.targetWeightKg, 1)} kg` : 'target belum diisi'}</div></div>
          <div className="inset" style={{ padding: 12 }}><div className="muted" style={{ fontSize: 12 }}>% lemak scan</div><b style={{ fontSize: 24 }}>{d.latestBf != null ? `${fmt(d.latestBf, 1)}%` : '?'}</b><div className="muted" style={{ fontSize: 12 }}>{d.goal?.targetBfPct ? `batas ${fmt(d.goal.targetBfPct, 1)}%` : 'batas belum diisi'}</div></div>
        </section>
        <section className="panel" aria-label="Laju mingguan" style={{ flex: '1 1 300px', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="label">Laju 21 hari</span>
          {d.rate ? <b style={{ fontSize: 20 }}>{sign(d.rate.kgPerWeek, 2)} kg/minggu</b> : <span className="muted">Butuh minimal 14 hari timbangan.</span>}
          {d.status === 'in_range' && range && <span>Dalam rentang lean bulk ({fmt(range[0], 2)} sampai {fmt(range[1], 2)} kg per minggu)</span>}
          {d.status === 'above' && <span>Di atas rentang target.</span>}
          {(d.status === 'below' || d.status === 'wrong_direction') && <span>Di bawah rentang target.</span>}
          {d.warning === 'fast_gain' && <span role="alert">Naik terlalu cepat 2 minggu: kemungkinan lebih banyak lemak yang bertambah.</span>}
          {d.warning === 'no_gain' && <span role="alert">Berat tidak naik 2 minggu.</span>}
        </section>
      </div>
      {d.trend.length > 1 && (
        <section className="panel" aria-label="Grafik berat badan" style={{ padding: 16 }}>
          <span className="label">Berat 30 hari (titik: timbangan, garis: tren)</span>
          <svg width="100%" height="170" viewBox="0 0 320 170" role="img" aria-label={`Tren berat ${fmt(d.trend[0].trendKg, 1)} ke ${fmt(d.trend.at(-1)!.trendKg, 1)} kg`}>
            {d.trend.map((t, i) => <circle key={t.date} cx={x(i)} cy={y(t.rawKg)} r="3" fill="#8E9AAA" />)}
            <polyline points={d.trend.map((t, i) => `${x(i)},${y(t.trendKg)}`).join(' ')} fill="none" stroke="#141B2D" strokeWidth="2.6" />
            <circle cx={x(d.trend.length - 1)} cy={y(d.trend.at(-1)!.trendKg)} r="5" fill="#E0662E" />
          </svg>
        </section>
      )}
      <section className="panel" aria-label="Proyeksi" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="label">Proyeksi</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>Berat target</span><b>{proj(d.weightProjection)}</b></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>% lemak</span><b>{proj(d.bfProjection)}</b></div>
      </section>
      <section className="panel" aria-label="Periode antar scan" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="label">Periode antar scan</span>
        {d.periods.length === 0 && <span className="muted">Butuh minimal 2 scan.</span>}
        {d.periods.map((p) => (
          <div key={p.from} style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowX: 'auto' }}>
            <b>{dd(p.from)} ke {dd(p.to)}, {p.days} hari</b>
            <span>Kalori {p.avgKcal == null ? '?' : `${fmt(p.avgKcal)} kkal`} · protein {p.proteinGPerKg == null ? '?' : `${fmt(p.proteinGPerKg, 1)} g/kg`} · serat {p.avgFiberG == null ? '?' : `${fmt(p.avgFiberG)} g`} · log {fmt(p.completeness * 100)}%</span>
            <span>Tren berat {p.dTrendKg == null ? '?' : `${sign(p.dTrendKg)} kg`} · fat mass {sign(p.dFatMassKg)} kg · lean mass {sign(p.dLeanKg)} kg · % lemak {sign(p.dBfPct)}</span>
            {p.flags.includes('incomplete_log') && <span className="raised hatch" style={{ padding: '8px 12px' }}>Data makan tidak lengkap, kesimpulan lemah</span>}
            {p.flags.includes('lean_below_error') && <span className="raised hatch" style={{ padding: '8px 12px' }}>Perubahan lean mass masih di bawah margin error alat</span>}
            {p.flags.includes('scan_not_equivalent') && <span className="raised hatch" style={{ padding: '8px 12px' }}>Scan tidak setara (jam/kondisi beda)</span>}
          </div>
        ))}
      </section>
      <section className="panel" aria-label="TDEE aktual" style={{ padding: 16 }}>
        <span className="label">TDEE aktual, estimasi 28 hari</span>
        <div><b style={{ fontSize: 24 }}>{d.tdee == null ? 'Butuh 21 hari data lengkap' : `${fmt(d.tdee)} kkal`}</b></div>
        {d.formulaTdee != null && <span className="muted" style={{ fontSize: 13 }}>Rumus: {fmt(d.formulaTdee)} kkal. Hanya info, target tidak berubah.</span>}
      </section>
    </div>
  );
}
