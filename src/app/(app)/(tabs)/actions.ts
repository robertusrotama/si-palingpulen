'use server';

import { revalidatePath } from 'next/cache';
import { restoreEntry, softDeleteEntry } from '@/lib/db/entries';
import { createServerSupabase } from '@/lib/supabase/server';

export async function deleteEntryAction(id: string) {
  await softDeleteEntry(await createServerSupabase(), id);
  revalidatePath('/');
}

export async function restoreEntryAction(id: string) {
  await restoreEntry(await createServerSupabase(), id);
  revalidatePath('/');
}
