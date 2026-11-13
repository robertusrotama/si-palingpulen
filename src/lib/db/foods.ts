import { z } from 'zod';
import { entryNutrients, perServingToPer100, recipePer100, resolveAddedSugarPer100 } from '../calc/nutrition';
import { NUTRIENTS } from '../calc/types';
import type { FoodNutrition, NutrientKey, Nutrients } from '../calc/types';
import { addDays } from '../dates';
import { must, type DB, type FoodRow, type PortionRow, type SavedMealItemRow, type SavedMealRow } from './types';

const nonNeg = z.number().finite().min(0);
const coreMacros = z.object({ kcal: nonNeg, protein_g: nonNeg, carb_g: nonNeg, fat_g: nonNeg });
const name = z.string().trim().min(1).max(120);
const portionInput = z.object({ label: z.string().trim().min(1).max(60), grams: z.number().positive() });

export type PortionInput = z.infer<typeof portionInput>;

/** Nutrisi per 100 g dari baris foods. */
export function toFoodNutrition(f: FoodRow): FoodNutrition {
  const per100 = {} as Nutrients;
  for (const k of NUTRIENTS) {
    const v = f[k as keyof FoodRow] as number | null;
    per100[k] = v == null ? null : Number(v);
  }
  return { per100, partial: (f.partial_nutrients ?? []) as NutrientKey[] };
}

function nutrientColumns(per100: Nutrients) {
  const out: Record<string, number | null> = {};
  for (const k of NUTRIENTS) out[k] = per100[k];
  return out;
}

function fillNutrients(p: Partial<Nutrients>): Nutrients {
  const out = {} as Nutrients;
  for (const k of NUTRIENTS) out[k] = p[k] ?? null;
  return out;
}

async function insertPortions(sb: DB, foodId: string, portions: PortionInput[] = []) {
  for (const p of portions.map((x) => portionInput.parse(x))) {
    must(await sb.from('food_portions').upsert({ food_id: foodId, label: p.label, grams: p.grams }, { onConflict: 'food_id,label' }));
  }
}

export async function searchFoods(sb: DB, q: string, limit = 20): Promise<FoodRow[]> {
  if (!q.trim()) return [];
  return must(await sb.rpc('search_foods', { q: q.trim(), max_results: limit })) as FoodRow[];
}

export async function favoriteFoods(sb: DB): Promise<FoodRow[]> {
  return must(await sb.from('foods').select('*').eq('is_favorite', true).is('archived_at', null).order('name'));
}

/** Makanan yang dicatat dalam `days` hari terakhir, urut dari yang paling sering. */
export async function recentFoods(sb: DB, asOf: string, days = 14): Promise<FoodRow[]> {
  const rows = must(
    await sb.from('food_entries').select('food_id').is('deleted_at', null).gte('date', addDays(asOf, -(days - 1))).lte('date', asOf),
  );
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.food_id, (counts.get(r.food_id) ?? 0) + 1);
  if (counts.size === 0) return [];
  const foods = must(await sb.from('foods').select('*').in('id', [...counts.keys()]).is('archived_at', null));
  return foods.sort((a, b) => counts.get(b.id)! - counts.get(a.id)! || a.name.localeCompare(b.name));
}

export async function getFood(sb: DB, id: string): Promise<FoodRow & { portions: PortionRow[] }> {
  const food = must(await sb.from('foods').select('*').eq('id', id).single());
  const portions = must(await sb.from('food_portions').select('*').eq('food_id', id).order('grams'));
  return { ...food, portions };
}

export async function createLabelFood(
  sb: DB,
  i: {
    name: string; aliases: string[]; servingG: number; perServing: Partial<Nutrients>;
    addedSugarPerServing?: number | null; isSweetener?: boolean; portions?: PortionInput[];
  },
): Promise<FoodRow> {
  const servingG = z.number().positive().parse(i.servingG);
  const per100 = perServingToPer100(i.perServing, servingG);
  coreMacros.parse(per100);
  const labelAdded = i.addedSugarPerServing == null ? null : (i.addedSugarPerServing * 100) / servingG;
  const row = {
    name: name.parse(i.name), aliases: i.aliases, source: 'label', is_sweetener: !!i.isSweetener,
    ...nutrientColumns(per100), label_added_sugar_g: labelAdded,
    added_sugar_g: resolveAddedSugarPer100({ source: 'label', isSweetener: !!i.isSweetener, sugarPer100: per100.sugar_g, labelAddedSugarPer100: labelAdded }),
  };
  const food = must(await sb.from('foods').insert(row as never).select('*').single());
  await insertPortions(sb, food.id, i.portions);
  return food;
}

export async function createEstimateFood(
  sb: DB,
  i: { name: string; aliases: string[]; per100: Partial<Nutrients>; portions?: PortionInput[] },
): Promise<FoodRow> {
  const per100 = fillNutrients(i.per100);
  coreMacros.parse(per100);
  const row = {
    name: name.parse(i.name), aliases: i.aliases, source: 'estimate', is_estimate: true,
    ...nutrientColumns({ ...per100, added_sugar_g: null }),
  };
  const food = must(await sb.from('foods').insert(row as never).select('*').single());
  await insertPortions(sb, food.id, i.portions);
  return food;
}

async function computeRecipe(sb: DB, items: { foodId: string; grams: number }[]) {
  if (items.length === 0) throw new Error('empty_recipe');
  const ingredients = must(await sb.from('foods').select('*').in('id', items.map((x) => x.foodId)));
  const byId = new Map(ingredients.map((f) => [f.id, f]));
  if (ingredients.some((f) => f.source === 'recipe')) throw new Error('nested_recipe');
  return recipePer100(items.map((x) => {
    const f = byId.get(x.foodId);
    if (!f) throw new Error('ingredient_not_found');
    return { food: toFoodNutrition(f), grams: z.number().positive().parse(x.grams) };
  }));
}

export async function saveRecipe(
  sb: DB,
  i: { id?: string; name: string; aliases: string[]; items: { foodId: string; grams: number }[]; portions?: PortionInput[] },
): Promise<FoodRow> {
  const r = await computeRecipe(sb, i.items);
  const row = { name: name.parse(i.name), aliases: i.aliases, source: 'recipe', ...nutrientColumns(r.per100), partial_nutrients: r.partial };
  const food = i.id
    ? must(await sb.from('foods').update(row as never).eq('id', i.id).select('*').single())
    : must(await sb.from('foods').insert(row as never).select('*').single());
  must(await sb.from('recipe_items').delete().eq('recipe_food_id', food.id));
  must(await sb.from('recipe_items').insert(i.items.map((x) => ({ recipe_food_id: food.id, ingredient_food_id: x.foodId, grams: x.grams }))));
  await insertPortions(sb, food.id, i.portions);
  return food;
}

async function recomputeRecipesUsing(sb: DB, ingredientId: string) {
  const uses = must(await sb.from('recipe_items').select('recipe_food_id').eq('ingredient_food_id', ingredientId));
  for (const recipeId of new Set(uses.map((u) => u.recipe_food_id))) {
    const items = must(await sb.from('recipe_items').select('ingredient_food_id, grams').eq('recipe_food_id', recipeId));
    const r = await computeRecipe(sb, items.map((x) => ({ foodId: x.ingredient_food_id, grams: Number(x.grams) })));
    must(await sb.from('foods').update({ ...nutrientColumns(r.per100), partial_nutrients: r.partial } as never).eq('id', recipeId));
  }
}

export type FoodPatch = Partial<Pick<FoodRow, 'name' | 'aliases' | 'is_sweetener'>> & Partial<Nutrients>;

export async function updateFood(sb: DB, id: string, patch: FoodPatch): Promise<FoodRow> {
  const current = must(await sb.from('foods').select('*').eq('id', id).single());
  if (current.source === 'recipe' && NUTRIENTS.some((k) => k in patch)) throw new Error('recipe_nutrients_are_computed');
  const merged = { ...current, ...patch } as FoodRow;
  coreMacros.parse(toFoodNutrition(merged).per100);
  const added = resolveAddedSugarPer100({
    source: merged.source as never, isSweetener: merged.is_sweetener,
    sugarPer100: merged.sugar_g == null ? null : Number(merged.sugar_g),
    labelAddedSugarPer100: merged.label_added_sugar_g == null ? null : Number(merged.label_added_sugar_g),
  });
  const update = { ...patch, ...(merged.source === 'estimate' || merged.source === 'custom' ? {} : { added_sugar_g: added }) };
  const food = must(await sb.from('foods').update(update as never).eq('id', id).select('*').single());
  await recomputeRecipesUsing(sb, id);
  return food;
}

export async function archiveFood(sb: DB, id: string): Promise<void> {
  const uses = must(await sb.from('recipe_items').select('recipe_food_id, foods!recipe_items_recipe_food_id_fkey(archived_at)').eq('ingredient_food_id', id));
  if ((uses as unknown as { foods: { archived_at: string | null } | null }[]).some((u) => u.foods && u.foods.archived_at == null)) {
    throw new Error('used_in_recipe');
  }
  must(await sb.from('foods').update({ archived_at: new Date().toISOString() }).eq('id', id));
}

export async function upsertPortion(sb: DB, i: { foodId: string; label: string; grams: number; isCalibrated: boolean }): Promise<PortionRow> {
  const p = portionInput.parse({ label: i.label, grams: i.grams });
  return must(
    await sb.from('food_portions')
      .upsert({ food_id: i.foodId, label: p.label, grams: p.grams, is_calibrated: i.isCalibrated }, { onConflict: 'food_id,label' })
      .select('*').single(),
  );
}

export async function toggleFavorite(sb: DB, id: string, fav: boolean): Promise<void> {
  must(await sb.from('foods').update({ is_favorite: fav }).eq('id', id));
}

export async function saveMeal(
  sb: DB,
  i: { id?: string; name: string; items: { foodId: string; grams: number; portionLabel?: string | null }[] },
): Promise<SavedMealRow> {
  const n = z.string().trim().min(1).max(80).parse(i.name);
  const meal = i.id
    ? must(await sb.from('saved_meals').update({ name: n }).eq('id', i.id).select('*').single())
    : must(await sb.from('saved_meals').insert({ name: n }).select('*').single());
  must(await sb.from('saved_meal_items').delete().eq('saved_meal_id', meal.id));
  must(await sb.from('saved_meal_items').insert(i.items.map((x) => ({
    saved_meal_id: meal.id, food_id: x.foodId, grams: z.number().positive().parse(x.grams), portion_label: x.portionLabel ?? null,
  }))));
  return meal;
}

export async function listSavedMeals(sb: DB): Promise<(SavedMealRow & { items: SavedMealItemRow[] })[]> {
  const meals = must(await sb.from('saved_meals').select('*, items:saved_meal_items(*)').order('name'));
  return meals as unknown as (SavedMealRow & { items: SavedMealItemRow[] })[];
}

/** Menghitung ulang snapshot entri dalam rentang tanggal dari data makanan saat ini. */
export async function applyFoodToPastEntries(sb: DB, foodId: string, from: string, to: string): Promise<number> {
  const food = must(await sb.from('foods').select('*').eq('id', foodId).single());
  const entries = must(
    await sb.from('food_entries').select('id, grams').eq('food_id', foodId).is('deleted_at', null).gte('date', from).lte('date', to),
  );
  for (const e of entries) {
    const n = entryNutrients(toFoodNutrition(food), Number(e.grams));
    must(await sb.from('food_entries').update({ ...nutrientColumns(n.values), partial_nutrients: n.partial } as never).eq('id', e.id));
  }
  return entries.length;
}
