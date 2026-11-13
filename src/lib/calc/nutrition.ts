import { NUTRIENTS } from './types';
import type { EntryNutrients, FoodNutrition, FoodSource, NutrientKey, Nutrients } from './types';

function emptyNutrients(fill: number | null): Nutrients {
  const out = {} as Nutrients;
  for (const k of NUTRIENTS) out[k] = fill;
  return out;
}

/** Nutrisi untuk `grams` gram makanan. Null tetap null. */
export function entryNutrients(food: FoodNutrition, grams: number): EntryNutrients {
  const values = emptyNutrients(null);
  for (const k of NUTRIENTS) {
    const v = food.per100[k];
    values[k] = v == null ? null : (v * grams) / 100;
  }
  return { values, partial: [...food.partial] };
}

/** Skala ulang snapshot entri dari `fromGrams` ke `toGrams`. */
export function scaleEntry(e: EntryNutrients, fromGrams: number, toGrams: number): EntryNutrients {
  const values = emptyNutrients(null);
  for (const k of NUTRIENTS) {
    const v = e.values[k];
    values[k] = v == null ? null : (v * toGrams) / fromGrams;
  }
  return { values, partial: [...e.partial] };
}

/**
 * Nutrisi per 100 g dari bahan-bahan resep.
 * Nutrien yang tidak diketahui di sebagian bahan menjadi nilai parsial (ditandai),
 * dan yang tidak diketahui di semua bahan menjadi null.
 */
export function recipePer100(items: { food: FoodNutrition; grams: number }[]): FoodNutrition {
  const totalGrams = items.reduce((s, i) => s + i.grams, 0);
  const per100 = emptyNutrients(null);
  const partial: NutrientKey[] = [];
  if (totalGrams <= 0) return { per100, partial };
  for (const k of NUTRIENTS) {
    let sum = 0;
    let known = 0;
    let inheritedPartial = false;
    for (const { food, grams } of items) {
      const v = food.per100[k];
      if (food.partial.includes(k)) inheritedPartial = true;
      if (v == null) continue;
      known++;
      sum += (v * grams) / 100;
    }
    if (known === 0) continue;
    per100[k] = (sum / totalGrams) * 100;
    if (known < items.length || inheritedPartial) partial.push(k);
  }
  return { per100, partial };
}

/** Gula tambahan per 100 g untuk makanan non-resep (spec §8.4). Resep dihitung lewat recipePer100. */
export function resolveAddedSugarPer100(i: {
  source: FoodSource;
  isSweetener: boolean;
  sugarPer100: number | null;
  labelAddedSugarPer100?: number | null;
}): number | null {
  if (i.isSweetener) return i.sugarPer100;
  switch (i.source) {
    case 'usda':
    case 'tkpi':
      return 0;
    case 'label':
      return i.labelAddedSugarPer100 ?? null;
    default:
      return null;
  }
}

/** Total harian dan cakupan data (persen kkal dari entri yang nilainya diketahui). */
export function sumDay(entries: EntryNutrients[]): {
  totals: Nutrients;
  coverage: Record<NutrientKey, number>;
} {
  const totals = emptyNutrients(entries.length === 0 ? 0 : null);
  const coverage = {} as Record<NutrientKey, number>;
  const totalKcal = entries.reduce((s, e) => s + (e.values.kcal ?? 0), 0);
  for (const k of NUTRIENTS) {
    let knownKcal = 0;
    for (const e of entries) {
      const v = e.values[k];
      if (v == null) continue;
      totals[k] = (totals[k] ?? 0) + v;
      knownKcal += e.values.kcal ?? 0;
    }
    coverage[k] = totalKcal === 0 ? 100 : Math.round((knownKcal / totalKcal) * 100);
  }
  return { totals, coverage };
}

/** Nilai gizi per sajian (label) ke per 100 g. Kolom yang tidak diisi menjadi null. */
export function perServingToPer100(perServing: Partial<Nutrients>, servingG: number): Nutrients {
  const out = emptyNutrients(null);
  for (const k of NUTRIENTS) {
    const v = perServing[k];
    out[k] = v == null ? null : (v * 100) / servingG;
  }
  return out;
}
