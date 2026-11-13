import { localDate, localTime } from '../dates';
import { must, type DB } from './types';

/** Zona waktu pengguna (default Asia/Jakarta) dan tanggal/jam lokal saat ini. */
export async function userClock(sb: DB, now = new Date()) {
  const p = must(await sb.from('profile').select('timezone').maybeSingle()) as { timezone: string } | null;
  const tz = p?.timezone ?? 'Asia/Jakarta';
  const iso = now.toISOString();
  return { tz, today: localDate(iso, tz), time: localTime(iso, tz), nowIso: iso };
}
