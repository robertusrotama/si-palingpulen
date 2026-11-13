'use client';

import { useState } from 'react';
import { NumberField } from '@/components/form/NumberField';
import { TargetEditor } from '@/components/targets/TargetEditor';
import { ACTIVITY } from '@/lib/activity';
import { onboardAction } from './actions';


type Result = Awaited<ReturnType<typeof onboardAction>>;

export function OnboardingForm() {
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState<number | null>(null);
  const [activity, setActivity] = useState(1.55);
  const [weight, setWeight] = useState<number | null>(null);
  const [bf, setBf] = useState<number | null>(null);
  const [goal, setGoal] = useState<'bulk' | 'cut' | 'maintain'>('bulk');
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (result) return <TargetEditor computed={result.values} inputs={result.inputs} leanMassKg={result.leanMassKg} />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!birthDate || !height || !weight) return setError('Tanggal lahir, tinggi, dan berat wajib diisi.');
    setBusy(true);
    try {
      setResult(await onboardAction({ sex, birthDate, heightCm: height, activityFactor: activity, weightKg: weight, bfPct: bf, goal, targetWeightKg: targetWeight }));
    } catch {
      setError('Data belum valid. Periksa lagi isiannya.');
    } finally {
      setBusy(false);
    }
  }

  const radio = (name: string, value: string, label: string, checked: boolean, on: () => void) => (
    <label key={value} className={checked ? 'btn raised hatch' : 'btn'} style={{ flex: 1, fontWeight: checked ? 700 : 600 }}>
      <input type="radio" name={name} value={value} checked={checked} onChange={on} style={{ width: 18, height: 18 }} />{label}
    </label>
  );

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="label" style={{ margin: 0 }}>Profil tubuh</h2>
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', gap: 8 }}>
          <legend className="label" style={{ marginBottom: 6 }}>Jenis kelamin</legend>
          {radio('sex', 'male', 'Pria', sex === 'male', () => setSex('male'))}
          {radio('sex', 'female', 'Wanita', sex === 'female', () => setSex('female'))}
        </fieldset>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="label">Tanggal lahir</span>
          <input type="date" className="field-input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
        </label>
        <NumberField label="Tinggi (cm)" value={height} onChange={setHeight} required />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="label">Faktor aktivitas</span>
          <select className="field-input" value={activity} onChange={(e) => setActivity(Number(e.target.value))}>
            {ACTIVITY.map(([f, l]) => <option key={f} value={f}>{String(f).replace('.', ',')} · {l}</option>)}
          </select>
        </label>
      </section>
      <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="label" style={{ margin: 0 }}>Berat dan scan</h2>
        <NumberField label="Berat (kg)" value={weight} onChange={setWeight} required />
        <NumberField label="% lemak dari scan (opsional)" value={bf} onChange={setBf} />
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Kalau ada % lemak, BMR memakai rumus Katch-McArdle. Hasil scan lengkap bisa diisi nanti.</p>
      </section>
      <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', gap: 8 }}>
          <legend className="label" style={{ marginBottom: 6 }}>Goal</legend>
          {radio('goal', 'bulk', 'Bulking', goal === 'bulk', () => setGoal('bulk'))}
          {radio('goal', 'cut', 'Cutting', goal === 'cut', () => setGoal('cut'))}
          {radio('goal', 'maintain', 'Maintain', goal === 'maintain', () => setGoal('maintain'))}
        </fieldset>
        <NumberField label="Target berat (kg, opsional)" value={targetWeight} onChange={setTargetWeight} />
      </section>
      {error && <p role="alert" style={{ margin: 0, color: '#a33a10', fontWeight: 600 }}>{error}</p>}
      <button type="submit" className="btn navy" disabled={busy} style={{ minHeight: 52 }}>Hitung target</button>
    </form>
  );
}
