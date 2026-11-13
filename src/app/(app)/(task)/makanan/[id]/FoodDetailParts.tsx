'use client';

import { useState } from 'react';
import { NumberField } from '@/components/form/NumberField';
import { fmt } from '@/lib/format';
import type { PortionRow } from '@/lib/db/types';
import { applyToPastAction, archiveFoodAction, savePortionAction, toggleFavoriteAction } from '../actions';

export function PortionEditor({ foodId, portion }: { foodId: string; portion: PortionRow }) {
  const [grams, setGrams] = useState<number | null>(Number(portion.grams));
  const [cal, setCal] = useState(portion.is_calibrated);
  return (
    <li style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0', borderTop: '1px solid var(--hair)' }}>
      <span style={{ fontWeight: 600 }}>
        <span>{portion.label}</span> · <span>{fmt(Number(portion.grams))} g</span>{portion.is_calibrated ? ' · ditimbang' : ''}
      </span>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <NumberField label={`Gram untuk ${portion.label}`} value={grams} onChange={setGrams} style={{ flex: '1 1 140px' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
          <input type="checkbox" checked={cal} onChange={(e) => setCal(e.target.checked)} aria-label={`Sudah ditimbang: ${portion.label}`} style={{ width: 22, height: 22 }} />
          <span style={{ fontSize: 14 }}>Sudah ditimbang</span>
        </label>
        <button type="button" className="btn" aria-label={`Simpan porsi ${portion.label}`} disabled={!grams || grams <= 0}
          onClick={() => grams && savePortionAction({ foodId, label: portion.label, grams, isCalibrated: cal })}>Simpan</button>
      </div>
    </li>
  );
}

export function FoodActions({ id, favorite }: { id: string; favorite: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn" aria-pressed={favorite} onClick={() => toggleFavoriteAction(id, !favorite)}>
          {favorite ? 'Hapus dari favorit' : 'Jadikan favorit'}
        </button>
        <button type="button" className="btn" onClick={async () => { const r = await archiveFoodAction(id); if (r?.error) setMsg(r.error); }}>
          Arsipkan
        </button>
      </div>
      <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <legend className="label">Terapkan nilai baru ke entri lama</legend>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span className="label">Dari</span><input type="date" className="field-input" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span className="label">Sampai</span><input type="date" className="field-input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <button type="button" className="btn" disabled={!from || !to}
            onClick={async () => setMsg(`${await applyToPastAction(id, from, to)} entri diperbarui.`)}>Terapkan</button>
        </div>
      </fieldset>
      {msg && <p role="status" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
    </section>
  );
}
