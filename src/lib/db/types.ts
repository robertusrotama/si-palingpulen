import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

export type DB = SupabaseClient<Database>;
export type Tables = Database['public']['Tables'];
export type FoodRow = Tables['foods']['Row'];
export type PortionRow = Tables['food_portions']['Row'];
export type SavedMealRow = Tables['saved_meals']['Row'];
export type SavedMealItemRow = Tables['saved_meal_items']['Row'];

/** Melempar error Supabase sebagai Error biasa dan mengembalikan data non-null. */
export function must<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}
