'use client';

/** Sakelar fisik (spec F12): trek navy saat menyala, cekung saat mati. */
export function Switch({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      style={{
        width: 56, height: 32, borderRadius: 16, position: 'relative', padding: 0, flex: 'none',
        border: checked ? '1px solid #0E1524' : '1px solid #fff',
        background: checked ? 'linear-gradient(180deg, #121A2C 0%, #2A3550 100%)' : 'var(--inset)',
        boxShadow: checked ? 'inset 0 2px 4px rgba(0,0,0,.35)' : 'inset 0 2px 5px rgba(56,78,110,.2)',
      }}>
      <span style={{
        position: 'absolute', top: 3, left: checked ? 27 : 3, width: 24, height: 24, borderRadius: '50%',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #E3E9EF 100%)', boxShadow: '0 2px 4px rgba(14,21,36,.3)', transition: 'left .15s',
      }} />
    </button>
  );
}
