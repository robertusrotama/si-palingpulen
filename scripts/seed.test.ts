import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

type SeedFood = {
  key: string; name: string; aliases: string[]; source: 'usda' | 'tkpi'; source_ref: string; is_sweetener: boolean;
  per100: Record<string, number | null>; portions: { label: string; grams: number }[]; atwater_exempt?: string;
};

const foods: SeedFood[] = JSON.parse(readFileSync('supabase/seed/foods.seed.json', 'utf8'));
const sources: { key: string }[] = JSON.parse(readFileSync('supabase/seed/food-sources.json', 'utf8'));

describe('foods.seed.json', () => {
  test('every source key is present', () => {
    expect(foods.map((f) => f.key).sort()).toEqual(sources.map((s) => s.key).sort());
  });
  test.each(foods.map((f) => [f.key, f] as const))('%s has a source reference', (_k, f) => {
    expect(f.source_ref).toMatch(/\S/);
    expect(['usda', 'tkpi']).toContain(f.source);
  });
  test.each(foods.map((f) => [f.key, f] as const))('%s has non-negative core macros', (_k, f) => {
    for (const k of ['kcal', 'protein_g', 'carb_g', 'fat_g']) {
      expect(f.per100[k]).not.toBeNull();
      expect(f.per100[k]!).toBeGreaterThanOrEqual(0);
    }
  });
  // Penjaga salah ketik/salah kolom, bukan rumus energi resmi: serat dihitung 2 kkal/g,
  // dan pangan rendah energi boleh meleset sampai 15 kkal.
  test.each(foods.map((f) => [f.key, f] as const))('%s energy agrees with Atwater (15%% or 15 kcal)', (_k, f) => {
    if (f.atwater_exempt) return;
    const p = f.per100;
    const fiber = p.fiber_g ?? 0;
    // Sumber berbeda: USDA memisahkan serat (≈2 kkal/g), TKPI kadang tidak. Cukup salah satu cocok.
    const withFiberAsCarb = 4 * p.protein_g! + 4 * p.carb_g! + 9 * p.fat_g!;
    const withFiberApart = 4 * p.protein_g! + 4 * Math.max(0, p.carb_g! - fiber) + 2 * fiber + 9 * p.fat_g!;
    const ok = [withFiberAsCarb, withFiberApart].some((a) => {
      const diff = Math.abs(p.kcal! - a);
      return diff <= 15 || diff / p.kcal! <= 0.15;
    });
    expect(ok).toBe(true);
  });
});
