import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import {
  applyFoodToPastEntries, archiveFood, createEstimateFood, createLabelFood, favoriteFoods, getFood,
  recentFoods, saveMeal, listSavedMeals, saveRecipe, searchFoods, toggleFavorite, updateFood, upsertPortion,
} from '@/lib/db/foods';
import { createTestUser, uniqueEmail } from './helpers';

let sb: SupabaseClient<Database>;
const base = { kcal: 100, protein_g: 10, carb_g: 0, fat_g: 5 };

async function logRaw(foodId: string, kcal: number, date = '2026-11-12', grams = 100) {
  const { error } = await sb.from('food_entries').insert({
    client_id: randomUUID(), date, meal_slot: 'lunch', logged_at: `${date}T05:00:00Z`, food_id: foodId, grams,
    kcal, protein_g: 1, carb_g: 1, fat_g: 1,
  });
  if (error) throw error;
}

beforeAll(async () => {
  sb = await createTestUser(uniqueEmail('foods'));
});

describe('label and estimate foods', () => {
  test('label values per serving become per 100 g', async () => {
    const f = await createLabelFood(sb, {
      name: 'Whey Test', aliases: ['whey'], servingG: 30,
      perServing: { kcal: 120, protein_g: 24, carb_g: 3, fat_g: 1.5 }, addedSugarPerServing: 0.6,
    });
    expect(Number(f.protein_g)).toBeCloseTo(80);
    expect(Number(f.kcal)).toBeCloseTo(400);
    expect(Number(f.added_sugar_g)).toBeCloseTo(2);
    expect(f.source).toBe('label');
  });
  test('estimate foods are marked and leave added sugar unknown', async () => {
    const f = await createEstimateFood(sb, { name: 'Nasi padang estimasi', aliases: [], per100: { kcal: 180, protein_g: 7, carb_g: 20, fat_g: 8 } });
    expect(f.source).toBe('estimate');
    expect(f.is_estimate).toBe(true);
    expect(f.added_sugar_g).toBeNull();
  });
  test('core macros are required', async () => {
    await expect(createEstimateFood(sb, { name: 'Kurang', aliases: [], per100: { kcal: 100 } })).rejects.toThrow();
  });
});

describe('recipes', () => {
  test('nutrients come from the ingredients and partial nutrients are flagged', async () => {
    const a = await createLabelFood(sb, { name: 'Bahan A', aliases: [], servingG: 100, perServing: { ...base, sugar_g: 10 } });
    const b = await createEstimateFood(sb, { name: 'Bahan B', aliases: [], per100: { kcal: 200, protein_g: 0, carb_g: 40, fat_g: 0 } });
    const r = await saveRecipe(sb, { name: 'Resep AB', aliases: [], items: [{ foodId: a.id, grams: 100 }, { foodId: b.id, grams: 50 }] });
    expect(r.source).toBe('recipe');
    expect(Number(r.kcal)).toBeCloseTo((200 / 150) * 100);
    expect(Number(r.sugar_g)).toBeCloseTo(6.667, 2);
    expect(r.partial_nutrients).toContain('sugar_g');
  });
  test('a recipe cannot contain another recipe', async () => {
    const a = await createEstimateFood(sb, { name: 'Bahan C', aliases: [], per100: base });
    const r = await saveRecipe(sb, { name: 'Resep C', aliases: [], items: [{ foodId: a.id, grams: 100 }] });
    await expect(saveRecipe(sb, { name: 'Resep bersarang', aliases: [], items: [{ foodId: r.id, grams: 100 }] })).rejects.toThrow('nested_recipe');
  });
  test('editing an ingredient recomputes recipes that use it', async () => {
    const a = await createEstimateFood(sb, { name: 'Bahan D', aliases: [], per100: base });
    const r = await saveRecipe(sb, { name: 'Resep D', aliases: [], items: [{ foodId: a.id, grams: 100 }] });
    await updateFood(sb, a.id, { kcal: 300 });
    const after = await getFood(sb, r.id);
    expect(Number(after.kcal)).toBeCloseTo(300);
  });
});

describe('history stays stable (Review Focus 4)', () => {
  test('editing a food does not change entries already logged', async () => {
    const f = await createEstimateFood(sb, { name: 'Bahan E', aliases: [], per100: base });
    await logRaw(f.id, 100);
    await updateFood(sb, f.id, { kcal: 999 });
    const { data } = await sb.from('food_entries').select('kcal').eq('food_id', f.id);
    expect(Number(data![0].kcal)).toBe(100);
  });
  test('an archived food leaves search but old entries still show its name', async () => {
    const f = await createEstimateFood(sb, { name: 'Bahan arsip unik', aliases: [], per100: base });
    await logRaw(f.id, 100);
    await archiveFood(sb, f.id);
    expect((await searchFoods(sb, 'arsip unik')).map((x) => x.id)).not.toContain(f.id);
    const { data } = await sb.from('food_entries').select('foods(name)').eq('food_id', f.id).single();
    expect((data as unknown as { foods: { name: string } }).foods.name).toBe('Bahan arsip unik');
  });
  test('an ingredient used by an active recipe cannot be archived', async () => {
    const a = await createEstimateFood(sb, { name: 'Bahan F', aliases: [], per100: base });
    await saveRecipe(sb, { name: 'Resep F', aliases: [], items: [{ foodId: a.id, grams: 100 }] });
    await expect(archiveFood(sb, a.id)).rejects.toThrow('used_in_recipe');
  });
  test('applyFoodToPastEntries only touches the date range', async () => {
    const f = await createEstimateFood(sb, { name: 'Bahan G', aliases: [], per100: base });
    await logRaw(f.id, 100, '2026-11-01');
    await logRaw(f.id, 100, '2026-11-10');
    await updateFood(sb, f.id, { kcal: 150 });
    expect(await applyFoodToPastEntries(sb, f.id, '2026-11-05', '2026-11-30')).toBe(1);
    const { data } = await sb.from('food_entries').select('date,kcal').eq('food_id', f.id).order('date');
    expect(data!.map((d) => Number(d.kcal))).toEqual([100, 150]);
  });
});

describe('lists', () => {
  test('favorites, recent by frequency, portions, saved meals', async () => {
    const x = await createEstimateFood(sb, { name: 'Sering', aliases: [], per100: base });
    const y = await createEstimateFood(sb, { name: 'Jarang', aliases: [], per100: base });
    await toggleFavorite(sb, x.id, true);
    expect((await favoriteFoods(sb)).map((f) => f.id)).toContain(x.id);
    await logRaw(x.id, 1, '2026-11-20');
    await logRaw(x.id, 1, '2026-11-21');
    await logRaw(y.id, 1, '2026-11-21');
    const recent = await recentFoods(sb, '2026-11-21', 14);
    expect(recent.findIndex((f) => f.id === x.id)).toBeLessThan(recent.findIndex((f) => f.id === y.id));
    const p = await upsertPortion(sb, { foodId: x.id, label: '1 centong', grams: 130, isCalibrated: true });
    expect(p.is_calibrated).toBe(true);
    expect((await getFood(sb, x.id)).portions.map((q) => q.label)).toContain('1 centong');
    const m = await saveMeal(sb, { name: 'Warteg langganan', items: [{ foodId: x.id, grams: 195, portionLabel: '1½ centong' }] });
    expect((await listSavedMeals(sb)).find((s) => s.id === m.id)!.items).toHaveLength(1);
  });
});
