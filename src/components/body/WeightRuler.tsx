'use client';

import { Ruler } from '@/components/form/Ruler';

/** Penggaris berat badan, langkah 0,1 kg (spec F6). */
export function WeightRuler({ valueKg, onChange, min = 30, max = 200, label = 'Berat badan dalam kilogram' }: {
  valueKg: number; onChange: (kg: number) => void; min?: number; max?: number; label?: string;
}) {
  return <Ruler value={valueKg} onChange={onChange} min={min} max={max} step={0.1} label={label} unitWord="kilogram" />;
}
