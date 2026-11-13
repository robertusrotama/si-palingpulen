'use server';

import { revalidatePath } from 'next/cache';
import { addWater, restoreEntry, softDeleteEntry } from '@/lib/db/entries';
import { createServerSupabase } from '@/lib/supabase/server';

export async function addWaterAction(i: { clientId: string; date: string; loggedAt: string; ml: number }) {
  await addWater(await createServerSupabase(), i);
  revalidatePath('/');
}

export async function deleteEntryAction(id: string) {
  await softDeleteEntry(await createServerSupabase(), id);
  revalidatePath('/');
}

export async function restoreEntryAction(id: string) {
  await restoreEntry(await createServerSupabase(), id);
  revalidatePath('/');
}
