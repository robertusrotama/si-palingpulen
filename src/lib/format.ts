const cache = new Map<number, Intl.NumberFormat>();

/** Format angka gaya Indonesia: 1.506 dan 61,8. */
export function fmt(n: number, digits = 0): string {
  let f = cache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    cache.set(digits, f);
  }
  return f.format(n);
}

/** Nilai nutrisi dengan satuan; null tampil sebagai "tidak diketahui" (bukan 0). */
export function fmtNutrient(v: number | null | undefined, unit: string, digits = 1): string {
  return v == null ? 'tidak diketahui' : `${fmt(v, digits)} ${unit}`;
}
