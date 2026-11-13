'use client';

import { useState } from 'react';
import { TargetEditor } from '@/components/targets/TargetEditor';
import type { BmrMethod, CalcInputs, TargetValues } from '@/lib/calc/targets';
import { ACTIVITY } from '@/lib/activity';
import { fmt } from '@/lib/format';
import { previewTargetsAction } from './actions';

type Calc = { values: TargetValues; inputs: CalcInputs; leanMassKg: number | null };
const METHODS: { id: BmrMethod; label: string }[] = [
  { id: 'auto', label: 'Otomatis' }, { id: 'katch', label: 'Katch' }, { id: 'mifflin', label: 'Mifflin' }, { id: 'scan', label: 'Alat scan' },
];

export function TargetScreen({ calc, current, method, activity }: { calc: Calc; current: TargetValues | null; method: BmrMethod; activity: number }) {
  const [c, setC] = useState(calc);
  const [m, setM] = useState(method);
  const [a, setA] = useState(activity);
  const [version, setVersion] = useState(0);
  async function change(next: { m?: BmrMethod; a?: number }) {
    const nm = next.m ?? m;
    const na = next.a ?? a;
    setM(nm);
    setA(na);
    setC(await previewTargetsAction({ bmrMethod: nm, activityFactor: na }));
    setVersion((x) => x + 1);
  }
  const changed = m !== method || a !== activity;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="panel" aria-label="Metode BMR dan aktivitas" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="label">Metode BMR</span>
        <div className="inset" role="group" aria-label="Metode BMR" style={{ padding: 5, borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4 }}>
          {METHODS.map((x) => (
            <button key={x.id} type="button" aria-pressed={m === x.id} onClick={() => change({ m: x.id })} className={m === x.id ? 'btn raised hatch' : 'btn'}
              style={m === x.id ? { padding: '0 4px', fontSize: 13, fontWeight: 700 } : { padding: '0 4px', fontSize: 13, background: 'transparent', boxShadow: 'none', borderColor: 'transparent' }}>{x.label}</button>
          ))}
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="label">Faktor aktivitas</span>
          <select className="field-input" value={a} onChange={(e) => change({ a: Number(e.target.value) })}>
            {ACTIVITY.map(([f, l]) => <option key={f} value={f}>{fmt(f, 3)} · {l}</option>)}
          </select>
        </label>
      </section>
      <TargetEditor key={version} computed={c.values} inputs={c.inputs} leanMassKg={c.leanMassKg}
        initial={version === 0 ? current ?? undefined : undefined}
        profileChange={changed ? { activityFactor: a, bmrMethod: m } : undefined} />
    </div>
  );
}
