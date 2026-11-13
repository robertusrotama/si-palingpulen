const DECIMAL = /^-?\d+([.,]\d+)?$/;

/** Menerima satu pemisah desimal, koma atau titik. Menolak pemisah ribuan. */
export function parseDecimal(input: string): number | null {
  const s = input.trim();
  if (!DECIMAL.test(s)) return null;
  return Number(s.replace(',', '.'));
}
