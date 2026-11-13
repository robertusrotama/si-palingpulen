'use client';

import { useId, useState } from 'react';
import { parseDecimal } from '@/lib/validation/number';

/** Isian angka yang menerima koma atau titik desimal. */
export function NumberField({
  label, value, onChange, required, placeholder, style, testId,
}: {
  label: string; value: number | null; onChange: (v: number | null) => void;
  required?: boolean; placeholder?: string; style?: React.CSSProperties; testId?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value == null ? '' : String(value).replace('.', ','));
  const invalid = text.trim() !== '' && parseDecimal(text) == null;
  return (
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <span className="label">{label}</span>
      <input
        id={id} data-testid={testId} inputMode="decimal" className="field-input" value={text} placeholder={placeholder}
        required={required} aria-invalid={invalid || undefined}
        onChange={(e) => { setText(e.target.value); onChange(parseDecimal(e.target.value)); }}
      />
      {invalid && <span role="alert" style={{ fontSize: 12, color: '#a33a10' }}>Angka tidak valid</span>}
    </label>
  );
}
