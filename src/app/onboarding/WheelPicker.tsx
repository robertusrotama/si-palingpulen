'use client';

import { useEffect, useRef, type KeyboardEvent } from 'react';

const ROW = 44;
const VISIBLE = 5;

type Item = { value: number; label: string };

/** Roda gulir dengan scroll-snap. Nilai terpilih selalu di baris tengah. */
export function WheelPicker({ label, items, value, onChange, onTick }: {
  label: string; items: Item[]; value: number; onChange: (v: number) => void; onTick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdx = useRef(-1);
  const index = Math.max(0, items.findIndex((i) => i.value === value));

  // Selaraskan posisi gulir dengan nilai (saat awal, klik, atau nilai dijepit dari luar).
  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== index) el.scrollTo({ top: index * ROW });
    lastIdx.current = index;
  }, [index]);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
    if (i !== lastIdx.current) { lastIdx.current = i; onTick?.(); }
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => { if (items[i] && items[i].value !== value) onChange(items[i].value); }, 120);
  }

  function pick(i: number) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current?.scrollTo({ top: i * ROW, behavior: reduce ? 'auto' : 'smooth' });
    onChange(items[i].value);
  }

  function onKey(e: KeyboardEvent) {
    const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    pick(Math.min(items.length - 1, Math.max(0, index + d)));
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <div className="inset" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: ROW * 2, height: ROW, borderRadius: 12 }} />
      <div ref={ref} role="listbox" aria-label={label} aria-activedescendant={`${label}-${index}`} tabIndex={0}
        onScroll={onScroll} onKeyDown={onKey} className="ob-wheel"
        style={{ height: ROW * VISIBLE, paddingBlock: ROW * 2, overflowY: 'auto', scrollSnapType: 'y mandatory' }}>
        {items.map((it, i) => (
          <div key={it.value} id={`${label}-${i}`} role="option" aria-selected={i === index} onClick={() => pick(i)}
            style={{ height: ROW, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'center',
              fontSize: i === index ? 19 : 16, fontWeight: i === index ? 700 : 500, color: i === index ? 'var(--ink)' : 'var(--muted)' }}>
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}
