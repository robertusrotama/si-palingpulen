'use client';

import { useEffect, useState } from 'react';
import { NumberField } from '@/components/form/NumberField';
import { NutrientPreview } from '@/components/food/NutrientPreview';
import { recipePer100 } from '@/lib/calc/nutrition';
import type { Nutrients } from '@/lib/calc/types';
import { toFoodNutrition } from '@/lib/db/foods';
import type { FoodRow } from '@/lib/db/types';
import { fmt } from '@/lib/format';
import { createEstimateFoodAction, createLabelFoodAction, saveRecipeAction, searchFoodsAction } from '../actions';

type Mode = 'label' | 'recipe' | 'estimate';
const MODES: { id: Mode; label: string }[] = [
  { id: 'label', label: 'Dari label' }, { id: 'recipe', label: 'Rakit resep' }, { id: 'estimate', label: 'Estimasi cepat' },
];
const FIELDS: { key: keyof Nutrients; label: string; required?: boolean }[] = [
  { key: 'kcal', label: 'Kalori (kkal)', required: true },
  { key: 'protein_g', label: 'Protein (g)', required: true },
  { key: 'carb_g', label: 'Karbo (g)', required: true },
  { key: 'fat_g', label: 'Lemak (g)', required: true },
  { key: 'fiber_g', label: 'Serat (g)' },
  { key: 'sugar_g', label: 'Gula total (g)' },
  { key: 'sodium_mg', label: 'Natrium (mg)' },
  { key: 'satfat_g', label: 'Lemak jenuh (g)' },
];

export function NewFoodForm() {
  const [mode, setMode] = useState<Mode>('label');
  const [name, setName] = useState('');
  const [values, setValues] = useState<Partial<Nutrients>>({});
  const [serving, setServing] = useState<number | null>(null);
  const [addedSugar, setAddedSugar] = useState<number | null>(null);
  const [items, setItems] = useState<{ food: FoodRow; grams: number | null }[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoodRow[]>([]);
  const [portionName, setPortionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (mode !== 'recipe' || !q.trim()) return;
    let alive = true;
    const t = setTimeout(() => searchFoodsAction(q).then((r) => alive && setResults(r.filter((f) => f.source !== 'recipe'))), 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q, mode]);

  const valid = items.filter((i) => i.grams && i.grams > 0) as { food: FoodRow; grams: number }[];
  const recipe = recipePer100(valid.map((i) => ({ food: toFoodNutrition(i.food), grams: i.grams })));
  const totalGrams = valid.reduce((s, i) => s + i.grams, 0);
  const totalKcal = ((recipe.per100.kcal ?? 0) * totalGrams) / 100;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Nama makanan wajib diisi.');
    setPending(true);
    try {
      if (mode === 'recipe') {
        if (!valid.length) throw new Error('Tambahkan minimal satu bahan.');
        await saveRecipeAction({
          name, aliases: [], items: valid.map((i) => ({ foodId: i.food.id, grams: i.grams })),
          portions: portionName.trim() ? [{ label: portionName.trim(), grams: totalGrams }] : [],
        });
      } else {
        for (const f of FIELDS) if (f.required && values[f.key] == null) throw new Error(`${f.label} wajib diisi.`);
        if (mode === 'label') {
          if (!serving) throw new Error('Ukuran sajian wajib diisi.');
          await createLabelFoodAction({ name, aliases: [], servingG: serving, perServing: values, addedSugarPerServing: addedSugar });
        } else {
          await createEstimateFoodAction({ name, aliases: [], per100: values });
        }
      }
    } catch (err) {
      if ((err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw err;
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="inset" role="group" aria-label="Cara menambah" style={{ padding: 5, borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
        {MODES.map((m) => (
          <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}
            className={mode === m.id ? 'btn raised hatch' : 'btn'}
            style={mode === m.id ? { fontSize: 14, fontWeight: 700 } : { fontSize: 14, background: 'transparent', boxShadow: 'none', borderColor: 'transparent' }}>
            {m.label}
          </button>
        ))}
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="label">Nama makanan</span>
        <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
      </label>

      {mode !== 'recipe' && (
        <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'label' && <NumberField label="Ukuran sajian (g)" value={serving} onChange={setServing} required />}
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {mode === 'label' ? 'Isi nilai per sajian, persis seperti di label.' : 'Isi perkiraan nilai per 100 g. Hasilnya ditandai Estimasi.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {FIELDS.map((f) => (
              <NumberField key={`${mode}-${f.key}`} label={f.label} value={values[f.key] ?? null}
                onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} required={f.required} />
            ))}
            {mode === 'label' && <NumberField label="Gula tambahan (g)" value={addedSugar} onChange={setAddedSugar} />}
          </div>
        </section>
      )}

      {mode === 'recipe' && (
        <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="label">Cari bahan</span>
            <input type="search" className="field-input" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          {q.trim() && results.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.slice(0, 6).map((f) => (
                <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1 }}>{f.name}</span>
                  <button type="button" className="btn" aria-label={`Tambah ${f.name}`}
                    onClick={() => { setItems((s) => [...s, { food: f, grams: null }]); setQ(''); setResults([]); }}>Tambah</button>
                </li>
              ))}
            </ul>
          )}
          {items.map((i, idx) => (
            <div key={`${i.food.id}-${idx}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <NumberField label={`Gram ${i.food.name}`} value={i.grams}
                onChange={(v) => setItems((s) => s.map((x, j) => (j === idx ? { ...x, grams: v } : x)))} style={{ flex: 1 }} />
              <button type="button" className="btn" onClick={() => setItems((s) => s.filter((_, j) => j !== idx))}>Hapus</button>
            </div>
          ))}
          {valid.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Total {fmt(totalGrams)} g</span>
                <span data-testid="recipe-total-kcal">{fmt(totalKcal)} kkal</span>
              </div>
              <span className="label">Per 100 g</span>
              <NutrientPreview values={recipe.per100} partial={recipe.partial} />
            </>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="label">Nama porsi untuk 1 resep</span>
            <input className="field-input" value={portionName} onChange={(e) => setPortionName(e.target.value)} placeholder="contoh: 1 piring" maxLength={60} />
          </label>
        </section>
      )}

      {error && <p role="alert" style={{ margin: 0, color: '#a33a10', fontWeight: 600 }}>{error}</p>}
      <button type="submit" className="btn navy" disabled={pending} style={{ minHeight: 52 }}>Simpan makanan</button>
    </form>
  );
}
