'use client';

import { fmt } from '@/lib/format';

const STEP_PX = 12;

type Props = {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  /** Besar satu tick dan satu tekan tombol −/+ (mis. 0,1 kg atau 1 cm). */
  step: number;
  /** Nama aksesibel slider, mis. "Berat badan dalam kilogram". */
  label: string;
  /** Kata satuan untuk pembaca layar, mis. "kilogram". */
  unitWord: string;
};

/** Penggaris geser + slider native + tombol −/+ satu langkah (spec F6), untuk angka apa pun. */
export function Ruler({ value, onChange, min, max, step, label, unitWord }: Props) {
  const decimals = step < 1 ? 1 : 0;
  const t = Math.round(value / step);
  const ticks = Array.from({ length: 29 }, (_, i) => t + i - 14);
  const clamp = (v: number) => {
    const n = Math.round(Math.min(max, Math.max(min, v)) / step) * step;
    return Number(n.toFixed(decimals));
  };
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="inset" aria-hidden="true" style={{ position: 'relative', width: '100%', height: 92, overflow: 'hidden', borderRadius: 16 }}>
        {ticks.map((v, i) => {
          const major = v % 10 === 0;
          const half = v % 5 === 0;
          return (
            <div key={v} style={{ position: 'absolute', bottom: 0, left: `calc(50% + ${(i - 14) * STEP_PX - 1}px)`, width: 2, borderRadius: 1,
              height: major ? 40 : half ? 28 : 16, background: major ? 'var(--ink)' : '#8E9AAA' }}>
              {major && <span style={{ position: 'absolute', bottom: 46, left: -19, width: 40, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{fmt(v * step, decimals)}</span>}
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: '50%', top: 6, bottom: 0, width: 3, marginLeft: -1.5, borderRadius: 2, background: 'var(--accent)' }} />
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 12, height: 12, marginLeft: -6, borderRadius: '50%', background: 'var(--accent)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" className="btn" aria-label={`Kurangi ${fmt(step, decimals)} ${unitWord}`} style={{ width: 48, padding: 0, fontSize: 22 }} onClick={() => onChange(clamp(value - step))}>−</button>
        <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
          aria-valuetext={`${fmt(value, decimals)} ${unitWord}`} onChange={(e) => onChange(clamp(Number(e.target.value)))}
          style={{ flex: 1, height: 44, accentColor: '#141B2D' }} />
        <button type="button" className="btn" aria-label={`Tambah ${fmt(step, decimals)} ${unitWord}`} style={{ width: 48, padding: 0, fontSize: 22 }} onClick={() => onChange(clamp(value + step))}>+</button>
      </div>
    </div>
  );
}
