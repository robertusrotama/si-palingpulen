import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

export function createBrowserSupabase(): SupabaseClient<Database> {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
