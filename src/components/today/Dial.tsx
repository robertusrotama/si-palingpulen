/** Dial bergaya jam analog (motif identitas, spec F12). `pct` 0..1+, dipotong di 1 untuk jarum. */
export function Dial({ pct, size, accent = false, label }: { pct: number; size: number; accent?: boolean; label: string }) {
  const p = Math.max(0, Math.min(1, pct));
  const big = size >= 140;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label} style={{ flex: 'none' }}>
      <circle cx="100" cy="100" r="97" fill="#DDE4EB" />
      <circle cx="100" cy="100" r="94" fill="#F7F9FB" stroke="#FFFFFF" strokeWidth="2" />
      {big && <circle cx="100" cy="100" r="86" fill="none" stroke="#9AA6B5" strokeWidth="5" strokeDasharray="0.8 8.2" transform="rotate(-90 100 100)" />}
      <circle cx="100" cy="100" r="86" fill="none" stroke="#3D4A60" strokeWidth={big ? 8 : 10} strokeDasharray={big ? '1.6 43.43' : '2 43.03'} transform="rotate(-90.5 100 100)" />
      <circle cx="100" cy="100" r={big ? 70 : 68} fill="none" stroke="#DDE4EB" strokeWidth={big ? 7 : 12} />
      {p > 0 && (
        <circle cx="100" cy="100" r={big ? 70 : 68} fill="none" stroke={accent ? '#E0662E' : '#3D4A60'} strokeWidth={big ? 7 : 12}
          strokeLinecap="round" pathLength={100} strokeDasharray={`${p * 100} 100`} transform="rotate(-90 100 100)" />
      )}
      <line x1="100" y1="112" x2="100" y2={big ? 40 : 44} stroke="#141B2D" strokeWidth={big ? 3 : 6} strokeLinecap="round" transform={`rotate(${p * 360} 100 100)`} />
      <circle cx="100" cy="100" r={big ? 7 : 11} fill="#141B2D" />
      {big && <circle cx="100" cy="100" r="2.5" fill="#FFFFFF" />}
    </svg>
  );
}
