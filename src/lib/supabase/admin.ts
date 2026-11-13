import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { SUPABASE_URL } from './env';

/** Client service role. Hanya untuk kode server; jangan pernah diimpor dari komponen klien. */
export function createAdminSupabase(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
