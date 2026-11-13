import { notFound } from 'next/navigation';
import { SOURCE_LABEL } from '@/components/food/sourceLabel';
import { BackLink } from '@/components/shell/BackLink';
import { getFood } from '@/lib/db/foods';
import { fmt, fmtNutrient } from '@/lib/format';
import { createServerSupabase } from '@/lib/supabase/server';
import { FoodActions, PortionEditor } from './FoodDetailParts';

const ROWS = [
  ['protein_g', 'Protein', 'g'], ['carb_g', 'Karbo', 'g'], ['fat_g', 'Lemak', 'g'], ['fiber_g', 'Serat', 'g'],
  ['sugar_g', 'Gula total', 'g'], ['added_sugar_g', 'Gula tambahan', 'g'], ['sodium_mg', 'Natrium', 'mg'], ['satfat_g', 'Lemak jenuh', 'g'],
] as const;

export default async function FoodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const food = await getFood(await createServerSupabase(), id).catch(() => null);
  if (!food) notFound();
  const num = (v: unknown) => (v == null ? null : Number(v));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackLink href="/makanan" />
        <h1 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 700 }}>{food.name}</h1>
        <span className="inset muted" style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>{SOURCE_LABEL[food.source] ?? food.source}</span>
      </header>
      <section className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700 }}>{fmt(Number(food.kcal))} kkal / 100 g</span>
        {food.source_ref && <span className="muted" style={{ fontSize: 12 }}>Sumber: {food.source_ref}</span>}
        <dl style={{ margin: '8px 0 0', display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 8 }}>
          {ROWS.map(([k, label, unit]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt>{label}{food.partial_nutrients.includes(k) ? ' (sebagian)' : ''}</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{fmtNutrient(num(food[k]), unit)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="panel" style={{ padding: '12px 16px' }}>
        <h2 className="label" style={{ margin: 0 }}>Porsi</h2>
        {food.portions.length ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {food.portions.map((p) => <PortionEditor key={p.id} foodId={food.id} portion={p} />)}
          </ul>
        ) : <p className="muted" style={{ margin: '8px 0 0' }}>Belum ada porsi. Catat dengan gram dulu.</p>}
      </section>
      <FoodActions id={food.id} favorite={food.is_favorite} />
    </div>
  );
}
