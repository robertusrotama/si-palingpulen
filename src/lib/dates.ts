import type { MealSlot } from './calc/types';

function parts(instantIso: string, tz: string): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(new Date(instantIso))) out[p.type] = p.value;
  return out;
}

/** Tanggal lokal YYYY-MM-DD dari sebuah instant di zona `tz`. */
export function localDate(instantIso: string, tz: string): string {
  const p = parts(instantIso, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Jam lokal HH:mm dari sebuah instant di zona `tz`. */
export function localTime(instantIso: string, tz: string): string {
  const p = parts(instantIso, tz);
  return `${p.hour}:${p.minute}`;
}

/** Waktu makan otomatis dari jam lokal. Tidak pernah mengembalikan 'other'. */
export function mealSlotFor(hhmm: string): MealSlot {
  const [h, m] = hhmm.split(':').map(Number);
  const minutes = h * 60 + m;
  if (minutes < 10 * 60) return 'breakfast';
  if (minutes < 15 * 60) return 'lunch';
  if (minutes < 18 * 60) return 'snack';
  return 'dinner';
}

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  return Date.UTC(y, mo - 1, d);
}

export function addDays(date: string, n: number): string {
  return new Date(toUtc(date) + n * DAY_MS).toISOString().slice(0, 10);
}

/** b − a dalam hari. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}
