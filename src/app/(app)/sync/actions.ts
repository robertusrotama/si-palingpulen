'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { addWeight } from '@/lib/db/body';
import { addWater, logFoodEntries, type LogRow } from '@/lib/db/entries';
import { createServerSupabase } from '@/lib/supabase/server';
import type { QueuedOp, SendResult } from '@/lib/offline/queue';

/** Mengirim satu operasi antrean. 'retry' jika belum login/terputus, 'drop' jika datanya tidak valid. */
export async function sendQueuedOp(op: QueuedOp): Promise<SendResult> {
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return 'retry';
  try {
    if (op.kind === 'food_entries') await logFoodEntries(sb, op.payload as LogRow[]);
    else if (op.kind === 'water_entry') await addWater(sb, op.payload as Parameters<typeof addWater>[1]);
    else if (op.kind === 'weight_entry') await addWeight(sb, op.payload as Parameters<typeof addWeight>[1]);
    else return 'drop';
  } catch (e) {
    if (e instanceof ZodError) return 'drop';
    return 'retry';
  }
  revalidatePath('/');
  return 'ok';
}
