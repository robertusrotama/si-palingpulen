'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MealGroup } from '@/lib/db/entries';
import { fmt } from '@/lib/format';
import { deleteEntryAction, restoreEntryAction } from '@/app/(app)/(tabs)/actions';

export const SLOT_TITLE = { breakfast: 'Sarapan', lunch: 'Makan siang', snack: 'Snack', dinner: 'Makan malam', other: 'Lainnya' } as const;

function hhmm(iso: string, tz: string) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

export function MealList({ groups, tz }: { groups: MealGroup[]; tz: string }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  async function remove(id: string, name: string) {
    setHidden((s) => new Set(s).add(id));
    setUndo({ id, name });
    await deleteEntryAction(id);
  }
  async function restore() {
    if (!undo) return;
    const id = undo.id;
    setUndo(null);
    await restoreEntryAction(id);
    setHidden((s) => { const n = new Set(s); n.delete(id); return n; });
    router.refresh();
  }

  return (
    <section aria-label="Makan hari ini" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Makan hari ini</h2>
      {groups.map((g) => {
        const entries = g.entries.filter((e) => !hidden.has(e.id));
        const title = g.slot === 'other' ? (g.label ?? 'Lainnya') : SLOT_TITLE[g.slot];
        return (
          <article key={`${g.slot}-${g.label ?? ''}`} className="panel" style={{ padding: '12px 16px', borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, flex: 1, fontSize: 16, fontWeight: 700 }}>{title}</h3>
              {entries.length > 0
                ? <span className="inset" style={{ padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>{fmt(g.kcal)} kkal · serat {g.fiber_g == null ? '?' : fmt(g.fiber_g)} g</span>
                : <span className="muted" style={{ fontSize: 13 }}>Belum dicatat</span>}
            </div>
            {entries.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--hair)', fontSize: 15 }}>
                <span style={{ flex: 1 }}>{e.name}</span>
                <span className="muted" style={{ fontSize: 13 }}>{e.portionLabel ?? `${fmt(e.grams)} g`} · {hhmm(e.loggedAt, tz)}</span>
                <button type="button" className="btn" aria-label={`Hapus ${e.name}`} style={{ width: 44, padding: 0 }} onClick={() => remove(e.id, e.name)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            ))}
            {entries.length === 0 && g.slot !== 'other' && (
              <Link href="/catat" className="btn" style={{ alignSelf: 'flex-start' }}>Catat {SLOT_TITLE[g.slot].toLowerCase()}</Link>
            )}
          </article>
        );
      })}
      {undo && (
        <div role="status" className="raised hatch" style={{ position: 'fixed', left: 16, right: 16, bottom: 100, maxWidth: 480, margin: '0 auto', padding: '8px 8px 8px 14px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 20 }}>
          <span style={{ flex: 1, fontWeight: 600 }}>{undo.name} dihapus</span>
          <button type="button" className="btn navy" onClick={restore}>Urungkan</button>
        </div>
      )}
    </section>
  );
}
