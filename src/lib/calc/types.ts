export const NUTRIENTS = [
  'kcal',
  'protein_g',
  'carb_g',
  'fat_g',
  'fiber_g',
  'sugar_g',
  'added_sugar_g',
  'sodium_mg',
  'satfat_g',
] as const;

export type NutrientKey = (typeof NUTRIENTS)[number];

/** null = tidak diketahui, tidak pernah 0. kcal/protein/carb/fat divalidasi non-null saat disimpan. */
export type Nutrients = Record<NutrientKey, number | null>;

export type FoodSource = 'usda' | 'tkpi' | 'label' | 'custom' | 'recipe' | 'estimate';

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'other';

export const MEAL_SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner', 'other'];

export interface FoodNutrition {
  per100: Nutrients;
  partial: NutrientKey[];
}

export interface EntryNutrients {
  values: Nutrients;
  partial: NutrientKey[];
}
