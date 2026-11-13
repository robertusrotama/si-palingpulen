'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import * as foods from '@/lib/db/foods';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Nutrients } from '@/lib/calc/types';

export async function searchFoodsAction(q: string) {
  return foods.searchFoods(await createServerSupabase(), q);
}

export async function createLabelFoodAction(i: Parameters<typeof foods.createLabelFood>[1]) {
  const f = await foods.createLabelFood(await createServerSupabase(), i);
  redirect(`/makanan/${f.id}`);
}

export async function createEstimateFoodAction(i: { name: string; aliases: string[]; per100: Partial<Nutrients> }) {
  const f = await foods.createEstimateFood(await createServerSupabase(), i);
  redirect(`/makanan/${f.id}`);
}

export async function saveRecipeAction(i: Parameters<typeof foods.saveRecipe>[1]) {
  const f = await foods.saveRecipe(await createServerSupabase(), i);
  redirect(`/makanan/${f.id}`);
}

export async function savePortionAction(i: { foodId: string; label: string; grams: number; isCalibrated: boolean }) {
  await foods.upsertPortion(await createServerSupabase(), i);
  revalidatePath(`/makanan/${i.foodId}`);
}

export async function toggleFavoriteAction(id: string, fav: boolean) {
  await foods.toggleFavorite(await createServerSupabase(), id, fav);
  revalidatePath(`/makanan/${id}`);
}

export async function archiveFoodAction(id: string): Promise<{ error?: string }> {
  try {
    await foods.archiveFood(await createServerSupabase(), id);
  } catch (e) {
    return { error: (e as Error).message === 'used_in_recipe' ? 'Bahan ini dipakai resep aktif, jadi belum bisa diarsipkan.' : 'Gagal mengarsipkan.' };
  }
  redirect('/makanan');
}

export async function applyToPastAction(id: string, from: string, to: string) {
  return foods.applyFoodToPastEntries(await createServerSupabase(), id, from, to);
}
