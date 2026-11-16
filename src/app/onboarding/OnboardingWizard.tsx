'use client';

import { useState, type ReactNode } from 'react';
import { WeightRuler } from '@/components/body/WeightRuler';
import { Ruler } from '@/components/form/Ruler';
import { TargetEditor } from '@/components/targets/TargetEditor';
import { ACTIVITY } from '@/lib/activity';
import { fmt } from '@/lib/format';
import { useHaptics } from '@/lib/useHaptics';
import { onboardAction } from './actions';
import { ChoiceCard } from './ChoiceCard';
import { clampDay, onboardingSteps, type Goal, type StepId } from './steps';
import { WheelPicker } from './WheelPicker';

type Result = Awaited<ReturnType<typeof onboardAction>>;

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ACTIVITY_TITLE: Record<number, string> = { 1.2: 'Santai', 1.375: 'Ringan', 1.55: 'Sedang', 1.725: 'Aktif', 1.9: 'Sangat aktif' };
const GOALS: { id: Goal; title: string; description: string }[] = [
  { id: 'bulk', title: 'Bulking', description: 'Menambah massa otot dengan surplus kalori' },
  { id: 'cut', title: 'Cutting', description: 'Menurunkan lemak dengan defisit kalori' },
  { id: 'maintain', title: 'Maintain', description: 'Mempertahankan berat sekarang' },
];
const COPY: Record<StepId, { title: string; sub: string }> = {
  sex: { title: 'Jenis kelamin kamu?', sub: 'Dipakai untuk menghitung kebutuhan kalori dasar (BMR).' },
  birth: { title: 'Kapan kamu lahir?', sub: 'Umur memengaruhi kebutuhan kalori.' },
  height: { title: 'Berapa tinggi badanmu?', sub: 'Geser penggaris atau pakai tombol − dan +.' },
  weight: { title: 'Berapa berat badanmu sekarang?', sub: 'Sebaiknya timbang pagi hari sebelum makan.' },
  activity: { title: 'Seberapa aktif kamu?', sub: 'Pilih yang paling mirip dengan minggu biasa.' },
  goal: { title: 'Apa goal kamu?', sub: 'Bisa diganti kapan saja di Profil.' },
  target: { title: 'Target berat kamu?', sub: 'Dipakai untuk proyeksi progres. Boleh dilewati.' },
  bodyfat: { title: '% lemak tubuh dari scan?', sub: 'Kalau ada, BMR memakai rumus Katch-McArdle yang lebih akurat.' },
};

const kgText = (kg: number) => (fmt(kg, 1).includes(',') ? fmt(kg, 1) : `${fmt(kg, 1)},0`);

function BigValue({ value, unit }: { value: string; unit: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
      <span data-testid="ob-value" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{value}</span>
      <span className="muted" style={{ fontSize: 20, fontWeight: 600 }}>{unit}</span>
    </div>
  );
}

export function OnboardingWizard() {
  const [sex, setSex] = useState<'male' | 'female' | null>(null);
  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [height, setHeight] = useState(165);
  const [weight, setWeight] = useState(60);
  const [activity, setActivity] = useState(1.55);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [bf, setBf] = useState(20);
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const haptic = useHaptics(null);

  const steps = onboardingSteps(goal ?? 'bulk');
  const step = steps[at];
  const last = at === steps.length - 1;

  if (result) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Target harian kamu</h1>
        <TargetEditor computed={result.values} inputs={result.inputs} leanMassKg={result.leanMassKg} />
      </div>
    );
  }

  const go = (d: 1 | -1) => { setError(null); setDir(d === 1 ? 'fwd' : 'back'); setAt((i) => Math.min(steps.length - 1, Math.max(0, i + d))); };

  function chooseGoal(g: Goal) {
    setGoal(g);
    if (g !== 'maintain') setTarget(Math.round((weight + (g === 'bulk' ? 3 : -3)) * 10) / 10);
  }

  async function finish(bodyFat: number | null) {
    setBusy(true);
    setError(null);
    const pad = (n: number) => String(n).padStart(2, '0');
    try {
      setResult(await onboardAction({
        sex: sex!, birthDate: `${year}-${pad(month)}-${pad(day)}`, heightCm: height, activityFactor: activity, weightKg: weight,
        bfPct: bodyFat, goal: goal!, targetWeightKg: goal === 'maintain' ? null : target,
      }));
    } catch {
      setError('Gagal menghitung target. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 68 }, (_, i) => thisYear - 13 - i).reverse().map((y) => ({ value: y, label: String(y) }));
  const days = Array.from({ length: clampDay(year, month, 31) }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
  const tick = () => haptic(0, 0.1);

  const body: Record<StepId, ReactNode> = {
    sex: (
      <div role="radiogroup" aria-label="Jenis kelamin" className="ob-list">
        <ChoiceCard title="Pria" selected={sex === 'male'} onSelect={() => setSex('male')} />
        <ChoiceCard title="Wanita" selected={sex === 'female'} onSelect={() => setSex('female')} />
      </div>
    ),
    birth: (
      <div style={{ display: 'flex', gap: 8 }}>
        <WheelPicker label="Tanggal" items={days} value={day} onChange={setDay} onTick={tick} />
        <WheelPicker label="Bulan" items={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} value={month} onTick={tick}
          onChange={(m) => { setMonth(m); setDay((d) => clampDay(year, m, d)); }} />
        <WheelPicker label="Tahun" items={years} value={year} onTick={tick}
          onChange={(y) => { setYear(y); setDay((d) => clampDay(y, month, d)); }} />
      </div>
    ),
    height: (
      <div className="ob-measure">
        <BigValue value={fmt(height)} unit="cm" />
        <Ruler value={height} min={100} max={250} step={1} label="Tinggi badan dalam sentimeter" unitWord="sentimeter"
          onChange={(v) => { haptic(height / 10, v / 10); setHeight(v); }} />
      </div>
    ),
    weight: (
      <div className="ob-measure">
        <BigValue value={kgText(weight)} unit="kg" />
        <WeightRuler valueKg={weight} onChange={(v) => { haptic(weight, v); setWeight(v); }} />
      </div>
    ),
    activity: (
      <div role="radiogroup" aria-label="Tingkat aktivitas" className="ob-list">
        {ACTIVITY.map(([f, desc]) => (
          <ChoiceCard key={f} title={ACTIVITY_TITLE[f]} description={desc} selected={activity === f} onSelect={() => setActivity(f)} />
        ))}
      </div>
    ),
    goal: (
      <div role="radiogroup" aria-label="Goal" className="ob-list">
        {GOALS.map((g) => <ChoiceCard key={g.id} title={g.title} description={g.description} selected={goal === g.id} onSelect={() => chooseGoal(g.id)} />)}
      </div>
    ),
    target: (
      <div className="ob-measure">
        <BigValue value={kgText(target ?? weight)} unit="kg" />
        <WeightRuler valueKg={target ?? weight} label="Target berat dalam kilogram" onChange={(v) => { haptic(target ?? weight, v); setTarget(v); }} />
        <p className="muted" style={{ margin: 0, textAlign: 'center', fontSize: 14 }}>
          {target != null && `${target > weight ? '+' : target < weight ? '−' : ''}${fmt(Math.abs(target - weight), 1)} kg dari berat sekarang`}
        </p>
      </div>
    ),
    bodyfat: (
      <div className="ob-measure">
        <BigValue value={fmt(bf, 1)} unit="%" />
        <Ruler value={bf} min={3} max={60} step={0.1} label="Persen lemak tubuh" unitWord="persen"
          onChange={(v) => { haptic(bf, v); setBf(v); }} />
      </div>
    ),
  };

  const canNext = (step === 'sex' && sex != null) || (step === 'goal' && goal != null) || (step !== 'sex' && step !== 'goal');

  return (
    <div className="ob-shell">
      <header style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" className="btn" aria-label="Kembali" onClick={() => go(-1)}
          style={{ width: 44, padding: 0, borderRadius: 22, visibility: at === 0 ? 'hidden' : 'visible' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        </button>
        <div role="progressbar" aria-label="Progres onboarding" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={at + 1}
          className="inset" style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <div className="ob-progress" style={{ width: `${((at + 1) / steps.length) * 100}%` }} />
        </div>
      </header>

      <section key={step} className="ob-step" data-dir={dir} aria-labelledby="ob-title">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 id="ob-title" style={{ margin: 0, fontSize: 30, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.01em' }}>{COPY[step].title}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{COPY[step].sub}</p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBlock: 24 }}>{body[step]}</div>
      </section>

      <footer className="ob-footer">
        {error && <p role="alert" style={{ margin: 0, color: '#a33a10', fontWeight: 600, textAlign: 'center' }}>{error}</p>}
        {last ? (
          <>
            <button type="button" className="btn navy ob-cta" disabled={busy} onClick={() => finish(bf)}>Hitung target</button>
            <button type="button" className="btn ob-skip" disabled={busy} onClick={() => finish(null)}>Belum punya, lewati</button>
          </>
        ) : (
          <>
            <button type="button" className="btn navy ob-cta" disabled={!canNext} onClick={() => go(1)}>Lanjut</button>
            {step === 'target' && <button type="button" className="btn ob-skip" onClick={() => { setTarget(null); go(1); }}>Lewati</button>}
          </>
        )}
      </footer>
    </div>
  );
}
