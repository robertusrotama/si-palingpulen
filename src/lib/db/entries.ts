import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { entryNutrients, scaleEntry, sumDay } from '../calc/nutrition';
import { MEAL_SLOT_ORDER, NUTRIENTS } from '../calc/types';
import type { EntryNutrients, MealSlot, NutrientKey, Nutrients } from '../calc/types';
import { targetFor, type TargetRow } from '../calc/targets';
import { fmt } from '../format';
import { toFoodNutrition } from './foods';
import { must, type DB, type Tables } from './types';

type EntryRow = Tables['food_entries']['Row'];

export interface EntryView {
  id: string; foodId: string; name: string; grams: number; portionLabel: string | null; loggedAt: string;
  values: Nutrients; partial: NutrientKey[];
}
export interface MealGroup { slot: MealSlot; label: string | null; entries: EntryView[]; kcal: number; fiber_g: number | null }
export interface DaySummary {
  date: string; groups: MealGroup[]; totals: Nutrients; coverage: Record<NutrientKey, number>;
  waterMl: number; target: TargetRow | null; slotsLogged: number;
}

const slotSchema = z.enum(['breakfast', 'lunch', 'snack', 'dinner', 'other']);
const logRow = z.object({
  clientId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), mealSlot: slotSchema,
  mealLabel: z.string().trim().max(40).nullish(), loggedAt: z.string(), foodId: z.string().uuid(),
  grams: z.number().positive(), portionLabel: z.string().max(60).nullish(),
});
export type LogRow = z.input<typeof logRow>;

function snapshotColumns(n: EntryNutrients) {
  const out: Record<string, unknown> = { partial_nutrients: n.partial };
  for (const k of NUTRIENTS) out[k] = n.values[k];
  return out;
}

function snapshotOf(e: EntryRow): EntryNutrients {
  const values = {} as Nutrients;
  for (const k of NUTRIENTS) {
    const v = e[k as keyof EntryRow] as number | null;
    values[k] = v == null ? null : Number(v);
  }
  return { values, partial: (e.partial_nutrients ?? []) as NutrientKey[] };
}

/** Menyimpan entri makan; nilai gizi dihitung di server dari data makanan. Kirim ulang tidak membuat duplikat. */
export async function logFoodEntries(sb: DB, rows: LogRow[]): Promise<void> {
  if (rows.length === 0) return;
  const parsed = rows.map((r) => logRow.parse(r));
  const foods = must(await sb.from('foods').select('*').in('id', [...new Set(parsed.map((r) => r.foodId))]));
  const byId = new Map(foods.map((f) => [f.id, f]));
  const insert = parsed.map((r) => {
    const f = byId.get(r.foodId);
    if (!f) throw new Error('food_not_found');
    return {
      client_id: r.clientId, date: r.date, meal_slot: r.mealSlot,
      meal_label: r.mealSlot === 'other' && r.mealLabel?.trim() ? r.mealLabel.trim() : null,
      logged_at: r.loggedAt, food_id: r.foodId, grams: r.grams, portion_label: r.portionLabel ?? null,
      ...snapshotColumns(entryNutrients(toFoodNutrition(f), r.grams)),
    };
  });
  must(await sb.from('food_entries').upsert(insert as never, { onConflict: 'user_id,client_id', ignoreDuplicates: true }));
}

export async function updateFoodEntry(sb: DB, id: string, patch: { grams?: number; mealSlot?: MealSlot; mealLabel?: string | null }) {
  const e = must(await sb.from('food_entries').select('*').eq('id', id).single());
  const update: Record<string, unknown> = {};
  if (patch.grams != null) {
    const g = z.number().positive().parse(patch.grams);
    Object.assign(update, snapshotColumns(scaleEntry(snapshotOf(e), Number(e.grams), g)), { grams: g, portion_label: null });
  }
  if (patch.mealSlot) {
    update.meal_slot = slotSchema.parse(patch.mealSlot);
    update.meal_label = patch.mealSlot === 'other' ? (patch.mealLabel?.trim() || null) : null;
  }
  must(await sb.from('food_entries').update(update as never).eq('id', id));
}

export async function softDeleteEntry(sb: DB, id: string) {
  must(await sb.from('food_entries').update({ deleted_at: new Date().toISOString() }).eq('id', id));
}

export async function restoreEntry(sb: DB, id: string) {
  must(await sb.from('food_entries').update({ deleted_at: null }).eq('id', id));
}

async function slotEntries(sb: DB, date: string, slot: MealSlot) {
  return must(
    await sb.from('food_entries').select('*, foods(name)').eq('date', date).eq('meal_slot', slot).is('deleted_at', null).order('logged_at'),
  ) as (EntryRow & { foods: { name: string } | null })[];
}

export async function slotPreview(sb: DB, i: { date: string; slot: MealSlot }) {
  const rows = await slotEntries(sb, i.date, i.slot);
  if (rows.length === 0) return null;
  const { totals } = sumDay(rows.map(snapshotOf));
  return {
    items: rows.map((r) => ({ name: r.foods?.name ?? 'Makanan', portion: r.portion_label ?? `${fmt(Number(r.grams))} g` })),
    totals: { kcal: totals.kcal ?? 0, protein_g: totals.protein_g ?? 0, fiber_g: totals.fiber_g },
  };
}

/** Menyalin semua entri satu waktu makan dari tanggal lain, dengan client_id baru. */
export async function copySlotFromDate(sb: DB, i: { fromDate: string; toDate: string; slot: MealSlot; nowIso: string }): Promise<number> {
  const rows = await slotEntries(sb, i.fromDate, i.slot);
  if (rows.length === 0) return 0;
  const insert = rows.map((r) => ({
    client_id: randomUUID(), date: i.toDate, meal_slot: r.meal_slot, meal_label: r.meal_label, logged_at: i.nowIso,
    food_id: r.food_id, grams: r.grams, portion_label: r.portion_label, ...snapshotColumns(snapshotOf(r)),
  }));
  must(await sb.from('food_entries').insert(insert as never));
  return rows.length;
}

export async function expandSavedMeal(sb: DB, i: { mealId: string; date: string; slot: MealSlot; nowIso: string }) {
  const items = must(await sb.from('saved_meal_items').select('*').eq('saved_meal_id', i.mealId));
  await logFoodEntries(sb, items.map((x) => ({
    clientId: randomUUID(), date: i.date, mealSlot: i.slot, loggedAt: i.nowIso, foodId: x.food_id,
    grams: Number(x.grams), portionLabel: x.portion_label,
  })));
}

export async function addWater(sb: DB, i: { clientId: string; date: string; loggedAt: string; ml: number }) {
  const ml = z.number().positive().max(5000).parse(i.ml);
  must(await sb.from('water_entries').upsert(
    { client_id: i.clientId, date: i.date, logged_at: i.loggedAt, ml }, { onConflict: 'user_id,client_id', ignoreDuplicates: true },
  ));
}

function toTargetRow(r: Tables['targets']['Row']): TargetRow {
  return {
    effective_from: r.effective_from, is_manual_override: r.is_manual_override, calc_inputs: r.calc_inputs as TargetRow['calc_inputs'],
    kcal: Number(r.kcal), protein_g: Number(r.protein_g), carb_g: Number(r.carb_g), fat_g: Number(r.fat_g), fiber_g: Number(r.fiber_g),
    water_ml: Number(r.water_ml), added_sugar_max_g: Number(r.added_sugar_max_g), sodium_max_mg: Number(r.sodium_max_mg), satfat_max_g: Number(r.satfat_max_g),
  };
}

export async function listTargets(sb: DB): Promise<TargetRow[]> {
  return must(await sb.from('targets').select('*').order('effective_from')).map(toTargetRow);
}

export async function daySummary(sb: DB, date: string): Promise<DaySummary> {
  const [entries, water, targets] = await Promise.all([
    sb.from('food_entries').select('*, foods(name)').eq('date', date).is('deleted_at', null).order('logged_at'),
    sb.from('water_entries').select('ml').eq('date', date),
    listTargets(sb),
  ]);
  const rows = must(entries) as (EntryRow & { foods: { name: string } | null })[];
  const views: (EntryView & { slot: MealSlot; label: string | null })[] = rows.map((r) => {
    const s = snapshotOf(r);
    return {
      id: r.id, foodId: r.food_id, name: r.foods?.name ?? 'Makanan', grams: Number(r.grams), portionLabel: r.portion_label,
      loggedAt: r.logged_at, values: s.values, partial: s.partial, slot: r.meal_slot as MealSlot, label: r.meal_label,
    };
  });
  const groups: MealGroup[] = [];
  for (const slot of MEAL_SLOT_ORDER) {
    const inSlot = views.filter((v) => v.slot === slot);
    const labels = slot === 'other' ? [...new Set(inSlot.map((v) => v.label))] : [null];
    for (const label of labels) {
      const es = slot === 'other' ? inSlot.filter((v) => v.label === label) : inSlot;
      if (slot === 'other' && es.length === 0) continue;
      const sum = sumDay(es);
      groups.push({ slot, label, entries: es, kcal: sum.totals.kcal ?? 0, fiber_g: sum.totals.fiber_g });
    }
  }
  const { totals, coverage } = sumDay(views);
  return {
    date, groups, totals, coverage,
    waterMl: must(water).reduce((s, w) => s + Number(w.ml), 0),
    target: targetFor(date, targets),
    slotsLogged: new Set(views.map((v) => v.slot)).size,
  };
}
