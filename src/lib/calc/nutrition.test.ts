import { describe, expect, test } from 'vitest';
import {
  entryNutrients,
  perServingToPer100,
  recipePer100,
  resolveAddedSugarPer100,
  scaleEntry,
  sumDay,
} from './nutrition';
import type { EntryNutrients, FoodNutrition, Nutrients } from './types';
import { NUTRIENTS } from './types';

// Angka di bawah adalah fixture uji, bukan data seed.
function n(v: Partial<Nutrients>): Nutrients {
  const out = {} as Nutrients;
  for (const k of NUTRIENTS) out[k] = v[k] ?? null;
  return out;
}
const rice: FoodNutrition = { per100: n({ kcal: 130, protein_g: 2.7, carb_g: 28, fat_g: 0.3, fiber_g: 0.4 }), partial: [] };

describe('entryNutrients', () => {
  test('scales per-100 g values by grams', () => {
    const e = entryNutrients(rice, 150);
    expect(e.values.kcal).toBeCloseTo(195);
    expect(e.values.protein_g).toBeCloseTo(4.05);
  });
  test('unknown stays unknown', () => {
    expect(entryNutrients(rice, 150).values.sugar_g).toBeNull();
  });
  test('inherits partial flags from the food', () => {
    const f: FoodNutrition = { per100: n({ kcal: 100, sugar_g: 5 }), partial: ['sugar_g'] };
    expect(entryNutrients(f, 50).partial).toEqual(['sugar_g']);
  });
});

describe('scaleEntry', () => {
  test('rescales an existing snapshot', () => {
    expect(scaleEntry(entryNutrients(rice, 150), 150, 75).values.kcal).toBeCloseTo(97.5);
  });
});

describe('recipePer100', () => {
  const A: FoodNutrition = { per100: n({ kcal: 100, protein_g: 10, carb_g: 0, fat_g: 5, sugar_g: 10 }), partial: [] };
  const B: FoodNutrition = { per100: n({ kcal: 200, protein_g: 0, carb_g: 40, fat_g: 0, sugar_g: null }), partial: [] };
  test('weighted average per 100 g of the whole dish', () => {
    const r = recipePer100([{ food: A, grams: 100 }, { food: B, grams: 50 }]);
    expect(r.per100.kcal).toBeCloseTo(((100 + 100) / 150) * 100);
  });
  test('a nutrient missing in some ingredients is a partial value', () => {
    const r = recipePer100([{ food: A, grams: 100 }, { food: B, grams: 50 }]);
    expect(r.per100.sugar_g).toBeCloseTo(6.667, 2);
    expect(r.partial).toContain('sugar_g');
    expect(r.partial).not.toContain('kcal');
  });
  test('a nutrient missing in every ingredient is null, not partial', () => {
    const r = recipePer100([{ food: A, grams: 100 }, { food: B, grams: 50 }]);
    expect(r.per100.sodium_mg).toBeNull();
    expect(r.partial).not.toContain('sodium_mg');
  });
  test('partial ingredient makes the recipe partial for that nutrient', () => {
    const C: FoodNutrition = { per100: n({ kcal: 50, sugar_g: 2 }), partial: ['sugar_g'] };
    expect(recipePer100([{ food: A, grams: 100 }, { food: C, grams: 100 }]).partial).toContain('sugar_g');
  });
});

describe('sumDay', () => {
  const e400: EntryNutrients = { values: n({ kcal: 400, sodium_mg: 300 }), partial: [] };
  const e600: EntryNutrients = { values: n({ kcal: 600, sodium_mg: null }), partial: [] };
  test('coverage is kcal-weighted', () => {
    expect(sumDay([e400, e600]).coverage.sodium_mg).toBe(40);
    expect(sumDay([e400, e600]).coverage.kcal).toBe(100);
  });
  test('totals ignore unknown values', () => {
    const d = sumDay([e400, e600]);
    expect(d.totals.kcal).toBe(1000);
    expect(d.totals.sodium_mg).toBe(300);
  });
  test('an empty day totals zero with full coverage', () => {
    expect(sumDay([]).totals.kcal).toBe(0);
    expect(sumDay([]).coverage.sodium_mg).toBe(100);
  });
  test('a nutrient unknown in every entry totals null', () => {
    expect(sumDay([e600]).totals.sodium_mg).toBeNull();
  });
});

describe('resolveAddedSugarPer100', () => {
  test('sweetener: all sugar is added sugar', () => {
    expect(resolveAddedSugarPer100({ source: 'usda', isSweetener: true, sugarPer100: 98 })).toBe(98);
  });
  test('single ingredient from a database: zero', () => {
    expect(resolveAddedSugarPer100({ source: 'usda', isSweetener: false, sugarPer100: 12 })).toBe(0);
    expect(resolveAddedSugarPer100({ source: 'tkpi', isSweetener: false, sugarPer100: null })).toBe(0);
  });
  test('label: uses the label value, else unknown', () => {
    expect(resolveAddedSugarPer100({ source: 'label', isSweetener: false, sugarPer100: 5, labelAddedSugarPer100: 3 })).toBe(3);
    expect(resolveAddedSugarPer100({ source: 'label', isSweetener: false, sugarPer100: 5 })).toBeNull();
  });
  test('estimate and custom: unknown', () => {
    expect(resolveAddedSugarPer100({ source: 'estimate', isSweetener: false, sugarPer100: null })).toBeNull();
    expect(resolveAddedSugarPer100({ source: 'custom', isSweetener: false, sugarPer100: 4 })).toBeNull();
  });
});

describe('perServingToPer100', () => {
  test('30 g serving with 24 g protein is 80 g per 100 g', () => {
    const p = perServingToPer100({ kcal: 120, protein_g: 24 }, 30);
    expect(p.protein_g).toBeCloseTo(80);
    expect(p.kcal).toBeCloseTo(400);
    expect(p.sugar_g).toBeNull();
  });
});
