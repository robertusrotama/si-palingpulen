'use client';

import { useEffect, useState } from 'react';
import { NumberField } from '@/components/form/NumberField';
import { Switch } from '@/components/profile/Switch';
import { ACTIVITY } from '@/lib/activity';
import type { Goal } from '@/lib/db/goals';
import type { Profile, ReminderId } from '@/lib/db/profile';
import { fmt } from '@/lib/format';
import { saveBodyProfileAction, signOutAction, startGoalAction, updateSettingsAction } from './actions';

const GOAL_NAME = { bulk: 'Bulking', cut: 'Cutting', maintain: 'Maintain' } as const;
const REMINDERS: { label: string; ids: ReminderId[] }[] = [
  { label: 'Pengingat timbang pagi', ids: ['weigh_in'] },
  { label: 'Pengingat makan siang', ids: ['lunch_missing'] },
  { label: 'Pengingat air dan serat', ids: ['water_low', 'fiber_low'] },
];
const DATE = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const d = (s: string) => DATE.format(new Date(`${s}T00:00:00Z`));

export function ProfileSettings({ profile, goals }: { profile: Profile; goals: Goal[] }) {
  const [p, setP] = useState(profile);
  const [status, setStatus] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState(false);
  const [goalType, setGoalType] = useState<Goal['type']>('bulk');
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [goalBf, setGoalBf] = useState<number | null>(null);
  const active = goals.find((g) => g.endDate == null);
  const [reduced, setReduced] = useState(false);
  // matchMedia hanya ada di browser; dibaca setelah hydrate.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches), []);
  const hapticsOn = p.hapticsEnabled ?? !reduced;

  async function save(patch: Parameters<typeof updateSettingsAction>[0]) {
    setP((s) => ({ ...s, ...patch }) as Profile);
    setStatus(null);
    await updateSettingsAction(patch);
    setStatus('Tersimpan');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {status && <p role="status" className="muted" style={{ margin: 0, fontWeight: 600 }}>{status}</p>}

      <section className="panel" aria-label="Akun" style={{ padding: 16, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="label">Nama</span>
          <input className="field-input" defaultValue={p.displayName ?? ''} placeholder="[Nama]" maxLength={60}
            onBlur={(e) => e.target.value.trim() !== (p.displayName ?? '') && save({ displayName: e.target.value.trim() || null })} />
        </label>
        <span className="muted" style={{ fontSize: 13, paddingBottom: 14 }}>Masuk lewat magic link email</span>
      </section>

      <section className="panel" aria-label="Profil tubuh" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="label" style={{ margin: 0 }}>Profil tubuh</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="label">Jenis kelamin</span>
            <select className="field-input" value={p.sex} onChange={(e) => setP({ ...p, sex: e.target.value as Profile['sex'] })}>
              <option value="male">Pria</option><option value="female">Wanita</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="label">Tanggal lahir</span>
            <input type="date" className="field-input" value={p.birthDate} onChange={(e) => setP({ ...p, birthDate: e.target.value })} />
          </label>
          <NumberField label="Tinggi (cm)" value={p.heightCm} onChange={(v) => v && setP({ ...p, heightCm: v })} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="label">Faktor aktivitas</span>
            <select className="field-input" value={p.activityFactor} onChange={(e) => setP({ ...p, activityFactor: Number(e.target.value) })}>
              {ACTIVITY.map(([f, l]) => <option key={f} value={f}>{fmt(f, 3)} · {l}</option>)}
            </select>
          </label>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>Zona waktu: {p.timezone === 'Asia/Jakarta' ? 'WIB (Asia/Jakarta)' : p.timezone}</span>
        <button type="button" className="btn" style={{ alignSelf: 'flex-start' }}
          onClick={async () => { await saveBodyProfileAction(p); setStatus('Tersimpan'); }}>Simpan profil tubuh</button>
      </section>

      <section className="panel" aria-label="Goal" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="label" style={{ margin: 0 }}>Goal</h2>
        {active ? <a href="/target" style={{ fontWeight: 600 }}>{GOAL_NAME[active.type]}, aktif sejak {d(active.startDate)}</a> : <span className="muted">Belum ada goal aktif.</span>}
        <details>
          <summary style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>Riwayat fase ({goals.length})</summary>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {goals.map((g) => <li key={g.id}>{GOAL_NAME[g.type]}: {d(g.startDate)} sampai {g.endDate ? d(g.endDate) : 'sekarang'}</li>)}
          </ul>
        </details>
        {!newGoal ? (
          <button type="button" className="btn" onClick={() => setNewGoal(true)}>Mulai goal baru</button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span className="label">Jenis goal</span>
              <select className="field-input" value={goalType} onChange={(e) => setGoalType(e.target.value as Goal['type'])}>
                <option value="bulk">Bulking</option><option value="cut">Cutting</option><option value="maintain">Maintain</option>
              </select>
            </label>
            <NumberField label="Target berat (kg, opsional)" value={goalWeight} onChange={setGoalWeight} />
            <NumberField label="Batas % lemak (opsional)" value={goalBf} onChange={setGoalBf} />
            <button type="button" className="btn navy" onClick={() => startGoalAction({ type: goalType, targetWeightKg: goalWeight, targetBfPct: goalBf, targetDate: null })}>
              Mulai goal ini
            </button>
          </div>
        )}
      </section>

      <section className="panel" aria-label="Pengaturan" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="label" style={{ margin: 0 }}>Pengaturan</h2>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="label">Metode BMR</span>
          <select className="field-input" value={p.bmrMethod} onChange={(e) => save({ bmrMethod: e.target.value as Profile['bmrMethod'] })}>
            <option value="auto">Otomatis (Katch jika ada scan baru)</option>
            <option value="katch">Katch-McArdle</option>
            <option value="mifflin">Mifflin-St Jeor</option>
            <option value="scan">BMR dari alat scan</option>
          </select>
        </label>
        <NumberField label="Margin error alat scan (kg)" value={p.leanErrorKg} onChange={(v) => v && v >= 0.1 && v <= 5 && save({ leanErrorKg: v })} />
        {REMINDERS.map((r) => {
          const on = !r.ids.every((id) => p.remindersDisabled.includes(id));
          return (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderTop: '1px solid var(--hair)' }}>
              <span>{r.label}</span>
              <Switch label={r.label} checked={on} onChange={(v) => save({
                remindersDisabled: v ? p.remindersDisabled.filter((x) => !r.ids.includes(x)) : [...new Set([...p.remindersDisabled, ...r.ids])],
              })} />
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderTop: '1px solid var(--hair)' }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Getar saat menggeser</span>
            <span className="muted" style={{ fontSize: 12 }}>Android: getar resmi. iPhone: cara tidak resmi, bisa tidak terasa.</span>
          </span>
          <Switch label="Getar saat menggeser" checked={hapticsOn} onChange={(v) => save({ hapticsEnabled: v })} />
        </div>
      </section>

      <button type="button" className="btn" onClick={() => signOutAction()}>Keluar</button>
    </div>
  );
}
