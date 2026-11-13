import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url?.includes('127.0.0.1') && !url?.includes('localhost') && process.env.ALLOW_REMOTE_TEST_DB !== '1') {
  throw new Error('Tes integrasi hanya boleh memakai Supabase lokal atau project tes terpisah (set ALLOW_REMOTE_TEST_DB=1).');
}

export function adminClient(): SupabaseClient {
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

let counter = 0;
export function uniqueEmail(tag: string): string {
  counter++;
  return `${tag}-${Date.now()}-${counter}@test.local`;
}

/** Membuat user tes lalu mengembalikan client yang sudah login sebagai user itu. */
export async function createTestUser(email: string): Promise<SupabaseClient<Database>> {
  const password = 'test-password-123';
  const { error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return client;
}

export async function userId(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getUser();
  return data.user!.id;
}
