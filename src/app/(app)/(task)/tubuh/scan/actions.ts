'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { zonedToUtc } from '@/lib/dates';
import { addScan } from '@/lib/db/body';
import { userClock } from '@/lib/db/session';
import { createServerSupabase } from '@/lib/supabase/server';
import type { ScanInput } from '@/lib/validation/body';

export async function saveScanAction(i: { scan: ScanInput; date: string; time: string; fasted: boolean; postWorkout: boolean }) {
  const sb = await createServerSupabase();
  const { tz } = await userClock(sb);
  await addScan(sb, { ...i.scan, scannedAt: zonedToUtc(i.date, i.time || '07:00', tz), condition: i.fasted ? 'fasted' : 'fed', postWorkout: i.postWorkout });
  revalidatePath('/progres');
  redirect('/progres');
}
