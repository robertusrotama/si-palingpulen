'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SOURCE_LABEL } from '@/components/food/sourceLabel';
import { fmt } from '@/lib/format';
import type { FoodRow } from '@/lib/db/types';
import { searchFoodsAction } from './actions';

export function FoodList({ foods }: { foods: Pick<FoodRow, 'id' | 'name' | 'source' | 'kcal'>[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: '4px 12px' }} className="panel">
      {foods.map((f, i) => (
        <li key={f.id} style={{ borderTop: i ? '1px solid var(--hair)' : 'none' }}>
          <Link href={`/makanan/${f.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52, textDecoration: 'none', color: 'var(--ink)' }}>
            <span style={{ flex: 1, fontWeight: 600 }}>{f.name}</span>
            <span className="inset muted" style={{ padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>{SOURCE_LABEL[f.source] ?? f.source}</span>
            <span className="muted" style={{ fontSize: 13 }}>{fmt(Number(f.kcal))} kkal/100 g</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function FoodSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoodRow[] | null>(null);
  useEffect(() => {
    if (!q.trim()) return;
    let alive = true;
    const t = setTimeout(() => searchFoodsAction(q).then((r) => alive && setResults(r)), 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="label">Cari makanan</span>
        <input type="search" className="field-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="contoh: gepre, nasi, whey" />
      </label>
      {q.trim() && results && (results.length ? <FoodList foods={results} /> : <p className="muted" style={{ margin: 0 }}>Tidak ketemu. Tambahkan makanan baru.</p>)}
    </div>
  );
}
