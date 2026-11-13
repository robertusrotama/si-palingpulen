import { fmt } from '@/lib/format';
import type { NutrientKey, Nutrients } from '@/lib/calc/types';

const ITEMS: { key: NutrientKey; label: string; digits: number }[] = [
  { key: 'kcal', label: 'kkal', digits: 0 },
  { key: 'protein_g', label: 'protein', digits: 1 },
  { key: 'carb_g', label: 'karbo', digits: 0 },
  { key: 'fat_g', label: 'lemak', digits: 1 },
  { key: 'fiber_g', label: 'serat', digits: 1 },
];

/** Pratinjau 5 nilai utama; nilai tidak diketahui tampil "?" dengan keterangan. */
export function NutrientPreview({ values, partial = [] }: { values: Partial<Nutrients>; partial?: NutrientKey[] }) {
  return (
    <div className="inset" style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4, textAlign: 'center', borderRadius: 14 }}>
      {ITEMS.map((i) => {
        const v = values[i.key];
        return (
          <div key={i.key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }} aria-label={v == null ? `${i.label} tidak diketahui` : undefined}>
              {v == null ? '?' : fmt(v, i.digits)}{partial.includes(i.key) ? '*' : ''}
            </span>
            <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>{i.label}</span>
          </div>
        );
      })}
    </div>
  );
}
