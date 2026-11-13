'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NutrientPreview } from '@/components/food/NutrientPreview';
import { PortionPicker } from '@/components/food/PortionPicker';
import { SOURCE_LABEL } from '@/components/food/sourceLabel';
import { entryNutrients } from '@/lib/calc/nutrition';
import type { MealSlot } from '@/lib/calc/types';
import { localTime, mealSlotFor } from '@/lib/dates';
import { toFoodNutrition } from '@/lib/db/foods';
import type { FoodRow, PortionRow } from '@/lib/db/types';
import { fmt } from '@/lib/format';
import { foodAction, logEntriesAction, previewAction, repeatYesterdayAction, searchAction, applySavedMealAction } from './actions';

type Preview = Awaited<ReturnType<typeof previewAction>>;
type FoodWithPortions = FoodRow & { portions: PortionRow[] };
type CartItem = { food: FoodWithPortions; grams: number; portionLabel: string | null };

const SLOTS: { id: MealSlot; label: string; title: string }[] = [
  { id: 'breakfast', label: 'Sarapan', title: 'Sarapan' },
  { id: 'lunch', label: 'Siang', title: 'Makan siang' },
  { id: 'snack', label: 'Snack', title: 'Snack' },
  { id: 'dinner', label: 'Malam', title: 'Makan malam' },
  { id: 'other', label: 'Lainnya', title: 'Lainnya' },
];
type Tab = 'fav' | 'recent' | 'meals';

export function CatatFlow(props: {
  tz: string; today: string; initialSlot: MealSlot; initialTime: string; initialPreview: Preview;
  favorites: FoodRow[]; recent: FoodRow[]; savedMeals: { id: string; name: string; count: number }[];
}) {
  const router = useRouter();
  const [slot, setSlot] = useState<MealSlot>(props.initialSlot);
  const [time, setTime] = useState(props.initialTime);
  const [label, setLabel] = useState('');
  const [preview, setPreview] = useState<Preview>(props.initialPreview);
  const [tab, setTab] = useState<Tab>('fav');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoodRow[] | null>(null);
  const [picked, setPicked] = useState<FoodWithPortions | null>(null);
  const [grams, setGrams] = useState<number | null>(null);
  const [portionLabel, setPortionLabel] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jam klien menentukan waktu makan default (server bisa beda zona/jam).
  useEffect(() => {
    const t = localTime(new Date().toISOString(), props.tz);
    const s = mealSlotFor(t);
    // Jam klien hanya bisa dibaca setelah hydrate; setState di sini disengaja.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(t);
    if (s !== props.initialSlot) {
      setSlot(s);
      previewAction(s).then(setPreview);
    }
  }, [props.tz, props.initialSlot]);

  useEffect(() => {
    if (!q.trim()) return;
    let alive = true;
    const h = setTimeout(() => searchAction(q).then((r) => alive && setResults(r)), 200);
    return () => { alive = false; clearTimeout(h); };
  }, [q]);

  function chooseSlot(s: MealSlot) {
    setSlot(s);
    previewAction(s).then(setPreview);
  }

  async function pick(f: FoodRow) {
    const full = await foodAction(f.id);
    setPicked(full);
    const first = full.portions[0];
    setGrams(first ? Number(first.grams) : 100);
    setPortionLabel(first ? first.label : null);
  }

  function addToCart() {
    if (!picked || !grams) return;
    setCart((c) => [...c, { food: picked, grams, portionLabel }]);
    setPicked(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      await logEntriesAction(cart.map((c) => ({
        clientId: crypto.randomUUID(), date: props.today, mealSlot: slot, mealLabel: slot === 'other' ? label : null,
        loggedAt: nowIso, foodId: c.food.id, grams: c.grams, portionLabel: c.portionLabel,
      })));
      router.push('/');
    } catch {
      setError('Gagal menyimpan. Coba lagi.');
      setSaving(false);
    }
  }

  const cartKcal = cart.reduce((s, c) => s + (entryNutrients(toFoodNutrition(c.food), c.grams).values.kcal ?? 0), 0);
  const slotTitle = SLOTS.find((s) => s.id === slot)!.title;
  const list = q.trim() ? results ?? [] : tab === 'fav' ? props.favorites : props.recent;

  const foodRow = (f: FoodRow) => (
    <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderTop: '1px solid var(--hair)' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{f.name}</span>
        <span className="muted" style={{ fontSize: 13 }}>{SOURCE_LABEL[f.source]}, {fmt(Number(f.kcal))} kkal/100 g</span>
      </div>
      <button type="button" className="btn" aria-label={`Pilih ${f.name}`} style={{ width: 44, padding: 0 }} onClick={() => pick(f)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </li>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section aria-label="Waktu makan" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="inset" style={{ padding: 5, borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 3 }}>
          {SLOTS.map((s) => (
            <button key={s.id} type="button" aria-pressed={slot === s.id} onClick={() => chooseSlot(s.id)}
              className={slot === s.id ? 'btn raised hatch' : 'btn'}
              style={slot === s.id ? { padding: '0 2px', fontSize: 13, fontWeight: 700 } : { padding: '0 2px', fontSize: 13, background: 'transparent', boxShadow: 'none', borderColor: 'transparent' }}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 13, textAlign: 'center' }}>Dipilih dari jam {time.replace(':', '.')}, bisa diganti</span>
        {slot === 'other' && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="label">Nama (opsional)</span>
            <input className="field-input" value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder="contoh: Larut malam" />
          </label>
        )}
      </section>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="label">Cari makanan</span>
        <input type="search" className="field-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="contoh: gepre, nasi, whey" />
      </label>
      <button type="button" hidden>Foto</button>

      {preview && (
        <section aria-label={`${slotTitle} kemarin`} className="panel" style={{ padding: '12px 14px 14px', borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>{slotTitle} kemarin</h2>
          {preview.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 2px', borderTop: '1px solid var(--hair)', fontSize: 14 }}>
              <span style={{ flex: 1 }}>{it.name}</span><span className="muted">{it.portion}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: '1px solid var(--hair)' }}>
            <span className="inset" style={{ flex: 1, padding: '6px 10px', fontSize: 13, fontWeight: 600 }}>
              {fmt(preview.totals.kcal)} kkal · protein {fmt(preview.totals.protein_g)} g · serat {preview.totals.fiber_g == null ? '?' : fmt(preview.totals.fiber_g)} g
            </span>
            <button type="button" className="btn" onClick={() => repeatYesterdayAction(slot)}>Ulangi {preview.items.length} item</button>
          </div>
        </section>
      )}

      <section aria-label="Daftar makanan" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!q.trim() && (
          <div className="inset" style={{ padding: 5, borderRadius: 16, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 4 }}>
            {([['fav', 'Favorit'], ['recent', 'Terakhir'], ['meals', 'Meal tersimpan']] as const).map(([id, l]) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className={tab === id ? 'btn raised hatch' : 'btn'}
                style={tab === id ? { padding: '0 4px', fontSize: 14, fontWeight: 700 } : { padding: '0 4px', fontSize: 14, background: 'transparent', boxShadow: 'none', borderColor: 'transparent' }}>{l}</button>
            ))}
          </div>
        )}
        {tab === 'meals' && !q.trim() ? (
          <ul className="panel" style={{ listStyle: 'none', margin: 0, padding: '4px 12px' }}>
            {props.savedMeals.length === 0 && <li className="muted" style={{ padding: 12 }}>Belum ada meal tersimpan.</li>}
            {props.savedMeals.map((m) => (
              <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px' }}>
                <span style={{ flex: 1, fontWeight: 600 }}>{m.name} <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>{m.count} item</span></span>
                <button type="button" className="btn" onClick={() => applySavedMealAction(m.id, slot)}>Pakai</button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="panel" style={{ listStyle: 'none', margin: 0, padding: '0 12px 4px' }}>
            {list.length === 0 && <li className="muted" style={{ padding: 12 }}>{q.trim() ? 'Tidak ketemu.' : 'Belum ada.'} <Link href="/makanan/baru">Tambah makanan baru</Link></li>}
            {list.map(foodRow)}
          </ul>
        )}
      </section>

      {picked && (
        <section aria-label="Pilih porsi" className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{picked.name}</h2>
            <button type="button" className="btn" onClick={() => setPicked(null)}>Batal</button>
          </div>
          <PortionPicker portions={picked.portions.map((p) => ({ label: p.label, grams: Number(p.grams), is_calibrated: p.is_calibrated }))}
            grams={grams} onChange={(g, l) => { setGrams(g); setPortionLabel(l); }} />
          {grams && <NutrientPreview values={entryNutrients(toFoodNutrition(picked), grams).values} />}
          <button type="button" className="btn navy" disabled={!grams} onClick={addToCart}>Tambahkan</button>
        </section>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ flex: 1, fontSize: 14 }}><b>{cart.length} item</b> <span className="muted">di keranjang, {fmt(cartKcal)} kkal</span></span>
        <button type="button" className="btn navy" style={{ padding: '0 24px' }} disabled={cart.length === 0 || saving} onClick={save}>Simpan</button>
      </div>
      {error && <p role="alert" style={{ margin: 0, color: '#a33a10', fontWeight: 600 }}>{error}</p>}
    </div>
  );
}
