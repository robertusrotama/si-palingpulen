'use client';

import { useState } from 'react';
import { NumberField } from '../form/NumberField';
import type { CalcInputs, TargetValues } from '@/lib/calc/targets';
import { fmt } from '@/lib/format';
import { saveTargetsAction } from '@/app/(app)/(tabs)/target/actions';

export const METHOD_NAME = { katch: 'Katch-McArdle', mifflin: 'Mifflin-St Jeor', scan: 'alat scan' } as const;

export function breakdownLine(i: CalcInputs) {
  const delta = Math.round(((i.ratePctPerWeek / 100) * i.weightKg * 7700) / 7);
  return `BMR ${fmt(i.bmr)} × ${fmt(i.activityFactor, 3)} ${delta >= 0 ? '+' : '−'} ${fmt(Math.abs(delta))}`;
}

/** Struk perhitungan (spec F1) dan isian target yang bisa diedit. */
export function TargetEditor({ computed, inputs, leanMassKg, initial, profileChange }: {
  computed: TargetValues; inputs: CalcInputs; leanMassKg: number | null; initial?: TargetValues;
  profileChange?: { activityFactor?: number; bmrMethod?: CalcInputs['method'] | 'auto' };
}) {
  const [v, setV] = useState<TargetValues>(initial ?? computed);
  const [saving, setSaving] = useState(false);
  const tdee = inputs.bmr * inputs.activityFactor;
  const surplus = ((inputs.ratePctPerWeek / 100) * inputs.weightKg * 7700) / 7;
  const field = (k: keyof TargetValues, label: string, hint: string, testId?: string) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '8px 0', borderTop: '1px solid var(--hair)' }}>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{label.replace(/ \(.*\)$/, '')}</span>
        <span className="muted" style={{ fontSize: 12 }}>{hint}</span>
      </span>
      <NumberField label={label} value={v[k]} testId={testId} onChange={(n) => n != null && setV((s) => ({ ...s, [k]: n }))} style={{ width: 130 }} />
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section aria-label="Rincian perhitungan" style={{ background: '#fff', borderRadius: 4, padding: '18px 18px 22px', boxShadow: '0 2px 4px rgba(56,78,110,.12), 0 14px 26px rgba(56,78,110,.12)', display: 'flex', flexDirection: 'column', gap: 9, fontSize: 15 }}>
        <span style={{ fontWeight: 700 }}>Rincian perhitungan</span>
        <div style={{ borderTop: '1px dashed #B9C3CF' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>BMR {METHOD_NAME[inputs.method]}</span><b>{fmt(inputs.bmr)}</b></div>
        {leanMassKg != null && <div className="muted" style={{ fontSize: 13 }}>lean mass {fmt(leanMassKg, 1)} kg</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>× aktivitas {fmt(inputs.activityFactor, 3)}</span><b>{fmt(tdee)}</b></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{surplus >= 0 ? '+ surplus' : '− defisit'} {fmt(Math.abs(inputs.ratePctPerWeek), 2)}% per minggu</span><b>{surplus >= 0 ? '+' : '−'}{fmt(Math.abs(surplus))}</b></div>
        <div style={{ borderTop: '1px dashed #B9C3CF' }} />
        <span className="muted" style={{ fontSize: 13 }}>{breakdownLine(inputs)}</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b>Target kalori</b><span style={{ fontSize: 24, fontWeight: 700 }}>{fmt(computed.kcal)} kkal</span></div>
      </section>

      <section className="panel" aria-label="Target harian" style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6 }}><span className="label">Target harian</span><span className="muted" style={{ fontSize: 12 }}>ketuk angka untuk ubah</span></div>
        {field('kcal', 'Kalori (kkal)', 'dari perhitungan di atas', 'target-kcal')}
        {field('protein_g', 'Protein (g)', '1,8 g per kg berat')}
        {field('fat_g', 'Lemak (g)', '25% kalori')}
        {field('carb_g', 'Karbo (g)', 'sisa kalori')}
        {field('fiber_g', 'Serat (g)', '14 g per 1.000 kkal, minimal 25 g')}
        {field('water_ml', 'Air minum (ml)', '35 ml per kg')}
        <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, textAlign: 'center' }}>
          <div><div className="muted" style={{ fontSize: 12 }}>Gula tambahan</div><b>maks {fmt(v.added_sugar_max_g)} g</b></div>
          <div><div className="muted" style={{ fontSize: 12 }}>Natrium</div><b>maks {fmt(v.sodium_max_mg)} mg</b></div>
          <div><div className="muted" style={{ fontSize: 12 }}>Lemak jenuh</div><b>maks {fmt(v.satfat_max_g)} g</b></div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setV(computed)}>Hitung ulang</button>
        <button type="button" className="btn navy" style={{ flex: 2 }} disabled={saving}
          onClick={() => { setSaving(true); void saveTargetsAction({ values: v, inputs, computed, ...profileChange }); }}>Simpan target</button>
      </div>
    </div>
  );
}
