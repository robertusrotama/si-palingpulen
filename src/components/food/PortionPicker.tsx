'use client';

import { fmt } from '@/lib/format';
import { NumberField } from '../form/NumberField';

export type Portion = { label: string; grams: number; is_calibrated?: boolean };

/** Chip porsi + isian gram dengan tombol −/+ 10 g. */
export function PortionPicker({
  portions, grams, onChange,
}: { portions: Portion[]; grams: number | null; onChange: (grams: number, label: string | null) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {portions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {portions.map((p) => {
            const on = grams === Number(p.grams);
            return (
              <button key={p.label} type="button" className={`btn${on ? ' raised hatch' : ''}`} aria-pressed={on}
                onClick={() => onChange(Number(p.grams), p.label)} style={{ fontSize: 14, fontWeight: on ? 700 : 600 }}>
                {p.label}, {fmt(Number(p.grams))} g{p.is_calibrated ? ' (ditimbang)' : ''}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <button type="button" className="btn" aria-label="Kurangi 10 gram" style={{ width: 48, padding: 0, fontSize: 22 }}
          onClick={() => onChange(Math.max(1, (grams ?? 0) - 10), null)}>−</button>
        <NumberField key={grams ?? 'x'} label="Berat (g)" value={grams} onChange={(v) => v != null && v > 0 && onChange(v, null)} style={{ flex: 1 }} />
        <button type="button" className="btn" aria-label="Tambah 10 gram" style={{ width: 48, padding: 0, fontSize: 22 }}
          onClick={() => onChange((grams ?? 0) + 10, null)}>+</button>
      </div>
    </div>
  );
}
