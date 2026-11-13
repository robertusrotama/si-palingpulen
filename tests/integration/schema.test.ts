import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, test } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestUser, uniqueEmail, userId } from './helpers';

let A: SupabaseClient;
let B: SupabaseClient;
let foodId: string;

async function addFood(c: SupabaseClient, name: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await c
    .from('foods')
    .insert({ name, source: 'custom', kcal: 100, protein_g: 1, carb_g: 1, fat_g: 1, ...extra })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

function entry(food: string, extra: Record<string, unknown> = {}) {
  return {
    client_id: randomUUID(), date: '2026-11-12', meal_slot: 'lunch', logged_at: '2026-11-12T05:40:00Z',
    food_id: food, grams: 100, kcal: 100, protein_g: 1, carb_g: 1, fat_g: 1, ...extra,
  };
}

beforeAll(async () => {
  A = await createTestUser(uniqueEmail('a'));
  B = await createTestUser(uniqueEmail('b'));
  foodId = await addFood(A, 'Ayam geprek', { aliases: ['geprek'] });
});

describe('RLS', () => {
  test('user B cannot read or write food_entries of user A', async () => {
    const { error } = await A.from('food_entries').insert(entry(foodId));
    expect(error).toBeNull();
    const { data } = await B.from('food_entries').select('id');
    expect(data).toEqual([]);
    const { error: e2 } = await B.from('food_entries').insert({ ...entry(foodId), user_id: await userId(A) });
    expect(e2).not.toBeNull();
  });
});

describe('goals', () => {
  test('a second active goal is rejected', async () => {
    const g = { type: 'bulk', start_date: '2026-11-07', rate_pct_per_week: 0.3 };
    expect((await B.from('goals').insert(g)).error).toBeNull();
    expect((await B.from('goals').insert(g)).error).not.toBeNull();
  });
});

describe('food_entries', () => {
  test('upsert with the same client_id twice keeps one row', async () => {
    const e = entry(foodId);
    for (let i = 0; i < 2; i++) {
      const { error } = await A.from('food_entries').upsert(e, { onConflict: 'user_id,client_id', ignoreDuplicates: true });
      expect(error).toBeNull();
    }
    const { count } = await A.from('food_entries').select('id', { count: 'exact', head: true }).eq('client_id', e.client_id);
    expect(count).toBe(1);
  });
  test("meal_label is only allowed on 'other'", async () => {
    expect((await A.from('food_entries').insert(entry(foodId, { meal_slot: 'lunch', meal_label: 'Larut malam' }))).error).not.toBeNull();
    expect((await A.from('food_entries').insert(entry(foodId, { meal_slot: 'other', meal_label: 'Larut malam' }))).error).toBeNull();
  });
});

describe('search_foods', () => {
  test('tolerates a typo', async () => {
    const { data, error } = await A.rpc('search_foods', { q: 'gepre' });
    expect(error).toBeNull();
    expect((data as { name: string }[]).map((f) => f.name)).toContain('Ayam geprek');
  });
  test('skips archived foods', async () => {
    await addFood(A, 'Ayam geprek lama', { archived_at: new Date().toISOString() });
    const { data } = await A.rpc('search_foods', { q: 'geprek' });
    expect((data as { name: string }[]).map((f) => f.name)).not.toContain('Ayam geprek lama');
  });
});

describe('daily_totals', () => {
  test("only the caller's rows, ignoring deleted entries", async () => {
    const bFood = await addFood(B, 'Pepaya');
    await B.from('food_entries').insert(entry(bFood, { date: '2026-11-20', kcal: 300 }));
    await B.from('food_entries').insert(entry(bFood, { date: '2026-11-20', kcal: 999, deleted_at: new Date().toISOString() }));
    const { data } = await B.from('daily_totals').select('*');
    expect(data).toHaveLength(1);
    expect(Number(data![0].kcal)).toBe(300);
    expect(data![0].slots_logged).toBe(1);
  });
});
