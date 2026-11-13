import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { createEstimateFood } from '@/lib/db/foods';
import {
  addWater, copySlotFromDate, daySummary, expandSavedMeal, logFoodEntries, restoreEntry, slotPreview,
  softDeleteEntry, updateFoodEntry,
} from '@/lib/db/entries';
import { saveMeal } from '@/lib/db/foods';
import { createTestUser, uniqueEmail } from './helpers';

let sb: SupabaseClient<Database>;
let nasi: string;
let ayam: string;
const D = '2026-11-12';

function row(foodId: string, extra: Partial<Parameters<typeof logFoodEntries>[1][number]> = {}) {
  return { clientId: randomUUID(), date: D, mealSlot: 'lunch' as const, loggedAt: `${D}T05:40:00Z`, foodId, grams: 150, ...extra };
}

beforeAll(async () => {
  sb = await createTestUser(uniqueEmail('entries'));
  nasi = (await createEstimateFood(sb, { name: 'Nasi uji', aliases: [], per100: { kcal: 130, protein_g: 2.7, carb_g: 28, fat_g: 0.3, fiber_g: 0.4 } })).id;
  ayam = (await createEstimateFood(sb, { name: 'Ayam uji', aliases: [], per100: { kcal: 262, protein_g: 26.8, carb_g: 3.2, fat_g: 15 } })).id;
});

describe('logging', () => {
  test('stores a snapshot computed on the server', async () => {
    const r = row(nasi, { date: '2026-11-01' });
    await logFoodEntries(sb, [r]);
    const day = await daySummary(sb, '2026-11-01');
    const e = day.groups.find((g) => g.slot === 'lunch')!.entries[0];
    expect(e.values.kcal).toBeCloseTo(195);
    expect(e.name).toBe('Nasi uji');
  });
  test('resending the same client_id does not duplicate', async () => {
    const r = row(nasi, { date: '2026-11-02' });
    await logFoodEntries(sb, [r]);
    await logFoodEntries(sb, [r]);
    expect((await daySummary(sb, '2026-11-02')).groups.flatMap((g) => g.entries)).toHaveLength(1);
  });
  test('editing grams rescales the snapshot', async () => {
    await logFoodEntries(sb, [row(nasi, { date: '2026-11-03' })]);
    const e = (await daySummary(sb, '2026-11-03')).groups.flatMap((g) => g.entries)[0];
    await updateFoodEntry(sb, e.id, { grams: 75 });
    expect((await daySummary(sb, '2026-11-03')).totals.kcal).toBeCloseTo(97.5);
  });
  test('soft delete and restore', async () => {
    await logFoodEntries(sb, [row(nasi, { date: '2026-11-04' })]);
    const e = (await daySummary(sb, '2026-11-04')).groups.flatMap((g) => g.entries)[0];
    await softDeleteEntry(sb, e.id);
    expect((await daySummary(sb, '2026-11-04')).totals.kcal).toBe(0);
    await restoreEntry(sb, e.id);
    expect((await daySummary(sb, '2026-11-04')).totals.kcal).toBeCloseTo(195);
  });
  test('an entry at 23.30 WIB stays on its local date (Review Focus 1)', async () => {
    await logFoodEntries(sb, [row(nasi, { date: '2026-11-05', loggedAt: '2026-11-05T16:30:00Z', mealSlot: 'dinner' })]);
    expect((await daySummary(sb, '2026-11-05')).totals.kcal).toBeCloseTo(195);
    expect((await daySummary(sb, '2026-11-06')).totals.kcal).toBe(0);
  });
});

describe('groups', () => {
  test('four fixed slots in order, other grouped by label', async () => {
    await logFoodEntries(sb, [
      row(nasi, { date: '2026-11-07', mealSlot: 'other', mealLabel: 'Larut malam' }),
      row(ayam, { date: '2026-11-07', mealSlot: 'other', mealLabel: 'Larut malam' }),
      row(nasi, { date: '2026-11-07', mealSlot: 'other' }),
    ]);
    const g = (await daySummary(sb, '2026-11-07')).groups;
    expect(g.map((x) => [x.slot, x.label])).toEqual([
      ['breakfast', null], ['lunch', null], ['snack', null], ['dinner', null], ['other', 'Larut malam'], ['other', null],
    ]);
    expect((await daySummary(sb, '2026-11-08')).groups).toHaveLength(4);
  });
  test('slotsLogged counts distinct slots', async () => {
    expect((await daySummary(sb, '2026-11-07')).slotsLogged).toBe(1);
  });
});

describe('yesterday card and copies', () => {
  test('slotPreview lists items with totals, null when empty', async () => {
    await logFoodEntries(sb, [row(nasi, { date: '2026-11-09', portionLabel: '1½ centong' }), row(ayam, { date: '2026-11-09', grams: 90 })]);
    const p = (await slotPreview(sb, { date: '2026-11-09', slot: 'lunch' }))!;
    expect(p.items).toEqual([{ name: 'Nasi uji', portion: '1½ centong' }, { name: 'Ayam uji', portion: '90 g' }]);
    expect(p.totals.kcal).toBeCloseTo(195 + 235.8);
    expect(await slotPreview(sb, { date: '2026-11-09', slot: 'dinner' })).toBeNull();
  });
  test('copySlotFromDate copies with new client ids', async () => {
    const n = await copySlotFromDate(sb, { fromDate: '2026-11-09', toDate: '2026-11-10', slot: 'lunch', nowIso: '2026-11-10T05:00:00Z' });
    expect(n).toBe(2);
    expect((await daySummary(sb, '2026-11-10')).totals.kcal).toBeCloseTo(430.8);
  });
  test('expandSavedMeal logs each item', async () => {
    const m = await saveMeal(sb, { name: 'Warteg uji', items: [{ foodId: nasi, grams: 195 }, { foodId: ayam, grams: 90 }] });
    await expandSavedMeal(sb, { mealId: m.id, date: '2026-11-11', slot: 'lunch', nowIso: '2026-11-11T05:00:00Z' });
    expect((await daySummary(sb, '2026-11-11')).groups[1].entries).toHaveLength(2);
  });
});

describe('water and targets', () => {
  test('water adds up and resend is idempotent', async () => {
    const id = randomUUID();
    await addWater(sb, { clientId: id, date: D, loggedAt: `${D}T03:00:00Z`, ml: 250 });
    await addWater(sb, { clientId: id, date: D, loggedAt: `${D}T03:00:00Z`, ml: 250 });
    await addWater(sb, { clientId: randomUUID(), date: D, loggedAt: `${D}T04:00:00Z`, ml: 500 });
    expect((await daySummary(sb, D)).waterMl).toBe(750);
  });
  test('target is the one in effect on that day', async () => {
    const t = { kcal: 2000, protein_g: 100, carb_g: 250, fat_g: 60, fiber_g: 30, water_ml: 2000, added_sugar_max_g: 50, sodium_max_mg: 2000, satfat_max_g: 22 };
    await sb.from('targets').insert([{ ...t, effective_from: '2026-11-01' }, { ...t, kcal: 2540, effective_from: '2026-11-15' }]);
    expect((await daySummary(sb, '2026-11-10')).target!.kcal).toBe(2000);
    expect((await daySummary(sb, '2026-11-20')).target!.kcal).toBe(2540);
  });
});
