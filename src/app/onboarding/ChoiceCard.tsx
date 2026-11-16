'use client';

/** Kartu pilihan besar. Dipakai di dalam elemen `role="radiogroup"`. */
export function ChoiceCard({ title, description, selected, onSelect }: {
  title: string; description?: string; selected: boolean; onSelect: () => void;
}) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={selected ? 'ob-card navy' : 'ob-card raised'}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
        {description && <span style={{ fontSize: 13, fontWeight: 500, opacity: selected ? 0.8 : 1 }} className={selected ? undefined : 'muted'}>{description}</span>}
      </span>
      <span aria-hidden="true" className="ob-check" data-on={selected} />
    </button>
  );
}
