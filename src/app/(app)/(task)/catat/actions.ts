'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { MealSlot } from '@/lib/calc/types';
import { addDays } from '@/lib/dates';
import { copySlotFromDate, expandSavedMeal, logFoodEntries, slotPreview, type LogRow } from '@/lib/db/entries';
import { getFood, searchFoods } from '@/lib/db/foods';
import { userClock } from '@/lib/db/session';
import { createServerSupabase } from '@/lib/supabase/server';

export async function previewAction(slot: MealSlot) {
  const sb = await createServerSupabase();
  const { today } = await userClock(sb);
  return slotPreview(sb, { date: addDays(today, -1), slot });
}

export async function searchAction(q: string) {
  return searchFoods(await createServerSupabase(), q);
}

export async function foodAction(id: string) {
  return getFood(await createServerSupabase(), id);
}

export async function logEntriesAction(rows: LogRow[]) {
  await logFoodEntries(await createServerSupabase(), rows);
  revalidatePath('/');
}

export async function repeatYesterdayAction(slot: MealSlot) {
  const sb = await createServerSupabase();
  const { today, nowIso } = await userClock(sb);
  await copySlotFromDate(sb, { fromDate: addDays(today, -1), toDate: today, slot, nowIso });
  revalidatePath('/');
  redirect('/');
}

export async function applySavedMealAction(mealId: string, slot: MealSlot) {
  const sb = await createServerSupabase();
  const { today, nowIso } = await userClock(sb);
  await expandSavedMeal(sb, { mealId, date: today, slot, nowIso });
  revalidatePath('/');
  redirect('/');
}
